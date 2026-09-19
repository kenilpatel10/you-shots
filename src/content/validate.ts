/**
 * Deterministic script validation — the last line of defence after the LLM reviewer.
 * Every rule here fails loudly with a reason; nothing is silently "fixed".
 */
import { loadBannedWords, type BannedWords } from "../config";
import { estimateSectionDurationMs, tokenizeWords, SECTION_GAP_MS, WORDS_PER_SECOND } from "../audio/estimateTimings";
import { CATEGORIES, ScriptSchema, sectionSpokenText, type Script } from "./schema";
import { GUESS_PAUSE_MS } from "../../remotion/schema";

export type ValidationResult = { ok: true; estimatedSeconds: number } | { ok: false; reasons: string[]; estimatedSeconds: number };

/** Word-count windows per section (spoken words). */
export const WORD_LIMITS = {
  hook: [5, 16],
  answer: [35, 70],
  wowFact: [18, 40],
  experiment: [18, 42],
  signOff: [2, 12],
} as const;

export const TARGET_SECONDS = { min: 44, max: 58 } as const;

export type WordLimits = Record<keyof typeof WORD_LIMITS, readonly [number, number]>;

/** Word windows scaled to a voice's speaking rate: a slower voice (Hindi ≈ 2.2 w/s) gets a smaller budget. */
export function wordLimitsFor(wordsPerSecond = WORDS_PER_SECOND): WordLimits {
  const k = wordsPerSecond / WORDS_PER_SECOND;
  const out = {} as Record<string, readonly [number, number]>;
  for (const [key, [min, max]] of Object.entries(WORD_LIMITS)) out[key] = [Math.max(2, Math.round(min * k)), Math.max(4, Math.round(max * k))];
  return out as WordLimits;
}

