/**
 * Word-level timestamps with whisper.cpp through Remotion's official tooling
 * (@remotion/install-whisper-cpp). Falls back to proportional estimates when whisper cannot be
 * installed (no network, unsupported platform) so the pipeline never blocks on captions.
 */
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe, type WhisperModel } from "@remotion/install-whisper-cpp";
import type { WordTiming } from "../../remotion/schema";
import { CACHE_DIR } from "../lib/paths";
import { env } from "../lib/env";
import { createLogger } from "../lib/logger";
import { ensureDir } from "../lib/fs";
import { alignWords, segmentWords, tokensLookGarbled } from "./align";
import { estimateWordTimings } from "./estimateTimings";
import { encodeWav, resample, type PcmAudio } from "./wav";

const log = createLogger("timings");

/** whisper.cpp release built from source on Linux/macOS (needs cmake+git), prebuilt on Windows. */
export const WHISPER_CPP_VERSION = env("WHISPER_CPP_VERSION") ?? "1.7.5";
const WHISPER_REPO = "https://github.com/ggerganov/whisper.cpp.git";
const execFileAsync = promisify(execFile);

export function whisperDir(): string {
  return env("WHISPER_DIR") ?? path.join(CACHE_DIR, "whisper");
}

/** `build/bin/whisper-cli` for whisper.cpp >= 1.7.4 (what @remotion/install-whisper-cpp expects). */
export function whisperBinary(to: string): string {
  return path.join(to, "build", "bin", process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli");
}

async function run(bin: string, args: string[], cwd?: string): Promise<void> {
  await execFileAsync(bin, args, { cwd, maxBuffer: 64 * 1024 * 1024 });
}

/**
 * True when the binary starts at all. A whisper-cli compiled with -march=native on one machine and
 * restored from cache on another dies with SIGILL before printing anything; a normal exit (any code)
 * means the instructions are supported.
 */
export async function binaryRuns(bin: string): Promise<boolean> {
  try {
    await execFileAsync(bin, ["--help"]);
    return true;
  } catch (err) {
    const e = err as { code?: unknown; signal?: string | null };
    return typeof e.code === "number" && !e.signal;
  }
}

/**
 * Clone + cmake whisper.cpp without -march=native so the binary can be cached and reused on any
 * x86-64/arm64 runner (AVX2/FMA stay on, AVX-512 off). Remotion's installer runs plain `make`,
 * which tunes for the build host and crashes elsewhere.
 */
async function buildPortableWhisper(to: string): Promise<void> {
  await fs.rm(to, { recursive: true, force: true });
  await run("git", ["clone", "--depth", "1", "--branch", `v${WHISPER_CPP_VERSION}`, WHISPER_REPO, to]);
  await run("cmake", ["-B", "build", "-DCMAKE_BUILD_TYPE=Release", "-DGGML_NATIVE=OFF", "-DGGML_AVX512=OFF", "-DWHISPER_BUILD_TESTS=OFF"], to);
  await run("cmake", ["--build", "build", "--config", "Release", "--target", "whisper-cli", "-j", String(Math.max(1, os.availableParallelism()))], to);
}

async function ensureWhisperCpp(to: string): Promise<void> {
  if (process.platform === "win32") {
    await installWhisperCpp({ version: WHISPER_CPP_VERSION, to, printOutput: false });
    return;
  }
  const bin = whisperBinary(to);
  if (await binaryRuns(bin)) return;
  const existed = await fs.stat(bin).then(() => true, () => false);
  if (existed) log.warn("cached whisper-cli does not run on this CPU; rebuilding a portable binary");
  else log.info("Building whisper.cpp (portable, no -march=native) …");
  await buildPortableWhisper(to);
  if (!(await binaryRuns(bin))) throw new Error("freshly built whisper-cli does not start");
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
    await ensureWhisperCpp(to);
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
    let tokens = captions.map((c) => ({ text: c.text, startMs: c.startMs, endMs: c.endMs }));
    let result = alignWords(opts.text, tokens, 0, durationMs);
    if (result.matched < total * 0.5 || tokensLookGarbled(tokens)) {
      // Non-Latin scripts: token pieces are bytes; fall back to segment text spread over the segment.
      const bySegment = segmentWords(json.transcription.map((t) => ({ text: t.text, offsets: t.offsets })));
      const alt = alignWords(opts.text, bySegment, 0, durationMs);
      if (alt.matched > result.matched) {
        tokens = bySegment;
        result = alt;
      }
    }
    const { words, matched } = result;
    if (matched === 0) {
      const heard = json.transcription
        .map((t) => t.text.trim())
        .join(" ")
        .slice(0, 120);
      log.warn(`whisper matched no words for ${opts.key}; using estimated timings (heard: "${heard}")`);
      return { words: estimateWordTimings(opts.text, 0, durationMs), source: "estimated", total };
    }
    if (matched < total * 0.5) log.warn(`Only ${matched}/${total} words matched for ${opts.key}; interpolating the rest`);
    return { words, source: "whisper", matched, total };
  } catch (err) {
    log.warn(`whisper failed on ${opts.key} (${(err as Error).message.split("\n")[0]}); estimating`);
    return { words: estimateWordTimings(opts.text, 0, durationMs), source: "estimated", total };
  }
}
