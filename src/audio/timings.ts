/**
 * Word-level timestamps with whisper.cpp through Remotion's official tooling
 * (@remotion/install-whisper-cpp). Falls back to proportional estimates when whisper cannot be
 * installed (no network, unsupported platform) so the pipeline never blocks on captions.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe, type WhisperModel } from "@remotion/install-whisper-cpp";
import type { WordTiming } from "../../remotion/schema";
import { CACHE_DIR } from "../lib/paths";
import { env } from "../lib/env";
import { createLogger } from "../lib/logger";
import { ensureDir } from "../lib/fs";
import { alignWords } from "./align";
import { estimateWordTimings } from "./estimateTimings";
import { encodeWav, resample, type PcmAudio } from "./wav";

const log = createLogger("timings");

/** whisper.cpp release built from source on Linux/macOS (needs cmake+git), prebuilt on Windows. */
export const WHISPER_CPP_VERSION = env("WHISPER_CPP_VERSION") ?? "1.7.5";

export function whisperDir(): string {
  return env("WHISPER_DIR") ?? path.join(CACHE_DIR, "whisper");
}

type Whisper = { whisperPath: string; modelFolder: string; model: WhisperModel };

let whisperPromise: Promise<Whisper | null> | null = null;

async function setupWhisper(model: WhisperModel): Promise<Whisper | null> {
  if (env("WHISPER_DISABLE") === "1") return null;
  const to = path.join(whisperDir(), "whisper.cpp");
  const modelFolder = path.join(whisperDir(), "models");
  try {
    await ensureDir(modelFolder);
    log.info(`Ensuring whisper.cpp ${WHISPER_CPP_VERSION} in ${to} …`);
    await installWhisperCpp({ version: WHISPER_CPP_VERSION, to, printOutput: false });
    await downloadWhisperModel({ model, folder: modelFolder, printOutput: false });
    // A blocked/failed download can leave a tiny error page where the model should be.
    const modelFile = path.join(modelFolder, `ggml-${model}.bin`);
    const size = (await fs.stat(modelFile).catch(() => ({ size: 0 }))).size;
    if (size < 1_000_000) {
      await fs.rm(modelFile, { force: true });
      throw new Error(`whisper model ${model} did not download (got ${size} bytes)`);
    }
    return { whisperPath: to, modelFolder, model };
  } catch (err) {
    log.warn(`whisper.cpp unavailable (${(err as Error).message.split("\n")[0]}); using estimated word timings`);
    return null;
  }
}

export function getWhisper(model: WhisperModel): Promise<Whisper | null> {
  if (!whisperPromise) whisperPromise = setupWhisper(model);
  return whisperPromise;
}

export type SectionTimingResult = { words: WordTiming[]; source: "whisper" | "estimated"; matched?: number; total: number };

/**
 * Word timings (relative to the section start) for one section's audio.
 */
export async function timeSection(opts: { text: string; audio: PcmAudio; model: WhisperModel; language: string; workDir: string; key: string }): Promise<SectionTimingResult> {
  const durationMs = Math.round((opts.audio.samples.length / opts.audio.sampleRate) * 1000);
  const total = opts.text.trim().split(/\s+/).length;
  const whisper = await getWhisper(opts.model);
  if (!whisper) return { words: estimateWordTimings(opts.text, 0, durationMs), source: "estimated", total };
  try {
    await ensureDir(opts.workDir);
    const wav16 = path.join(opts.workDir, `${opts.key}.16k.wav`);
    await fs.writeFile(wav16, encodeWav(resample(opts.audio, 16000)));
    const json = await transcribe({
      inputPath: wav16,
      whisperPath: whisper.whisperPath,
      whisperCppVersion: WHISPER_CPP_VERSION,
      model: whisper.model,
      modelFolder: whisper.modelFolder,
      tokenLevelTimestamps: true,
      language: opts.language as "en",
      printOutput: false,
    });
    const { captions } = toCaptions({ whisperCppOutput: json });
    const tokens = captions.map((c) => ({ text: c.text, startMs: c.startMs, endMs: c.endMs }));
    const { words, matched } = alignWords(opts.text, tokens, 0, durationMs);
    if (matched < total * 0.5) log.warn(`Only ${matched}/${total} words matched for ${opts.key}; interpolating the rest`);
    return { words, source: "whisper", matched, total };
  } catch (err) {
    log.warn(`whisper failed on ${opts.key} (${(err as Error).message.split("\n")[0]}); estimating`);
    return { words: estimateWordTimings(opts.text, 0, durationMs), source: "estimated", total };
  }
}
