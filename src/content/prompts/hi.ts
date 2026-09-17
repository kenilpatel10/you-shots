import type { PromptContext, PromptSet } from "./en";
import { en } from "./en";

/**
 * Hindi prompts. Instructions stay in English (models follow them more reliably); every field that
 * is spoken or shown must be written in simple, natural Hindi in Devanagari script.
 */
const HINDI_RULES = (ctx: PromptContext) =>
  `LANGUAGE: Write hook, answer, wowFact, experiment, signOff, onScreenText, guess.prompt, guess.options, title and description in simple, warm, spoken HINDI using Devanagari script (no Roman transliteration, no English sentences; everyday English loanwords a child uses, like "टॉर्च", are fine). Use the words a 6-year-old in India hears at home: छोटे वाक्य, आसान शब्द. Use Indian everyday examples (रोटी, बारिश, आम, चाय का कप, पतंग, क्रिकेट की गेंद). Hindi is spoken more slowly than English, so keep it SHORT: word limits are counted on Hindi words and are strict: ${Object.entries(
    ctx.wordLimits,
  )
    .map(([k, [a, b]]) => `${k}: ${a}–${b}`)
    .join("; ")}; total spoken words ${ctx.totalWords[0]}–${ctx.totalWords[1]}. When anything is poured, filled or handled, the experiment must literally include "बड़ों से मदद लो". tags may be in Hindi or English.`;

export const hi: PromptSet = {
  writerSystem: (ctx) => `${en.writerSystem(ctx)}\n\n${HINDI_RULES(ctx)}`,
  writerUser: (topic, ctx, feedback) => `${en.writerUser(topic, ctx, feedback)}\nLanguage: Hindi (Devanagari). Sign-off exactly: "${ctx.catchphrase}"`,
  reviewerSystem: (ctx) => `${en.reviewerSystem(ctx)}\n\n${HINDI_RULES(ctx)}\nAlso reject any script that is not in natural Devanagari Hindi or mixes in English sentences.`,
  reviewerUser: en.reviewerUser,
};
