/**
 * Placeholder "robot babble" voice for offline/dry-run testing when the Kokoro model cannot be
 * downloaded. It has a speech-like amplitude envelope so lip sync and captions can be checked.
 * NEVER used for real drafts: generate.ts refuses to send or upload a placeholder-voiced video.
 */
import { estimateSectionDurationMs, estimateWordTimings } from "./estimateTimings";
import type { PcmAudio } from "./wav";

const SR = 24000;

export function placeholderVoice(text: string, seed = 1): PcmAudio {
  const durationMs = estimateSectionDurationMs(text);
  const words = estimateWordTimings(text, 0, durationMs);
  const n = Math.round((durationMs / 1000) * SR);
  const out = new Float32Array(n);
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (const w of words) {
    const syllables = Math.max(1, Math.round(w.text.replace(/[^aeiouy]/gi, "").length * 0.8));
    const wStart = w.startMs;
    const wLen = (w.endMs - w.startMs) * 0.82;
    const base = 170 + rnd() * 90;
    for (let k = 0; k < syllables; k++) {
      const a = wStart + (k / syllables) * wLen;
      const len = wLen / syllables;
      const f = base * (1 + 0.12 * Math.sin(k * 1.7 + seed));
      const i0 = Math.round((a / 1000) * SR);
      const i1 = Math.min(n, Math.round(((a + len) / 1000) * SR));
      for (let i = i0; i < i1; i++) {
        const t = (i - i0) / SR;
        const p = (i - i0) / Math.max(1, i1 - i0);
        const envl = Math.sin(Math.PI * Math.min(1, p * 1.1)) * (p < 0.9 ? 1 : (1 - p) * 10);
        const v = Math.sin(2 * Math.PI * f * t) * 0.55 + Math.sin(2 * Math.PI * f * 2.02 * t) * 0.25 + Math.sin(2 * Math.PI * f * 3.1 * t) * 0.1;
        out[i]! += v * envl * 0.35;
      }
    }
  }
  return { samples: out, sampleRate: SR };
}
