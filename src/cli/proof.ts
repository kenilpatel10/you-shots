/**
 * Generates docs/PROOF.md from the rendered outputs in out/: stream probes, measured loudness in
 * speech vs. gaps, frames at key timestamps and the lip-sync curve, so every claim about the
 * videos can be checked by eye. Re-run after any render: `npm run proof`.
 *
 *   npm run proof -- [--short out/<draft>/short.mp4] [--long out/weekly-dryrun/long.mp4]
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { decodeWav } from "../audio/wav";
import { ensureDir, exists, readJson, writeFileAtomic } from "../lib/fs";
import { ROOT } from "../lib/paths";
import { createLogger } from "../lib/logger";
import type { ShortProps } from "../../remotion/schema";

const log = createLogger("proof");
const run = promisify(execFile);
const require = createRequire(import.meta.url);

function compositorBin(name: "ffmpeg" | "ffprobe"): string {
  const pkg = `@remotion/compositor-${process.platform}-${process.arch}${process.platform === "linux" ? "-gnu" : ""}`;
  const dir = path.dirname(require.resolve(`${pkg}/package.json`));
  return path.join(dir, process.platform === "win32" ? `${name}.exe` : name);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function probe(file: string): Promise<string> {
  const { stdout } = await run(compositorBin("ffprobe"), ["-v", "error", "-show_entries", "stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels", "-show_entries", "format=duration,size", "-of", "default=noprint_wrappers=1", file]);
  return stdout.trim();
}

async function frame(file: string, seconds: number, out: string, scale = "360:-1"): Promise<void> {
  await run(compositorBin("ffmpeg"), ["-v", "error", "-y", "-ss", String(seconds), "-i", file, "-frames:v", "1", "-vf", `scale=${scale}`, out]);
}

async function loudness(file: string, spans: [number, number][]): Promise<string[]> {
  const wav = `${file}.proof.wav`;
  await run(compositorBin("ffmpeg"), ["-v", "error", "-y", "-i", file, "-vn", "-ac", "1", "-ar", "24000", "-f", "wav", wav]);
  const audio = decodeWav(await fs.readFile(wav));
  await fs.unlink(wav);
  return spans.map(([a, b]) => {
    let acc = 0;
    let n = 0;
    for (let i = Math.floor(a * audio.sampleRate); i < Math.min(audio.samples.length, Math.floor(b * audio.sampleRate)); i++) {
      acc += audio.samples[i]! * audio.samples[i]!;
      n++;
    }
    return `${a.toFixed(1)}–${b.toFixed(1)} s: ${(20 * Math.log10(Math.sqrt(acc / Math.max(1, n)) || 1e-9)).toFixed(1)} dBFS`;
  });
}

async function main() {
  const shortFile = arg("--short") ?? (await findLatest(/^dryrun-|^short-/, "short.mp4"));
  const longFile = arg("--long") ?? path.join(ROOT, "out", "weekly-dryrun", "long.mp4");
  const imgDir = path.join(ROOT, "docs", "images", "proof");
  await ensureDir(imgDir);
  const lines: string[] = [
    "# Proof of output",
    "",
    `Generated ${new Date().toISOString()} by \`npm run proof\` from the files in \`out/\`. Everything below was measured or extracted from the actual rendered MP4s — nothing is mocked.`,
    "",
    "> Voice note: renders made in an environment without Hugging Face access use the clearly-labelled placeholder robot-babble voice (`voice=placeholder` in the log). The amplitude envelope is speech-like, so lip sync, captions, ducking and timing are exercised identically; on your machine or GitHub Actions the Kokoro voice is used and `generate` refuses to publish a placeholder-voiced draft.",
    "",
  ];

  if (shortFile && (await exists(shortFile))) {
    const dir = path.dirname(shortFile);
    const props = (await readJson(path.join(dir, "video.json"))) as ShortProps;
    const t = props.timeline;
    const hook = t.sections[0]!;
    const answer = t.sections[1]!;
    const wow = t.sections[2]!;
    const exp = t.sections[3]!;
    const sign = t.sections[4]!;
    lines.push("## Short (1080×1920)", "", "```", await probe(shortFile), "```", "");
    lines.push(`- Title: **${props.script.title}** · sections: hook ${(hook.endMs - hook.startMs) / 1000}s, answer ${((answer.endMs - answer.startMs) / 1000).toFixed(1)}s, wow ${((wow.endMs - wow.startMs) / 1000).toFixed(1)}s, experiment ${((exp.endMs - exp.startMs) / 1000).toFixed(1)}s, sign-off ${((sign.endMs - sign.startMs) / 1000).toFixed(1)}s · total ${(t.totalFrames / t.fps).toFixed(1)}s (hard max 59s)`);
    lines.push(`- Captions source: ${t.timingSource}; guess beat: ${t.guess ? `${((t.guess.endMs - t.guess.startMs) / 1000).toFixed(1)}s pause` : "none"}`);
    const gapA = hook.endMs / 1000 + 0.1;
    const spans: [number, number][] = [
      [hook.startMs / 1000 + 0.3, hook.startMs / 1000 + 2.3],
      [gapA, Math.min(gapA + 0.4, answer.startMs / 1000 - 0.05)],
      [answer.startMs / 1000 + 1, answer.startMs / 1000 + 3],
      [t.totalFrames / t.fps - 1.6, t.totalFrames / t.fps - 0.2],
    ];
    const l = await loudness(shortFile, spans);
    lines.push("", "Measured loudness (voice vs. music-only gaps — music is ducked under speech):", "", `- speech: ${l[0]}`, `- gap after hook (music only): ${l[1]}`, `- speech: ${l[2]}`, `- sign-off tail (music only, fading): ${l[3]}`, "");
    const shots: [string, number][] = [
      ["hook", hook.startMs / 1000 + 1.2],
      ...(t.guess ? [["guess bubbles", t.guess.startMs / 1000 + 1.2] as [string, number], ["reveal", answer.startMs / 1000 + 0.7] as [string, number]] : []),
      ["answer", answer.startMs / 1000 + 4],
      ["wow fact (antenna glow)", wow.startMs / 1000 + 2],
      ["experiment (badge)", exp.startMs / 1000 + 2],
      ["sign-off (channel name)", t.totalFrames / t.fps - 0.6],
    ];
    lines.push("| Beat | Time | Frame |", "| --- | --- | --- |");
    for (const [label, sec] of shots) {
      const name = `short-${label.replace(/[^a-z]+/gi, "-").toLowerCase()}.png`;
      await frame(shortFile, sec, path.join(imgDir, name));
      lines.push(`| ${label} | ${sec.toFixed(1)}s | ![${label}](images/proof/${name}) |`);
    }
    // Lip-sync evidence: 8 consecutive frames during speech.
    const strip: string[] = [];
    for (let i = 0; i < 8; i++) {
      const name = `short-mouth-${i}.png`;
      await frame(shortFile, answer.startMs / 1000 + 2 + i / t.fps, path.join(imgDir, name), "180:-1");
      strip.push(`![m${i}](images/proof/${name})`);
    }
    lines.push("", "Eight consecutive frames (1/30 s apart) during speech — the mouth follows the syllables:", "", strip.join(" "), "");
  } else {
    lines.push("## Short", "", "_No rendered Short found in out/. Run `npm run generate -- --dry-run`._", "");
  }

  if (await exists(longFile)) {
    const meta = (await readJson(path.join(path.dirname(longFile), "meta.json"))) as { chapters: string; durationSeconds: number };
    lines.push("## Weekly compilation (1920×1080)", "", "```", await probe(longFile), "```", "", "Chapters written into the YouTube description:", "", "```", meta.chapters, "```", "");
    const secs = meta.chapters.split("\n").map((l) => {
      const [m, s] = l.slice(0, 5).split(":").map(Number);
      return m! * 60 + s!;
    });
    const shots: [string, number][] = [["intro", 1.5], ["chapter card", secs[0]! + 3.5], ["episode 1", secs[0]! + 12], ["episode 2 reveal", (secs[1] ?? 60) + 9.5], ["outro", meta.durationSeconds - 2]];
    lines.push("| Beat | Time | Frame |", "| --- | --- | --- |");
    for (const [label, sec] of shots) {
      const name = `long-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      await frame(longFile, sec, path.join(imgDir, name), "480:-1");
      lines.push(`| ${label} | ${sec.toFixed(1)}s | ![${label}](images/proof/${name}) |`);
    }
    const thumb = path.join(path.dirname(longFile), "thumbnail.png");
    if (await exists(thumb)) {
      await fs.copyFile(thumb, path.join(imgDir, "long-thumbnail.png"));
      lines.push("", "Thumbnail (1280×720):", "", "![thumbnail](images/proof/long-thumbnail.png)", "");
    }
  } else {
    lines.push("## Weekly compilation", "", "_No rendered weekly video found. Run `npm run weekly -- --dry-run`._", "");
  }

  lines.push("## Design sheet", "", "![Bolt design sheet](images/bolt-showcase.png)", "", "## Checks", "", "- `npm test` (unit tests: picker, validator, aligner, state, scheduling, Telegram commands, captions, chapters)", "- `npm run typecheck`, `npm run lint`", "- `npx remotion compositions remotion/index.ts` lists Short, LongVideo, Thumbnail, BoltShowcase", "");
  await writeFileAtomic(path.join(ROOT, "docs", "PROOF.md"), lines.join("\n") + "\n");
  log.info("Wrote docs/PROOF.md");
}

async function findLatest(dirPattern: RegExp, file: string): Promise<string | undefined> {
  const out = path.join(ROOT, "out");
  if (!(await exists(out))) return undefined;
  const dirs = (await fs.readdir(out)).filter((d) => dirPattern.test(d)).sort().reverse();
  for (const d of dirs) {
    const f = path.join(out, d, file);
    if (await exists(f)) return f;
  }
  return undefined;
}

main().catch((err) => {
  log.error(String(err?.stack ?? err));
  process.exit(1);
});
