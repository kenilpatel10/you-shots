import { useMemo } from "react";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { staticFile } from "remotion";
import type { Timeline } from "./schema";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Sort a copy and return the value at the given percentile (0–1). */
function percentile(values: Float32Array, p: number): number {
  const sorted = Array.from(values).sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
}

/**
 * Per-frame mouth openness (0–1) derived from the voice track's low/mid frequency energy,
 * self-normalised to the track so it works at any loudness, then smoothed over 3 frames.
 * Deterministic: the same audio always gives the same curve.
 */
export function useMouthCurve(voice: string, timeline: Timeline): (frame: number) => number {
  // Hooks cannot be conditional: fall back to a tiny silent file when there is no voice track.
  const src = voice ? staticFile(voice) : staticFile("silence.wav");
  const audioData = useAudioData(src);
  return useMemo(() => {
    const total = timeline.totalFrames;
    const fps = timeline.fps;
    if (audioData && voice) {
      const raw = new Float32Array(total);
      for (let f = 0; f < total; f++) {
        const bins = visualizeAudio({ audioData, frame: f, fps, numberOfSamples: 32, optimizeFor: "accuracy" });
        // Speech energy lives in the lower bins; skip DC.
        let e = 0;
        for (let i = 1; i <= 8; i++) e += bins[i] ?? 0;
        raw[f] = e / 8;
      }
      const ref = percentile(raw, 0.93) || 1;
      const floor = percentile(raw, 0.35);
      const norm = raw.map((v) => clamp01((v - floor) / Math.max(1e-6, ref - floor)));
      return (frame: number) => {
        const f = Math.max(0, Math.min(total - 1, Math.round(frame)));
        const a = norm[Math.max(0, f - 1)] ?? 0;
        const b = norm[f] ?? 0;
        const c = norm[Math.min(total - 1, f + 1)] ?? 0;
        const v = a * 0.25 + b * 0.5 + c * 0.25;
        // Ease so small sounds still move the mouth a little and loud ones open it fully.
        return clamp01(Math.pow(v, 0.8) * 1.1);
      };
    }
    // Fallback: open the mouth rhythmically while a word is being spoken.
    const words = timeline.sections.flatMap((s) => s.words);
    return (frame: number) => {
      const ms = (frame / fps) * 1000;
      const w = words.find((x) => ms >= x.startMs && ms < x.endMs);
      if (!w) return 0;
      const t = (ms - w.startMs) / 1000;
      return 0.3 + 0.5 * Math.abs(Math.sin(t * Math.PI * 9 + w.startMs));
    };
  }, [audioData, src, timeline]);
}

/** True while any word is being spoken (with a little padding) — used for music ducking. */
export function isSpeaking(timeline: Timeline, ms: number, padMs = 200): boolean {
  for (const s of timeline.sections) {
    if (ms >= s.startMs - padMs && ms <= s.endMs + padMs) return true;
  }
  return false;
}
