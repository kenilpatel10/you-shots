/**
 * A gentle, original background loop generated procedurally so the default setup ships with
 * royalty-free music and costs nothing. Replace it with a YouTube Audio Library track by
 * dropping a file at the path in config/channel.json → music.file (see assets/music/README.md).
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { encodeWav } from "./wav";
import { PUBLIC_DIR } from "../lib/paths";
import { ensureDir, exists } from "../lib/fs";

const SR = 24000;

function note(freq: number, seconds: number, gain: number, decay: number, harmonic = 0.25): Float32Array {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * decay) * Math.min(1, t * 200);
    out[i] = gain * env * (Math.sin(2 * Math.PI * freq * t) + harmonic * Math.sin(4 * Math.PI * freq * t) * Math.exp(-t * 6));
  }
  return out;
}

function pad(freqs: number[], seconds: number, gain: number): Float32Array {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  const attack = 0.6;
  const release = 0.8;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.min(1, (seconds - t) / release);
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t) + 0.15 * Math.sin(2 * Math.PI * f * 2 * t);
    out[i] = (gain * env * v) / freqs.length;
  }
  return out;
}

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Deterministic PRNG so the loop is identical on every machine. */
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMusicLoop(): { samples: Float32Array; sampleRate: number } {
  const bpm = 74;
  const beat = 60 / bpm;
  const bar = beat * 4;
  // I – vi – IV – V in C major, twice → 8 bars ≈ 26s
  const chords = [
    [60, 64, 67],
    [57, 60, 64],
    [53, 57, 60],
    [55, 59, 62],
  ];
  const bars = 8;
  const total = Math.round(bars * bar * SR);
  const mix = new Float32Array(total);
  const add = (buf: Float32Array, atSec: number) => {
    const start = Math.round(atSec * SR);
    for (let i = 0; i < buf.length && start + i < total; i++) mix[start + i]! += buf[i]!;
  };
  const rnd = mulberry(7);
  const pent = [0, 2, 4, 7, 9, 12, 14, 16];
  for (let b = 0; b < bars; b++) {
    const chord = chords[b % chords.length]!;
    add(pad(chord.map((m) => midi(m - 12)), bar, 0.09), b * bar);
    // Soft plucked melody on the off-beats, mostly chord tones.
    for (let s = 0; s < 8; s++) {
      if (rnd() < 0.35) continue;
      const root = chord[0]! + 12;
      const deg = pent[Math.floor(rnd() * pent.length)]!;
      const f = midi(root + deg);
      add(note(f, 1.2, 0.16, 3.2), b * bar + s * (beat / 2));
    }
    // Gentle bass on beats 1 and 3.
    add(note(midi(chord[0]! - 24), 1.5, 0.12, 2.0, 0.1), b * bar);
    add(note(midi(chord[0]! - 24), 1.5, 0.1, 2.0, 0.1), b * bar + 2 * beat);
  }
  // One-pole low-pass to keep it soft, then normalise to a modest peak.
  let y = 0;
  const a = 0.25;
  for (let i = 0; i < total; i++) {
    y += a * (mix[i]! - y);
    mix[i] = y;
  }
  let pk = 0;
  for (let i = 0; i < total; i++) pk = Math.max(pk, Math.abs(mix[i]!));
  const g = pk > 0 ? 0.7 / pk : 1;
  for (let i = 0; i < total; i++) mix[i]! *= g;
  // Crossfade loop seam.
  const xf = Math.round(0.4 * SR);
  for (let i = 0; i < xf; i++) {
    const t = i / xf;
    mix[i] = mix[i]! * t + mix[total - xf + i]! * (1 - t);
    mix[total - xf + i]! *= t < 1 ? 1 - t : 0;
  }
  return { samples: mix, sampleRate: SR };
}

export const GENERATED_MUSIC = "music/bolt-theme-generated.wav";

/**
 * Returns the public-relative path of the music bed to use: the configured file if it exists,
 * otherwise the generated loop (created on first use). Returns undefined when music is disabled.
 */
export async function ensureMusic(configured: string, enabled: boolean): Promise<string | undefined> {
  if (!enabled) return undefined;
  if (await exists(path.join(PUBLIC_DIR, configured))) return configured;
  const target = path.join(PUBLIC_DIR, GENERATED_MUSIC);
  if (!(await exists(target))) {
    await ensureDir(path.dirname(target));
    await fs.writeFile(target, encodeWav(generateMusicLoop()));
  }
  return GENERATED_MUSIC;
}
