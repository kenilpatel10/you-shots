/**
 * Two tiny synthesised sound effects, generated on first use so the repo stays royalty-free:
 * a soft two-note bell when Bolt's antenna lights up, and a gentle pop when the guess is revealed.
 * Both are quiet and rounded — no startling transients for young children.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { PUBLIC_DIR } from "../lib/paths";
import { ensureDir, exists } from "../lib/fs";
import { encodeWav } from "./wav";

const SR = 24000;

function bell(): Float32Array {
  const n = Math.round(0.9 * SR);
  const out = new Float32Array(n);
  const notes = [{ f: 1318.5, at: 0 }, { f: 1760, at: 0.16 }]; // E6 → A6
  for (const { f, at } of notes) {
    const start = Math.round(at * SR);
    for (let i = start; i < n; i++) {
      const t = (i - start) / SR;
      const env = Math.exp(-t * 5.5) * Math.min(1, t * 400);
      out[i]! += 0.35 * env * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.01 * t) * Math.exp(-t * 9));
    }
  }
  return out;
}

function pop(): Float32Array {
  const n = Math.round(0.22 * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 420 + 520 * Math.min(1, t * 12); // quick upward sweep
    const env = Math.exp(-t * 22) * Math.min(1, t * 600);
    out[i] = 0.5 * env * Math.sin(2 * Math.PI * f * t);
  }
  return out;
}

export type SfxPaths = { ding: string; pop: string };

export async function ensureSfx(): Promise<SfxPaths> {
  const dir = path.join(PUBLIC_DIR, "sfx");
  await ensureDir(dir);
  const files: SfxPaths = { ding: "sfx/ding.wav", pop: "sfx/pop.wav" };
  if (!(await exists(path.join(dir, "ding.wav")))) await fs.writeFile(path.join(dir, "ding.wav"), encodeWav({ samples: bell(), sampleRate: SR }));
  if (!(await exists(path.join(dir, "pop.wav")))) await fs.writeFile(path.join(dir, "pop.wav"), encodeWav({ samples: pop(), sampleRate: SR }));
  return files;
}
