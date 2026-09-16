/**
 * Hourly publish job: read Telegram replies, apply approvals/rejections, upload approved drafts to
 * YouTube as private + scheduled, remind about stale drafts. Never auto-publishes.
 *
 *   npm run publish              # real run
 *   npm run publish -- --dry-run # process nothing for real: prints what would happen
 */
import path from "node:path";
import { Command } from "commander";
import { loadChannelConfig } from "../config";
import { env, envBool } from "../lib/env";
import { exists, readJson } from "../lib/fs";
import { createLogger } from "../lib/logger";
import { draftDir } from "../lib/paths";
import { formatInZone } from "../lib/time";
import { downloadAsset, releasesConfigured } from "../publish/releases";
import { nextFreeSlot } from "../publish/schedule";
import { chatId, escapeHtml, getUpdates, HELP_TEXT, isAuthorized, notifyFailure, parseCommand, sendMessage, telegramConfigured } from "../publish/telegram";
import { classifyYoutubeError, setThumbnail, uploadVideo, youtubeConfigured } from "../publish/youtube";
import { draftsByStatus, findDraft, loadState, saveState, transition, TransitionError, type Draft, type State } from "../state/state";

const log = createLogger("publish");
const opts = new Command().option("--dry-run", "no side effects", false).parse(process.argv).opts<{ dryRun: boolean }>();

const say = async (text: string) => {
  if (opts.dryRun) log.info(`[dry-run] would send: ${text.replace(/\n/g, " | ").slice(0, 200)}`);
  else await sendMessage(text, { html: true });
};

function statusText(state: State, timezone: string): string {
  const pending = draftsByStatus(state, "drafted");
  const approved = draftsByStatus(state, "approved");
  const failed = draftsByStatus(state, "failed");
  const scheduled = state.drafts.filter((d) => d.status === "uploaded" && d.scheduledFor && new Date(d.scheduledFor) > new Date());
  const line = (d: Draft) => `• <code>${escapeHtml(d.id)}</code> — ${escapeHtml(d.title)}`;
  return [
    `<b>Waiting for your review (${pending.length})</b>`,
    ...(pending.length ? pending.map(line) : ["• none"]),
    `\n<b>Approved, uploading next run (${approved.length})</b>`,
    ...(approved.length ? approved.map(line) : ["• none"]),
    ...(failed.length ? [`\n<b>Upload failed, will retry (${failed.length})</b>`, ...failed.map((d) => `${line(d)} — ${escapeHtml(d.failureReason ?? "")}`)] : []),
    `\n<b>Scheduled on YouTube (${scheduled.length})</b>`,
    ...(scheduled.length ? scheduled.map((d) => `${line(d)} → ${escapeHtml(formatInZone(new Date(d.scheduledFor!), timezone))} https://youtu.be/${d.youtubeVideoId}`) : ["• none"]),
  ].join("\n");
}

/** Apply Telegram commands. Returns the new state and the highest update id seen. */
export async function processUpdates(state: State, timezone: string): Promise<State> {
  const offset = state.lastTelegramUpdateId === null ? null : state.lastTelegramUpdateId + 1;
  const updates = await getUpdates(offset);
  if (!updates.length) return state;
  let next = state;
  const allowed = chatId();
  for (const u of updates) {
    next = { ...next, lastTelegramUpdateId: Math.max(next.lastTelegramUpdateId ?? 0, u.update_id) };
    if (!isAuthorized(u, allowed)) {
      log.warn(`Ignoring message from unauthorised chat ${u.message?.chat.id}`);
      continue;
    }
    const cmd = parseCommand(u.message?.text);
    if (!cmd) {
      if (u.message?.text?.startsWith("/")) await say(`Unknown command.\n${escapeHtml(HELP_TEXT)}`);
      continue;
    }
    if (cmd.kind === "status") {
      await say(statusText(next, timezone));
      continue;
    }
    if (cmd.kind === "help") {
      await say(escapeHtml(HELP_TEXT));
      continue;
    }
    const draft = findDraft(next, cmd.draftId);
    if (!draft) {
      await say(`No draft with id <code>${escapeHtml(cmd.draftId)}</code>. Use /status to list drafts.`);
      continue;
    }
    try {
      if (cmd.kind === "approve") {
        next = transition(next, draft.id, "approved");
        await say(`✅ Approved <code>${escapeHtml(draft.id)}</code>. It will be uploaded (private, scheduled) on the next publish run.`);
      } else if (cmd.kind === "reject") {
        next = transition(next, draft.id, "rejected", { rejectReason: cmd.reason });
        await say(`🗑 Rejected <code>${escapeHtml(draft.id)}</code>: ${escapeHtml(cmd.reason)}`);
      } else if (cmd.kind === "redo") {
        next = transition(next, draft.id, "rejected", { rejectReason: "redo requested" });
        next = { ...next, redoTopicIds: next.redoTopicIds.includes(draft.topicId) ? next.redoTopicIds : [...next.redoTopicIds, draft.topicId] };
        await say(`🔁 Will regenerate topic <code>${escapeHtml(draft.topicId)}</code> on the next generate run.`);
      }
    } catch (err) {
      if (err instanceof TransitionError) await say(`⚠️ ${escapeHtml(err.message)} (current status: ${draft.status})`);
      else throw err;
    }
  }
  return next;
}

