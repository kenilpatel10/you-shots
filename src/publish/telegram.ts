/**
 * Telegram Bot API client (plain fetch, no webhook, no server). The reviewer approves drafts by
 * replying with commands; publish.ts polls getUpdates. Only TELEGRAM_CHAT_ID may issue commands.
 *
 * Verified limits (Bot API): bots can upload files up to 50 MB with sendVideo/sendDocument;
 * message text up to 4096 characters.
 */
import { promises as fs, openAsBlob } from "node:fs";
import path from "node:path";
import { env } from "../lib/env";
import { createLogger } from "../lib/logger";
import { HttpError, retry } from "../lib/retry";
import type { Draft } from "../state/state";

const log = createLogger("telegram");

export const TELEGRAM_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;
export const MESSAGE_LIMIT = 4096;

export function telegramConfigured(): boolean {
  return Boolean(env("TELEGRAM_BOT_TOKEN") && env("TELEGRAM_CHAT_ID"));
}

function token(): string {
  const t = env("TELEGRAM_BOT_TOKEN");
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set (see docs/SETUP_TELEGRAM.md)");
  return t;
}

export function chatId(): string {
  const c = env("TELEGRAM_CHAT_ID");
  if (!c) throw new Error("TELEGRAM_CHAT_ID is not set (see docs/SETUP_TELEGRAM.md)");
  return c;
}

type ApiResult<T> = { ok: true; result: T } | { ok: false; error_code: number; description: string };

async function call<T>(method: string, body: Record<string, unknown> | FormData): Promise<T> {
  const url = `https://api.telegram.org/bot${token()}/${method}`;
  return retry(
    async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: body instanceof FormData ? undefined : { "content-type": "application/json" },
        body: body instanceof FormData ? body : JSON.stringify(body),
      });
      const json = (await res.json()) as ApiResult<T>;
      if (!json.ok) throw new HttpError(json.error_code, `Telegram ${method}: ${json.description}`);
      return json.result;
    },
    { retries: 3, baseDelayMs: 2000 },
  );
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Split long text on line boundaries so every chunk fits Telegram's message limit. */
export function chunkMessage(text: string, limit = MESSAGE_LIMIT): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    if ((cur + "\n" + line).length > limit) {
      if (cur) chunks.push(cur);
      cur = line.length > limit ? line.slice(0, limit) : line;
    } else cur = cur ? cur + "\n" + line : line;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

export async function sendMessage(text: string, opts: { html?: boolean; to?: string } = {}): Promise<number | undefined> {
  let lastId: number | undefined;
  for (const chunk of chunkMessage(text)) {
    const r = await call<{ message_id: number }>("sendMessage", {
      chat_id: opts.to ?? chatId(),
      text: chunk,
      ...(opts.html ? { parse_mode: "HTML" } : {}),
      disable_web_page_preview: true,
    });
    lastId = r.message_id;
  }
  return lastId;
}

export async function sendVideo(file: string, caption: string): Promise<number> {
  const size = (await fs.stat(file)).size;
  if (size > TELEGRAM_UPLOAD_LIMIT_BYTES) throw new Error(`Video is ${(size / 1e6).toFixed(1)} MB, above Telegram's 50 MB bot upload limit`);
  const form = new FormData();
  form.set("chat_id", chatId());
  form.set("caption", caption.slice(0, 1024));
  form.set("supports_streaming", "true");
  form.set("video", await openAsBlob(file), path.basename(file));
  const r = await call<{ message_id: number }>("sendVideo", form);
  return r.message_id;
}

export async function sendPhoto(file: string, caption: string): Promise<number> {
  const form = new FormData();
  form.set("chat_id", chatId());
  form.set("caption", caption.slice(0, 1024));
  form.set("photo", await openAsBlob(file), path.basename(file));
  const r = await call<{ message_id: number }>("sendPhoto", form);
  return r.message_id;
}

export type TelegramUpdate = {
  update_id: number;
  message?: { message_id: number; text?: string; chat: { id: number; type: string }; from?: { id: number; username?: string } };
};

export async function getUpdates(offset: number | null): Promise<TelegramUpdate[]> {
  return call<TelegramUpdate[]>("getUpdates", {
    ...(offset !== null ? { offset } : {}),
    timeout: 0,
    allowed_updates: ["message"],
    limit: 100,
  });
}

/* ---------- commands (pure, unit-tested) ---------- */

