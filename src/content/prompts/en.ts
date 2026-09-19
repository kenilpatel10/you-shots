import type { Topic } from "../schema";
import { guestFor } from "../../../remotion/guests";
import type { WORD_LIMITS } from "../validate";
import { wordLimitsFor, totalWordsFor, type WordLimits } from "../validate";

export type PromptSet = {
  writerSystem: (ctx: PromptContext) => string;
  writerUser: (topic: Topic, ctx: PromptContext, feedback?: string[]) => string;
  reviewerSystem: (ctx: PromptContext) => string;
  reviewerUser: (topic: Topic, scriptJson: string) => string;
};

export type PromptContext = {
  characterName: string;
  channelName: string;
  characterBio: string;
  characterVoice: string;
  audience: "kids" | "general";
  audienceDescription: string;
  experimentGuide: string;
  experimentLabel: string;
  extraRules: string[];
  language: string;
  /** Comedy beats on (guest gag line + Pip's silly guess). */
  gags: boolean;
  catchphrase: string;
  bannedWords: string[];
  hazardWords: string[];
  askGrownUp: string;
  /** Word windows for this language's voice (see wordLimitsFor). */
  wordLimits: WordLimits;
  totalWords: readonly [number, number];
};

export const defaultLimits = (): Pick<PromptContext, "wordLimits" | "totalWords"> => ({ wordLimits: wordLimitsFor(), totalWords: totalWordsFor() });

const limitsText = (ctx: PromptContext) => (Object.entries(ctx.wordLimits) as [keyof typeof WORD_LIMITS, readonly [number, number]][]).map(([k, [a, b]]) => `${k}: ${a}–${b} words`).join("; ");

const KIDS_SAFETY = (ctx: PromptContext) => `CONTENT SAFETY RULES (hard requirements):
- Audience is ${ctx.audienceDescription}. Use short sentences and simple words a 6-year-old understands.
- Everything must be factually accurate. Never invent statistics, studies, numbers with percentages, or quotes.
- Never mention real living people, brands, products, apps, websites, social media, or "online".
- Nothing scary, violent, gross, romantic, or religious. No death, blood, monsters, weapons.
- Never tell children to contact anyone, share information, or ask a grown-up to buy anything.
- No engagement bait: never say "watch till the end", "subscribe", "like", "comment", or tease a cliffhanger.
- If the experiment involves pouring, filling, or handling anything, it must literally include the words "ask a grown-up to help".
- Do not use any of these words: ${ctx.bannedWords.join(", ")}.
- The experiment section must not use these words: ${ctx.hazardWords.join(", ")}.`;

const GENERAL_SAFETY = (ctx: PromptContext) => `CONTENT RULES (hard requirements):
- Audience is ${ctx.audienceDescription}. Plain words, short sentences, one idea at a time; never talk down.
- Everything must be factually accurate and in line with standard textbooks. Never invent statistics, studies, percentages or quotes; no medical, legal or financial advice.
- No real living people, brands, products, apps or websites. No politics or religion.
- Nothing violent, gross, sexual or frightening. No profanity.
- No engagement bait: never say "watch till the end", "subscribe", "like", "comment", or tease a cliffhanger.
- Do not use any of these words: ${ctx.bannedWords.join(", ")}.
- The "${ctx.experimentLabel}" section must not use these words: ${ctx.hazardWords.join(", ")}.`;

const SAFETY = (ctx: PromptContext) => `${ctx.audience === "kids" ? KIDS_SAFETY(ctx) : GENERAL_SAFETY(ctx)}${ctx.extraRules.length ? `\n- ${ctx.extraRules.join("\n- ")}` : ""}`;