async function sendReminders(state: State, hours: number): Promise<State> {
  let next = state;
  const cutoff = Date.now() - hours * 3_600_000;
  for (const d of draftsByStatus(state, "drafted")) {
    if (new Date(d.createdAt).getTime() < cutoff && !d.reminderSentAt) {
      await say(`⏰ Reminder: draft <code>${escapeHtml(d.id)}</code> (“${escapeHtml(d.title)}”) has been waiting ${hours}h. Reply /approve, /reject or /redo. It will never publish on its own.`);
      next = { ...next, drafts: next.drafts.map((x) => (x.id === d.id ? { ...x, reminderSentAt: new Date().toISOString() } : x)) };
    }
  }
  return next;
}

async function localVideo(d: Draft): Promise<string> {
  const local = path.join(draftDir(d.id), d.kind === "weekly" ? "long.mp4" : "short.mp4");
  if (await exists(local)) return local;
  if (!d.assets.video) throw new Error(`Draft ${d.id} has no stored video (no release asset and no local file)`);
  if (!releasesConfigured()) throw new Error("GITHUB_TOKEN/GITHUB_REPOSITORY needed to download the draft video");
  log.info(`Downloading ${d.id} from its release asset`);
  return downloadAsset(d.assets.video, local);
}

async function uploadApproved(state: State): Promise<State> {
  const cfg = loadChannelConfig();
  let next = state;
  const queue = [...draftsByStatus(next, "approved")].sort((a, b) => a.date.localeCompare(b.date));
  if (!queue.length) return next;
  if (!youtubeConfigured()) {
    await say(`⚠️ ${queue.length} approved draft(s) are waiting but YouTube is not configured. See docs/SETUP_YOUTUBE.md and add YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN as secrets.`);
    return next;
  }
  for (const d of queue) {
    const taken = next.drafts.filter((x) => x.scheduledFor && x.status === "uploaded").map((x) => x.scheduledFor!);
    const publishAt = nextFreeSlot({ now: new Date(), timezone: cfg.timezone, uploadTime: cfg.uploadTime, taken });
    if (opts.dryRun) {
      log.info(`[dry-run] would upload ${d.id} scheduled for ${publishAt.toISOString()}`);
      continue;
    }
    try {
      const file = await localVideo(d);
      const props = await readJson<{ description?: string }>(path.join(draftDir(d.id), "meta.json")).catch((): { description?: string } => ({}));
      const description = d.description ?? props.description ?? "";
      const { videoId } = await uploadVideo({
        file,
        title: d.title,
        description,
        tags: d.tags.length ? d.tags : d.kind === "weekly" ? cfg.youtube.longTags : cfg.youtube.shortTags,
        publishAt,
        categoryId: cfg.youtube.categoryId,
        language: d.language,
        containsSyntheticMedia: cfg.youtube.containsSyntheticMedia,
        notifySubscribers: cfg.youtube.notifySubscribers,
      });
      if (d.kind === "weekly") {
        const thumb = path.join(draftDir(d.id), "thumbnail.png");
        let thumbFile: string | null = (await exists(thumb)) ? thumb : null;
        if (!thumbFile && d.assets.thumbnail && releasesConfigured()) thumbFile = await downloadAsset(d.assets.thumbnail, thumb);
        if (thumbFile) {
          try {
            await setThumbnail(videoId, thumbFile);
          } catch (err) {
            log.warn(`Thumbnail upload failed (custom thumbnails need a verified account): ${(err as Error).message}`);
          }
        }
      }
      next = transition(next, d.id, "uploaded", { youtubeVideoId: videoId, scheduledFor: publishAt.toISOString(), failureReason: undefined });
      await say(`📤 Uploaded <code>${escapeHtml(d.id)}</code> as private. Goes public ${escapeHtml(formatInZone(publishAt, cfg.timezone))} (${escapeHtml(cfg.timezone)}).\nhttps://youtu.be/${videoId}`);
    } catch (err) {
      const c = classifyYoutubeError(err);
      log.error(`Upload of ${d.id} failed (${c.kind}): ${c.message}`);
      if (c.kind === "quota" || c.kind === "auth") {
        await say(`⛔ Upload stopped (${c.kind}). Draft <code>${escapeHtml(d.id)}</code> stays queued.\n<b>Fix:</b> ${escapeHtml(c.fix)}\n<pre>${escapeHtml(c.message.slice(0, 500))}</pre>`);
        break; // keep the rest queued; nothing else will succeed this run
      }
      next = transition(next, d.id, "failed", { failureReason: c.message.slice(0, 300) });
      await say(`⚠️ Upload of <code>${escapeHtml(d.id)}</code> failed: ${escapeHtml(c.message.slice(0, 300))}. Reply /approve ${escapeHtml(d.id)} to retry.`);
    }
  }
  return next;
}

async function main() {
  const cfg = loadChannelConfig();
  if (!telegramConfigured()) throw new Error("Telegram is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)");
  let state = await loadState();
  state = await processUpdates(state, cfg.timezone);
  state = await sendReminders(state, cfg.reminderAfterHours);
  state = await uploadApproved(state);
  state = { ...state, lastRuns: { ...state.lastRuns, publish: new Date().toISOString() } };
  if (opts.dryRun) {
    log.info("[dry-run] state not saved");
    return;
  }
  await saveState(state);
  log.info("Publish run complete");
}

main().catch(async (err) => {
  log.error(String(err?.stack ?? err));
  if (!opts.dryRun && !envBool("SKIP_FAILURE_ALERT") && env("TELEGRAM_BOT_TOKEN")) await notifyFailure("publish", err);
  process.exit(1);
});
