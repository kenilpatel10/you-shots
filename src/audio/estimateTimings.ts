/**
 * Fallback word timings when whisper.cpp is unavailable: distribute each section's
 * duration across its words proportionally to character count (+ a small per-word
 * constant so short words still get time). Pure and browser-safe.
 */
import type { SectionKey, WordTiming } from "../../remotion/schema";

export const SECTION_ORDER: SectionKey[] = ["hook", "answer", "wowFact", "experiment", "signOff"];

/** Average speaking rate used for duration estimates (words per second) at speed ≈1.06. */
export const WORDS_PER_SECOND = 2.7;
/** Silence inserted between sections in the voice track. */
export const SECTION_GAP_MS = 320;

export function tokenizeWords(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0);
}

export function estimateSectionDurationMs(text: string): number {
  const words = tokenizeWords(text);
  const chars = words.reduce((n, w) => n + w.length, 0);
  // ~ 2.7 words/s, nudged by average word length; punctuation adds pauses.
  const pauses = (text.match(/[.!?,;:]/g) ?? []).length * 180;
  const base = (words.length / WORDS_PER_SECOND) * 1000;
  const lengthAdj = Math.max(0, chars / Math.max(1, words.length) - 4.5) * 40 * words.length;
  return Math.round(base + lengthAdj + pauses);
}

export function estimateWordTimings(text: string, startMs: number, endMs: number): WordTiming[] {
  const words = tokenizeWords(text);
  if (words.length === 0) return [];
  const weights = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 2.5 + (/[.!?,]$/.test(w) ? 1.5 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  const span = endMs - startMs;
  let cursor = startMs;
  return words.map((w, i) => {
    const dur = (weights[i]! / total) * span;
    const t: WordTiming = { text: w, startMs: Math.round(cursor), endMs: Math.round(cursor + dur) };
    cursor += dur;
    return t;
  });
}
