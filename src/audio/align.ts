/**
 * Align whisper tokens to the script's own words so captions show the exact script text with
 * accurate timings, even when whisper splits/merges/misspells words. Pure, unit-tested.
 */
import type { WordTiming } from "../../remotion/schema";
import { estimateWordTimings, tokenizeWords } from "./estimateTimings";

export type Token = { text: string; startMs: number; endMs: number };

export function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ""); // keep combining marks: Devanagari vowel signs are \p{M}
}

/**
 * whisper.cpp emits token-level text as byte pieces, so multi-byte scripts (Devanagari, …) arrive
 * as U+FFFD fragments. Segment text is intact, so for those we spread each segment's words over
 * the segment's time span instead of trusting the token pieces.
 */
export function segmentWords(segments: { text: string; offsets: { from: number; to: number } }[]): Token[] {
  const out: Token[] = [];
  for (const seg of segments) {
    const words = seg.text
      .trim()
      .split(/\s+/)
      .filter((w) => normalizeWord(w).length > 0);
    if (!words.length) continue;
    const span = Math.max(1, seg.offsets.to - seg.offsets.from);
    const weights = words.map((w) => normalizeWord(w).length + 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let cursor = seg.offsets.from;
    words.forEach((w, i) => {
      const dur = (weights[i]! / total) * span;
      // Leading space: mergeTokens() treats it as a word boundary, like whisper's own tokens.
      out.push({ text: ` ${w}`, startMs: Math.round(cursor), endMs: Math.round(cursor + dur) });
      cursor += dur;
    });
  }
  return out;
}

/** True when token text carries replacement characters, i.e. the byte pieces did not form whole characters. */
export function tokensLookGarbled(tokens: Token[]): boolean {
  if (!tokens.length) return false;
  const bad = tokens.filter((t) => /\uFFFD/.test(t.text)).length;
  return bad / tokens.length > 0.2;
}

/** Merge sub-word tokens (whisper emits " grown" "-" "up") into whitespace-delimited words. */
export function mergeTokens(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    const startsWord = /^\s/.test(t.text) || out.length === 0;
    const text = t.text.trim();
    if (!text || /^\[.*\]$/.test(text)) continue; // skip [BLANK_AUDIO] etc.
    const last = out[out.length - 1];
    if (!startsWord && last) {
      last.text += text;
      last.endMs = Math.max(last.endMs, t.endMs);
    } else {
      out.push({ text, startMs: t.startMs, endMs: t.endMs });
    }
  }
  return out.filter((t) => normalizeWord(t.text).length > 0);
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  if (shorter >= 3 && Math.abs(a.length - b.length) <= 2 && (a.startsWith(b) || b.startsWith(a))) return true;
  if (shorter >= 4 && editDistanceAtMostOne(a, b)) return true;
  return false;
}

/**
 * Longest-common-subsequence alignment between script words and recognised words. Matched
 * script words take the recognised timing; unmatched words are interpolated between anchors.
 */
export function alignWords(scriptText: string, recognised: Token[], sectionStartMs: number, sectionEndMs: number): { words: WordTiming[]; matched: number } {
  const words = tokenizeWords(scriptText);
  const rec = mergeTokens(recognised);
  const a = words.map(normalizeWord);
  const b = rec.map((t) => normalizeWord(t.text));
  const n = a.length;
  const m = b.length;
  // LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = similar(a[i]!, b[j]!) ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const timing: (WordTiming | null)[] = new Array(n).fill(null);
  let i = 0;
  let j = 0;
  let matched = 0;
  while (i < n && j < m) {
    if (similar(a[i]!, b[j]!)) {
      timing[i] = { text: words[i]!, startMs: rec[j]!.startMs, endMs: rec[j]!.endMs };
      matched++;
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  // Fill gaps: interpolate between neighbouring anchors (or the section bounds).
  const out: WordTiming[] = [];
  let k = 0;
  while (k < n) {
    if (timing[k]) {
      out.push(timing[k]!);
      k++;
      continue;
    }
    let e = k;
    while (e < n && !timing[e]) e++;
    const from = k === 0 ? sectionStartMs : out[out.length - 1]!.endMs;
    const to = e < n ? timing[e]!.startMs : sectionEndMs;
    const gapText = words.slice(k, e).join(" ");
    const est = estimateWordTimings(gapText, from, Math.max(from + 60 * (e - k), to));
    out.push(...est);
    k = e;
  }
  // Enforce monotonic, non-overlapping timings.
  for (let x = 1; x < out.length; x++) {
    if (out[x]!.startMs < out[x - 1]!.endMs) out[x]!.startMs = out[x - 1]!.endMs;
    if (out[x]!.endMs <= out[x]!.startMs) out[x]!.endMs = out[x]!.startMs + 60;
  }
  return { words: out, matched };
}
