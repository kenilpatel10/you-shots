/**
 * Provider chain: Gemini (primary) → Groq (fallback). Each call is retried with backoff on
 * 429/5xx/network errors; invalid JSON gets one repair retry per provider before moving on.
 */
import type { ZodType } from "zod";
import { env } from "../lib/env";
import { createLogger } from "../lib/logger";
import { isRetryable, retry } from "../lib/retry";
import { createGemini } from "./gemini";
import { createGroq } from "./groq";
import { JsonParseError, parseWith } from "./json";
import { LlmUnavailableError, type LlmProvider, type LlmRequest } from "./types";

const log = createLogger("llm");

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"; // gemini-2.5-flash is closed to new API keys (verified 2026-09-17)
/**
 * The free tier caps each Gemini model at a small number of requests per day (20 for
 * gemini-3.6-flash, verified 2026-09-17). Every model has its own bucket, so a chain of models
 * multiplies the daily budget at no cost. Override with GEMINI_FALLBACK_MODELS (comma list).
 */
export const DEFAULT_GEMINI_FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

/** A daily quota is not going to clear during a backoff; move to the next model at once. */
function worthRetrying(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err);
  if (/PerDay|per day|daily/i.test(msg) && /429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return false;
  return isRetryable(err);
}

let providers: LlmProvider[] | null = null;

export function getProviders(): LlmProvider[] {
  if (providers) return providers;
  const list: LlmProvider[] = [];
  const gemini = env("GEMINI_API_KEY");
  const groq = env("GROQ_API_KEY");
  if (gemini) {
    const primary = env("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL;
    const fallbacks = (
      env("GEMINI_FALLBACK_MODELS")
        ?.split(",")
        .map((m) => m.trim())
        .filter(Boolean) ?? DEFAULT_GEMINI_FALLBACK_MODELS
    ).filter((m) => m !== primary);
    for (const model of [primary, ...fallbacks]) list.push(createGemini(gemini, model));
  }
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

/** First line of an API error, without the multi-kilobyte quota JSON Google appends. */
function shortError(err: unknown): string {
  const msg = String((err as Error)?.message ?? err);
  const m = /"message":"([^"]{0,200})/.exec(msg);
  return (m ? `${msg.slice(0, 40)}… ${m[1]}` : msg).split("\n")[0]!.slice(0, 260);
}

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
          shouldRetry: worthRetrying,
          onRetry: (err, n, delay) => log.warn(`${p.name}/${p.model} ${label} retry ${n} in ${Math.round(delay)}ms: ${shortError(err)}`),
        });
        const data = parseWith(schema, res.text);
        return { data, provider: res.provider, model: res.model };
      } catch (err) {
        const msg = (err as Error).message;
        if (err instanceof JsonParseError && attempt === 0) {
          log.warn(`${p.name} ${label} returned invalid JSON (${msg}); asking it to fix`);
          request = {
            ...req,
            user: `${req.user}\n\nYour previous answer was not valid JSON matching the schema (${msg}). Reply with ONLY the corrected JSON object.`,
          };
          continue;
        }
        log.warn(`${p.name}/${p.model} ${label} failed: ${shortError(err)}`);
        causes.push({
          provider: `${p.name}/${p.model}`,
          error: msg.slice(0, 300),
        });
        break;
      }
    }
  }
  throw new LlmUnavailableError(`All LLM providers failed for ${label}`, causes);
}
