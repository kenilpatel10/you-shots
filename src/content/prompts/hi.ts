import type { PromptSet } from "./en";
import { en } from "./en";
import { WORD_LIMITS } from "../validate";

/**
 * Hindi prompts. Instructions stay in English (models follow them more reliably); every field that
 * is spoken or shown must be written in simple, natural Hindi in Devanagari script.
 */
const HINDI_RULES = `LANGUAGE: Write hook, answer, wowFact, experiment, signOff, onScreenText, guess.prompt, guess.options, title and description in simple, warm, spoken HINDI using Devanagari script (no Roman transliteration, no English sentences; everyday English loanwords a child uses, like "टॉर्च", are fine). Use the words a 6-year-old in India hears at home: छोटे वाक्य, आसान शब्द. Use Indian everyday examples (रोटी, बारिश, आम, चाय का कप, पतंग, क्रिकेट की गेंद). Word limits are counted on Hindi words: ${Object.entries(WORD_LIMITS)
  .map(([k, [a, b]]) => `${k}: ${a}–${b}`)
  .join("; ")}. When anything is poured, filled or handled, the experiment must literally include "बड़ों से मदद लो". tags may be in Hindi or English.`;

export const hi: PromptSet = {
  writerSystem: (ctx) => `${en.writerSystem(ctx)}\n\n${HINDI_RULES}`,
  writerUser: (topic, ctx, feedback) => `${en.writerUser(topic, ctx, feedback)}\nLanguage: Hindi (Devanagari). Sign-off exactly: "${ctx.catchphrase}"`,
  reviewerSystem: (ctx) => `${en.reviewerSystem(ctx)}\n\n${HINDI_RULES}\nAlso reject any script that is not in natural Devanagari Hindi or mixes in English sentences.`,
  reviewerUser: en.reviewerUser,
};