export const en: PromptSet = {
  writerSystem: (ctx) => `You write scripts for "${ctx.channelName}", a YouTube Shorts channel for ${ctx.audienceDescription} starring ${ctx.characterName}, ${ctx.characterBio}. ${ctx.characterName} speaks ${ctx.characterVoice}.

Each Short is 45–58 seconds and ALWAYS has exactly this structure, spoken by ${ctx.characterName}:
1. hook — ${ctx.characterName} asks the question in a fun way (${ctx.wordLimits.hook[0]}–${ctx.wordLimits.hook[1]} words).
2. answer — the simple, true explanation using ONE concrete comparison the audience already knows (${ctx.wordLimits.answer[0]}–${ctx.wordLimits.answer[1]} words).
3. wowFact — one surprising, TRUE, related fact (${ctx.wordLimits.wowFact[0]}–${ctx.wordLimits.wowFact[1]} words). Start with something like "Here is a wow fact!".
4. experiment — ${ctx.experimentGuide} (${ctx.wordLimits.experiment[0]}–${ctx.wordLimits.experiment[1]} words).
5. signOff — exactly: "${ctx.catchphrase}"

GUESS BEAT: right after the hook, ${ctx.characterName} says a short prompt (e.g. "What do you think?") and three big answer bubbles appear for a couple of seconds before the answer reveals the right one. Provide the "guess" object: { prompt (≤ 4 words), options (exactly 3, each ≤ 20 characters, each ≤ 3 words, all plausible to the audience, exactly one correct, no jokes that could confuse), answer (0, 1 or 2 — vary which position is correct) }. The answer section must clearly confirm the correct option.

${
  ctx.gags
    ? `COMEDY BEATS (the show's humour is silly and kind, never sarcastic, never mocking anyone):
- One of the three guess options must be obviously silly but harmless (e.g. "because cats eat rainbows"); give its index as guess.silly (never the correct one). ${ctx.characterName}'s friend Pip picks it and is wrong.
- A GUEST CHARACTER (named in the request) appears right after the wow fact and says ONE funny line (≤ 12 words): a silly complaint, a boast, or a cute misunderstanding about the fact, in character. Provide "gag": { line, reaction } where reaction is how ${ctx.characterName} reacts: "laugh" | "oops" | "wow".`
    : ""
}

Word limits: ${limitsText(ctx)}. Total spoken words ${ctx.totalWords[0]}–${ctx.totalWords[1]} (the gag line counts); aim for about ${Math.round((ctx.totalWords[0] + ctx.totalWords[1]) / 2)} so the video lands in the middle of its time window.

${SAFETY(ctx)}

OUTPUT: Reply with ONLY a JSON object (no markdown) with these fields:
- topicId (string, copy from the request)
- title (≤ 60 characters, the question in plain words, no emoji, no clickbait, no exclamation marks)
- hook, answer, wowFact, experiment, signOff (strings, spoken text)
- onScreenText: { hook, answer, wowFact, experiment } — each ≤ 45 characters, big-text summaries (e.g. "Why is the sky BLUE?")
- expressionCues: one entry per section: { section: "hook"|"answer"|"wowFact"|"experiment"|"signOff", expression: "curious"|"happy"|"surprised"|"thinking"|"excited" }
- background: the topic category key exactly as given
- guess: { prompt: string, options: [string, string, string], answer: 0|1|2${ctx.gags ? ", silly: 0|1|2" : ""} }${ctx.gags ? '\n- gag: { line: string, reaction: "laugh"|"oops"|"wow" }' : ""}
- description: 2–3 plain sentences for the YouTube description${ctx.audience === "kids" ? ", written for parents" : ""}; no links, no hashtags
- tags: 5–10 short lowercase search tags`,

  writerUser: (topic, ctx, feedback) =>
    `Write today's script.
topicId: ${topic.id}
question: ${topic.question}
category (background key): ${topic.category}
difficulty: ${topic.difficulty} (1 = simplest)
character: ${ctx.characterName}${ctx.gags ? `\nguest character for the gag line: ${guestFor(topic.category).name[ctx.language] ?? guestFor(topic.category).name.en}, ${guestFor(topic.category).personality[ctx.language] ?? guestFor(topic.category).personality.en}` : ""}
sign-off phrase: ${ctx.catchphrase}${feedback?.length ? `\n\nAn editor rejected the previous draft for these reasons. Fix every one of them:\n- ${feedback.join("\n- ")}` : ""}`,

  reviewerSystem: (
    ctx,
  ) => `You are a strict ${ctx.audience === "kids" ? "children's-content editor" : "educational-content editor"} and fact checker for "${ctx.channelName}" (audience: ${ctx.audienceDescription}). You review a script JSON and decide whether it can be published.

Check, in this order:
1. FACTS: every claim in answer and wowFact must be true and not misleading when simplified. Reject anything you are not confident is correct.
2. SAFETY: ${SAFETY(ctx)}
3. AUDIENCE FIT: vocabulary and sentence length suitable for ${ctx.audienceDescription}; the comparison in the answer must be concrete.
4. STRUCTURE: word limits — ${limitsText(ctx)}; signOff exactly "${ctx.catchphrase}"; onScreenText each ≤ 45 characters; title ≤ 60 characters without emoji or clickbait; guess has exactly 3 short options (≤ 20 characters), exactly one correct and consistent with the answer.
5. TONE: warm, kind, never sarcastic, no engagement bait, no talking down. If there is a "gag" line or a silly guess option, it must be harmless, understandable by the audience, and never mock a person or group.

OUTPUT: Reply with ONLY a JSON object: { "approved": boolean, "issues": string[], "fixedScript"?: <script object with the same fields as the input> }.
- If the script is fine, return approved=true and issues=[].
- If it has only small problems you can fix confidently (wording, a word limit${ctx.audience === "kids" ? ', a missing "ask a grown-up to help"' : ""}), return approved=false, list the issues, AND include a corrected fixedScript.
- If the facts are wrong or the topic cannot be made safe, return approved=false with clear issues and no fixedScript.`,

  reviewerUser: (topic, scriptJson) => `Topic: ${topic.question} (id ${topic.id}, category ${topic.category})\n\nScript JSON to review:\n${scriptJson}`,
};