/** Total spoken words that land inside TARGET_SECONDS at this rate (used in the writer prompt). */
export function totalWordsFor(wordsPerSecond = WORDS_PER_SECOND): readonly [number, number] {
  const k = wordsPerSecond / WORDS_PER_SECOND;
  return [Math.round(115 * k), Math.round(150 * k)];
}
export const MAX_ONSCREEN_CHARS = 48;
export const MAX_TITLE_CHARS = 60;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function findBannedWords(text: string, banned: string[]): string[] {
  const hay = ` ${text.toLowerCase().replace(/[‘’]/g, "'")} `;
  const hits: string[] = [];
  for (const term of banned) {
    const t = term.toLowerCase().trim();
    if (!t) continue;
    if (t === "%") {
      if (hay.includes("%")) hits.push(t);
      continue;
    }
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(t)}(?![\\p{L}\\p{N}])`, "u");
    if (re.test(hay)) hits.push(t);
  }
  return hits;
}

export function needsGrownUp(experiment: string, rules: BannedWords["requiredWhenHandling"] = loadBannedWords().requiredWhenHandling): boolean {
  const lower = experiment.toLowerCase();
  return rules.triggers.some((t) => new RegExp(`(?<![\\p{L}])${escapeRe(t)}(?![\\p{L}])`, "u").test(lower));
}

export function hasGrownUpPhrase(experiment: string, rules: BannedWords["requiredWhenHandling"] = loadBannedWords().requiredWhenHandling): boolean {
  const lower = experiment.toLowerCase().replace(/[‘’]/g, "'");
  return rules.required.some((r) => lower.includes(r));
}

export function estimateScriptSeconds(script: Pick<Script, "hook" | "answer" | "wowFact" | "experiment" | "signOff"> & { guess?: Script["guess"] }, wordsPerSecond = WORDS_PER_SECOND): number {
  const keys = ["hook", "answer", "wowFact", "experiment", "signOff"] as const;
  const ms =
    keys.reduce((a, k) => a + estimateSectionDurationMs(sectionSpokenText(script, k), wordsPerSecond), 0) +
    4 * SECTION_GAP_MS +
    (script.guess ? GUESS_PAUSE_MS : 0) +
    800 + // lead-in (jingle)
    2000; // sign-off tail
  return ms / 1000;
}

const ENGAGEMENT_BAIT = [/watch (till|until) the end/i, /don'?t (skip|scroll)/i, /subscribe/i, /like and/i, /comment below/i, /you won'?t believe/i, /wait for it/i, /smash/i];
const STATS = [/\b\d+(\.\d+)?\s?(%|percent)/i, /\bstud(y|ies)\b/i, /\bscientists (say|found|discovered)/i, /\bresearch(ers)?\b/i, /\baccording to\b/i];
const URLS = [/https?:\/\//i, /\bwww\./i, /\.com\b/i, /\bapp\b/i];

export type ValidateOptions = { wordsPerSecond?: number; audience?: "kids" | "general" };

export function validateScript(input: unknown, banned: BannedWords = loadBannedWords(), options: ValidateOptions = {}): ValidationResult {
  const reasons: string[] = [];
  const wps = options.wordsPerSecond ?? WORDS_PER_SECOND;
  const limits = wordLimitsFor(wps);
  const parsed = ScriptSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reasons: parsed.error.issues.map((i) => `schema: ${i.path.join(".")} ${i.message}`),
      estimatedSeconds: 0,
    };
  }
  const s = parsed.data;

  for (const [key, [min, max]] of Object.entries(limits) as [keyof typeof WORD_LIMITS, readonly [number, number]][]) {
    const n = tokenizeWords(s[key]).length;
    if (n < min || n > max) reasons.push(`${key}: ${n} words (allowed ${min}–${max})`);
  }

  const estimatedSeconds = estimateScriptSeconds(s, wps);
  if (estimatedSeconds < TARGET_SECONDS.min || estimatedSeconds > TARGET_SECONDS.max) {
    reasons.push(`estimated length ${estimatedSeconds.toFixed(1)}s (target ${TARGET_SECONDS.min}–${TARGET_SECONDS.max}s)`);
  }

  if (s.title.length > MAX_TITLE_CHARS) reasons.push(`title longer than ${MAX_TITLE_CHARS} chars`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s.title)) reasons.push("title contains emoji");
  if (/!{2,}|\?{2,}|SHOCKING|INSANE|MUST WATCH/i.test(s.title)) reasons.push("title looks like clickbait");

  for (const [k, v] of Object.entries(s.onScreenText)) {
    if (v.length > MAX_ONSCREEN_CHARS) reasons.push(`onScreenText.${k} longer than ${MAX_ONSCREEN_CHARS} chars`);
  }

  const spoken = [s.hook, s.answer, s.wowFact, s.experiment, s.signOff].join(" ");
  const everything = [spoken, s.title, s.description, ...Object.values(s.onScreenText), ...s.tags, ...(s.guess ? [s.guess.prompt, ...s.guess.options] : [])].join(" ");
  if (s.guess) {
    if (tokenizeWords(s.guess.prompt).length > 5) reasons.push("guess.prompt longer than 5 words");
    if (new Set(s.guess.options.map((o) => o.toLowerCase())).size !== 3) reasons.push("guess options must be three different answers");
  }
  const hits = findBannedWords(everything, banned.banned);
  if (hits.length) reasons.push(`banned words: ${hits.join(", ")}`);
  const hazards = findBannedWords(s.experiment, banned.bannedInExperiment);
  if (hazards.length) reasons.push(`unsafe experiment (hazard words): ${hazards.join(", ")}`);

  for (const re of ENGAGEMENT_BAIT) if (re.test(everything)) reasons.push(`engagement bait: ${re.source}`);
  for (const re of STATS) if (re.test(spoken)) reasons.push(`invented statistics/studies: ${re.source}`);
  for (const re of URLS) if (re.test(everything)) reasons.push(`online reference: ${re.source}`);

  if ((options.audience ?? "kids") === "kids" && needsGrownUp(s.experiment, banned.requiredWhenHandling) && !hasGrownUpPhrase(s.experiment, banned.requiredWhenHandling)) {
    reasons.push('experiment involves pouring/handling but does not say "ask a grown-up"');
  }
  if (/\b(eat|eating|taste|tasting|lick|drink|drinking|swallow)\b|\b(in|into|near) (your|the|their) (mouth|eyes?|ears?|nose)\b/i.test(s.experiment)) {
    reasons.push("experiment involves eating/tasting or putting things near the mouth, eyes, ears or nose");
  }

  const cueSections = new Set(s.expressionCues.map((c) => c.section));
  for (const k of ["hook", "answer", "wowFact", "experiment", "signOff"] as const) {
    if (!cueSections.has(k)) reasons.push(`missing expression cue for ${k}`);
  }
  if (!(CATEGORIES as readonly string[]).includes(s.background)) reasons.push(`unknown background ${s.background}`);

  return reasons.length ? { ok: false, reasons, estimatedSeconds } : { ok: true, estimatedSeconds };
}
