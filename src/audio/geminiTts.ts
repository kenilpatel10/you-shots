/**
 * Gemini text-to-speech (free tier of the Gemini API). Used for languages kokoro-js cannot speak
 * (Hindi). Returns 24 kHz mono PCM like the other engines. One request per script section, so a
 * Short costs five requests a day — far inside the free quota.
 */
import { env } from "../lib/env";
import { createLogger } from "../lib/logger";
import { HttpError } from "../lib/retry";
import { fadeEdges, trimSilence, type PcmAudio } from "./wav";

const log = createLogger("gemini-tts");

/**
 * TTS models tried in order. The free tier caps each one separately (about 10 requests per day
 * per model, verified 2026-09-17), so a chain of three covers a daily Short (5 requests) with
 * room for retries. Override with GEMINI_TTS_MODEL (first) / GEMINI_TTS_MODELS (full list).
 */
export const DEFAULT_GEMINI_TTS_MODELS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"];
export const DEFAULT_GEMINI_TTS_MODEL = DEFAULT_GEMINI_TTS_MODELS[0]!;

export type GeminiTtsOptions = {
  /** Prebuilt voice name, e.g. "Leda", "Kore", "Aoede". */
  voice: string;
  /** Free-text delivery instructions prepended to the text ("warm and cheerful, for young children"). */
  style?: string;
  /** Language name for the instruction, e.g. "Hindi". */
  languageName?: string;
};

export function geminiTtsModels(): string[] {
  const list =
    env("GEMINI_TTS_MODELS")
      ?.split(",")
      .map((m) => m.trim())
      .filter(Boolean) ?? DEFAULT_GEMINI_TTS_MODELS;
  const first = env("GEMINI_TTS_MODEL");
  return first ? [first, ...list.filter((m) => m !== first)] : list;
}

/** Models whose daily quota is spent in this process: skipped for the rest of the run. */
const exhausted = new Set<string>();

function isDailyQuota(message: string): boolean {
  return /PerDay|per day/i.test(message);
}

/** Parse "audio/L16;codec=pcm;rate=24000" style mime types. */
export function parseL16Rate(mime: string): number {
  const m = /rate=(\d+)/i.exec(mime);
  if (!/audio\/l16/i.test(mime)) throw new Error(`Unexpected Gemini audio mime type ${mime}`);
  return m ? Number(m[1]) : 24000;
}

/** Signed 16-bit little-endian PCM → float samples. */
export function decodeL16(buf: Buffer): Float32Array {
  const n = Math.floor(buf.length / 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(i * 2) / 32768;
  return out;
}

type GenerateResponse = {
  candidates?: {
    content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] };
  }[];
  error?: { message?: string };
};

/** The free tier allows ~10 TTS requests per minute; Google says how long to wait. */
function retryAfterMs(message: string): number | undefined {
  const m = /retry in ([\d.]+)s/i.exec(message);
  return m ? Math.ceil(Number(m[1]) * 1000) + 1000 : undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request(model: string, prompt: string, voice: string): Promise<{ mime: string; data: Buffer }> {
  const key = env("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not set: the gemini voice engine needs it (docs/SETUP_AI_KEYS.md)");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const attempt = async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as GenerateResponse;
    if (!res.ok) {
      // Keep the quota ids (…PerDay… / …PerMinute…) so the caller can tell a spent day from a busy minute.
      const ids = (JSON.stringify(json.error ?? {}).match(/"quotaId":"([^"]+)"/g) ?? []).map((m) => m.slice(11, -1)).join(",");
      throw new HttpError(res.status, `Gemini TTS ${model}: ${res.status} ${json.error?.message ?? ""}${ids ? ` [${ids}]` : ""}`.trim());
    }
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part?.inlineData) throw new Error(`Gemini TTS ${model} returned no audio`);
    return {
      mime: part.inlineData.mimeType,
      data: Buffer.from(part.inlineData.data, "base64"),
    };
  };
  for (let n = 0; ; n++) {
    try {
      return await attempt();
    } catch (err) {
      if (!(err instanceof HttpError) || (err.status !== 429 && err.status < 500)) throw err;
      if (err.status === 429 && isDailyQuota(err.message)) throw err; // no point waiting: the caller moves to the next model
      if (n >= 3) throw err;
      const wait = err.status === 429 ? (retryAfterMs(err.message) ?? 15_000) : 3000 * 2 ** n;
      log.warn(`${model} ${err.status}; retry ${n + 1} in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    }
  }
}

export async function synthesizeGemini(text: string, opts: GeminiTtsOptions): Promise<PcmAudio> {
  const style = opts.style ?? "warm, cheerful and clear, for young children, at a relaxed pace";
  const prompt = `Read the following ${opts.languageName ? `${opts.languageName} ` : ""}text aloud exactly as written, ${style}. Do not add or skip words.\n\n${text}`;
  const causes: string[] = [];
  for (const model of geminiTtsModels()) {
    if (exhausted.has(model)) continue;
    try {
      const out = await request(model, prompt, opts.voice);
      const sampleRate = parseL16Rate(out.mime);
      const samples = trimSilence(decodeL16(out.data), sampleRate, 0.008, 40);
      return { samples: fadeEdges(samples, sampleRate), sampleRate };
    } catch (err) {
      const msg = (err as Error).message;
      const status = err instanceof HttpError ? err.status : 0;
      if (status === 404 || (status === 429 && isDailyQuota(msg))) {
        exhausted.add(model);
        log.warn(`${model} ${status === 404 ? "not available" : "daily quota spent"}; trying the next TTS model`);
        causes.push(`${model}: ${msg.split("\n")[0]!.slice(0, 160)}`);
        continue;
      }
      if (status === 429) {
        // Per-minute limit still busy after the waits: give the next model a go rather than fail the run.
        causes.push(`${model}: ${msg.split("\n")[0]!.slice(0, 160)}`);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Gemini TTS: every model failed or is out of quota for today. ${causes.join(" | ")}`);
}
