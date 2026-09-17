/**
 * Text-to-speech with kokoro-js (Kokoro-82M, Apache-2.0, runs locally on CPU — free).
 * One WAV per section so scene timing matches the audio exactly.
 */
import path from "node:path";
import { CACHE_DIR } from "../lib/paths";
import { env } from "../lib/env";
import { createLogger } from "../lib/logger";
import { concat, fadeEdges, silence, trimSilence, type PcmAudio } from "./wav";

const log = createLogger("tts");

export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const KOKORO_SAMPLE_RATE = 24000;

export type TtsOptions = { voiceId: string; speed: number };

type Engine = { synthesize: (text: string, opts: TtsOptions) => Promise<PcmAudio> };

let enginePromise: Promise<Engine> | null = null;

/** Where Hugging Face model files are cached (cached between GitHub Actions runs). */
export function hfCacheDir(): string {
  return env("HF_CACHE_DIR") ?? path.join(CACHE_DIR, "hf");
}

async function loadEngine(): Promise<Engine> {
  const transformers = await import("@huggingface/transformers");
  transformers.env.cacheDir = hfCacheDir();
  transformers.env.allowLocalModels = false;
  const { KokoroTTS, TextSplitterStream } = await import("kokoro-js");
  const dtype = (env("KOKORO_DTYPE") as "fp32" | "q8" | "fp16" | "q4" | "q4f16" | undefined) ?? "q8";
  log.info(`Loading Kokoro (${dtype}) from cache ${hfCacheDir()} …`);
  const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, { dtype, device: "cpu" });
  log.info("Kokoro ready");
  return {
    async synthesize(text, opts) {
      // stream() splits on sentences: generate() would silently truncate long sections at 510 tokens.
      // Drive the splitter ourselves: kokoro-js never closes the one it creates for a plain string,
      // so the iterator waits forever after the last sentence and Node exits 0 with no audio.
      const splitter = new TextSplitterStream();
      splitter.push(text);
      splitter.close();
      const chunks: Float32Array[] = [];
      for await (const { audio } of tts.stream(splitter, { voice: opts.voiceId as "af_heart", speed: opts.speed })) {
        const samples = trimSilence(new Float32Array(audio.audio), audio.sampling_rate, 0.008, 40);
        chunks.push(fadeEdges(samples, audio.sampling_rate), silence(140, audio.sampling_rate));
        if (audio.sampling_rate !== KOKORO_SAMPLE_RATE) throw new Error(`Unexpected Kokoro sample rate ${audio.sampling_rate}`);
      }
      return { samples: concat(chunks), sampleRate: KOKORO_SAMPLE_RATE };
    },
  };
}

export function getTtsEngine(): Promise<Engine> {
  if (!enginePromise) enginePromise = loadEngine();
  return enginePromise;
}

export async function synthesizeSection(text: string, opts: TtsOptions): Promise<PcmAudio> {
  const engine = await getTtsEngine();
  return engine.synthesize(text, opts);
}
