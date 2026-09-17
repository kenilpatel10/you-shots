/**
 * Provider chain: Gemini (primary) → Groq (fallback). Each call is retried with backoff on
 * 429/5xx/network errors; invalid JSON gets one repair retry per provider before moving on.
 */
import type { ZodType } from "zod";
import { env } from "../lib/env";
import { createLogger } from "../lib/logger";
import { retry } from "../lib/retry";
import { createGemini } from "./gemini";
import { createGroq } from "./groq";
import { JsonParseError, parseWith } from "./json";
import { LlmUnavailableError, type LlmProvider, type LlmRequest } from "./types";

const log = createLogger("llm");

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"; // gemini-2.5-flash is closed to new API keys (verified 2026-09-17)
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

let providers: LlmProvider[] | null = null;

export function getProviders(): LlmProvider[] {
  if (providers) return providers;
  const list: LlmProvider[] = [];
  const gemini = env("GEMINI_API_KEY");
  const groq = env("GROQ_API_KEY");
  if (gemini) list.push(createGemini(gemini, env("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL));
  if (groq) list.push(createGroq(groq, env("GROQ_MODEL") ?? DEFAULT_GROQ_MODEL));
  providers = list;
  return list;
}

/** For tests. */
export function setProviders(list: LlmProvider[] | null): void {
  providers = list;
}

export function hasLlm(): boolean {
  return getProviders().length > 0;
}

export type JsonResult<T> = { data: T; provider: string; model: string };

export type CompleteOptions = {
  /** Try every other provider before this one (independent second opinion). */
  avoidProvider?: string;
};

export async function completeJson<T>(req: LlmRequest, schema: ZodType<T, unknown>, label = "request", options: CompleteOptions = {}): Promise<JsonResult<T>> {
  const all = getProviders();
  const list = options.avoidProvider ? [...all.filter((p) => p.name !== options.avoidProvider), ...all.filter((p) => p.name === options.avoidProvider)] : all;
  if (!list.length) throw new LlmUnavailableError("No LLM API keys configured (GEMINI_API_KEY / GROQ_API_KEY)");
  const causes: { provider: string; error: string }[] = [];
  for (const p of list) {
    let request = req;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await retry(() => p.complete(request), {
          retries: 3,
          baseDelayMs: 2000,
          onRetry: (err, n, delay) => log.warn(`${p.name} ${label} retry ${n} in ${Math.round(delay)}ms: ${(err as Error).message}`),
        });
        const data = parseWith(schema, res.text);
        return { data, provider: res.provider, model: res.model };
      } catch (err) {
        const msg = (err as Error).message;
        if (err instanceof JsonParseError && attempt === 0) {
          log.warn(`${p.name} ${label} returned invalid JSON (${msg}); asking it to fix`);
          request = { ...req, user: `${req.user}\n\nYour previous answer was not valid JSON matching the schema (${msg}). Reply with ONLY the corrected JSON object.` };
          continue;
        }
        log.warn(`${p.name} ${label} failed: ${msg}`);
        causes.push({ provider: p.name, error: msg });
        break;
      }
    }
  }
  throw new LlmUnavailableError(`All LLM providers failed for ${label}`, causes);
}