export type Command =
  | { kind: "approve"; draftId: string }
  | { kind: "reject"; draftId: string; reason: string }
  | { kind: "redo"; draftId: string }
  | { kind: "status" }
  | { kind: "help" };

export function parseCommand(text: string | undefined): Command | null {
  if (!text) return null;
  const t = text.trim();
  if (!t.startsWith("/")) return null;
  const [rawCmd, ...rest] = t.split(/\s+/);
  const cmd = rawCmd!.toLowerCase().replace(/@[\w_]+$/, ""); // strip @BotName suffix
  switch (cmd) {
    case "/approve":
      return rest[0] ? { kind: "approve", draftId: rest[0] } : null;
    case "/reject":
      return rest[0] ? { kind: "reject", draftId: rest[0], reason: rest.slice(1).join(" ") || "no reason given" } : null;
    case "/redo":
      return rest[0] ? { kind: "redo", draftId: rest[0] } : null;
    case "/status":
      return { kind: "status" };
    case "/help":
    case "/start":
      return { kind: "help" };
    default:
      return null;
  }
}

/** Only the configured chat may issue commands; everyone else is ignored (and logged). */
export function isAuthorized(update: TelegramUpdate, allowedChatId: string): boolean {
  const id = update.message?.chat.id;
  return id !== undefined && String(id) === String(allowedChatId).trim();
}

export const HELP_TEXT = `Commands:
/approve <draftId> — queue for upload (next hourly run)
/reject <draftId> <reason> — never publish this draft
/redo <draftId> — regenerate the same topic tomorrow
/status — pending drafts and scheduled uploads`;

export function formatDraftMessage(draft: Draft, script: { title: string; hook: string; answer: string; wowFact: string; experiment: string; signOff: string; description: string; tags: string[] }, extra: { reviewerNotes: string[]; source: string; model?: string; durationSeconds: number; timingSource: string; assetUrl?: string }): string {
  const notes = extra.reviewerNotes.length ? extra.reviewerNotes.map((n) => `• ${escapeHtml(n)}`).join("\n") : "• none";
  return [
    `🤖 <b>New draft</b> — ${escapeHtml(draft.date)}`,
    `<b>${escapeHtml(script.title)}</b>`,
    `Draft ID: <code>${escapeHtml(draft.id)}</code>`,
    `Length: ${extra.durationSeconds.toFixed(1)}s · source: ${escapeHtml(extra.source)}${extra.model ? ` (${escapeHtml(extra.model)})` : ""} · captions: ${escapeHtml(extra.timingSource)}`,
    "",
    `<b>Hook:</b> ${escapeHtml(script.hook)}`,
    `<b>Answer:</b> ${escapeHtml(script.answer)}`,
    `<b>Wow fact:</b> ${escapeHtml(script.wowFact)}`,
    `<b>Experiment:</b> ${escapeHtml(script.experiment)}`,
    `<b>Sign-off:</b> ${escapeHtml(script.signOff)}`,
    "",
    `<b>Description:</b> ${escapeHtml(script.description)}`,
    `<b>Tags:</b> ${escapeHtml(script.tags.join(", "))}`,
    "",
    `<b>Reviewer notes:</b>\n${notes}`,
    extra.assetUrl ? `\nFull-quality file: ${escapeHtml(extra.assetUrl)}` : "",
    "",
    `Reply:\n<code>/approve ${escapeHtml(draft.id)}</code>\n<code>/reject ${escapeHtml(draft.id)} reason</code>\n<code>/redo ${escapeHtml(draft.id)}</code>`,
  ].join("\n");
}

/** Best-effort failure alert used by every CLI. Never throws. */
export async function notifyFailure(job: string, err: unknown): Promise<void> {
  if (!telegramConfigured()) return;
  const runUrl = env("GITHUB_RUN_ID") ? `${env("GITHUB_SERVER_URL") ?? "https://github.com"}/${env("GITHUB_REPOSITORY")}/actions/runs/${env("GITHUB_RUN_ID")}` : undefined;
  const msg = `⚠️ <b>${escapeHtml(job)} failed</b>\n<pre>${escapeHtml(String((err as Error)?.message ?? err).slice(0, 1500))}</pre>${runUrl ? `\nLogs: ${runUrl}` : ""}`;
  try {
    await sendMessage(msg, { html: true });
  } catch (e) {
    log.error(`Could not send failure alert: ${(e as Error).message}`);
  }
}
