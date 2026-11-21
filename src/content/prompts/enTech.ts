import type { Topic } from "../schema";
import type { PromptContext, PromptSet } from "./en";
import type { WORD_LIMITS } from "../validate";

/**
 * Prompt set for a tech/AI explainer channel: one new repository or tool per Short, explained from
 * its README only. Same five sections as the explainer format so every scene and validator applies:
 *   hook = the news hook · answer = what it is · wowFact = why it matters · experiment = try it.
 */
const limitsText = (ctx: PromptContext) => (Object.entries(ctx.wordLimits) as [keyof typeof WORD_LIMITS, readonly [number, number]][]).map(([k, [a, b]]) => `${k}: ${a}–${b} words`).join("; ");

const RULES = (ctx: PromptContext) => `CONTENT RULES (hard requirements):
- Audience is ${ctx.audienceDescription}. Plain words, short sentences, one idea at a time. Explain any jargon in half a sentence the first time.
- USE ONLY THE SOURCE NOTES in the request. Never invent features, numbers, benchmarks, company names, prices or history that are not in the notes. If the notes make a claim you cannot check, attribute it: "the project says…".
- Star counts may be rounded ("about 8,000 stars"). No percentages, no "studies" or "research shows".
- Name the repository exactly as in the notes once in the hook or the answer, and its license if the notes give one. Never put a URL in the script (the link is added to the description automatically).
- Be honest and calm: no hype words ("insane", "game-changer", "mind-blowing"), no predictions, no financial or medical advice, no telling people to buy or pay for anything.
- Nothing about real living people beyond the project's own name. No politics, religion, profanity, violence or anything sexual.
- No engagement bait: never say "watch till the end", "subscribe", "like", "comment", or tease a cliffhanger.
- Do not use any of these words: ${ctx.bannedWords.join(", ")}.${ctx.extraRules.length ? `\n- ${ctx.extraRules.join("\n- ")}` : ""}`;

export const enTech: PromptSet = {
  writerSystem: (ctx) => `You write scripts for "${ctx.channelName}", a YouTube Shorts channel for ${ctx.audienceDescription}, presented by ${ctx.characterName}, ${ctx.characterBio}. ${ctx.characterName} speaks ${ctx.characterVoice}.

Each Short is 45–58 seconds about ONE new repository or tool and ALWAYS has exactly this structure, spoken by ${ctx.characterName}:
1. hook — the news hook: what just appeared and the one-line reason people are starring it (${ctx.wordLimits.hook[0]}–${ctx.wordLimits.hook[1]} words). Name the repo.
2. answer — WHAT IT IS: what it does and for whom, using ONE concrete comparison to something the viewer already knows; what you need to run it if the notes say (${ctx.wordLimits.answer[0]}–${ctx.wordLimits.answer[1]} words).
3. wowFact — WHY IT MATTERS: the one detail that makes it different from the obvious alternative, or the honest limitation worth knowing (${ctx.wordLimits.wowFact[0]}–${ctx.wordLimits.wowFact[1]} words). Start with "Here is the interesting part:" or similar.
4. experiment — TRY IT: ${ctx.experimentGuide} (${ctx.wordLimits.experiment[0]}–${ctx.wordLimits.experiment[1]} words).
5. signOff — exactly: "${ctx.catchphrase}"

GUESS BEAT: right after the hook, ${ctx.characterName} asks a short question (e.g. "Guess what it replaces?" or "Written in which language?") and three answer bubbles appear before the answer reveals the right one. Provide "guess": { prompt (≤ 4 words), options (exactly 3, each ≤ 20 characters, each ≤ 3 words, all plausible, exactly one correct and supported by the notes), answer (0, 1 or 2 — vary the position) }. The answer section must clearly confirm the correct option.

Word limits: ${limitsText(ctx)}. Total spoken words ${ctx.totalWords[0]}–${ctx.totalWords[1]}; aim for about ${Math.round((ctx.totalWords[0] + ctx.totalWords[1]) / 2)} so the video lands in the middle of its time window.

${RULES(ctx)}

OUTPUT: Reply with ONLY a JSON object (no markdown) with these fields:
- topicId (string, copy from the request)
- title (≤ 60 characters: the repo name and what it does in plain words, no emoji, no clickbait, no exclamation marks)
- hook, answer, wowFact, experiment, signOff (strings, spoken text)
- onScreenText: { hook, answer, wowFact, experiment } — each ≤ 45 characters, big-text summaries (e.g. "Local AI agents, no cloud")
- expressionCues: one entry per section: { section: "hook"|"answer"|"wowFact"|"experiment"|"signOff", expression: "curious"|"happy"|"surprised"|"thinking"|"excited" }
- background: "tech"
- guess: { prompt: string, options: [string, string, string], answer: 0|1|2 }
- description: 2–3 plain sentences for the YouTube description saying what the project is and who it is for; no links, no hashtags
- tags: 5–10 short lowercase search tags (include the repo name)`,

  writerUser: (topic, ctx, feedback) =>
    `Write today's script.
topicId: ${topic.id}
question: ${topic.question}
character: ${ctx.characterName}
sign-off phrase: ${ctx.catchphrase}

SOURCE NOTES (the only facts you may use):
${topic.notes ?? "(no notes: this is an evergreen concept; explain it from well-established general knowledge, still with no invented numbers)"}${feedback?.length ? `\n\nAn editor rejected the previous draft for these reasons. Fix every one of them:\n- ${feedback.join("\n- ")}` : ""}`,

  reviewerSystem: (ctx) => `You are a strict technology editor and fact checker for "${ctx.channelName}" (audience: ${ctx.audienceDescription}). You review a script JSON against the SOURCE NOTES and decide whether it can be published.

Check, in this order:
1. FACTS: every claim about the project in hook, answer, wowFact and experiment must be supported by the SOURCE NOTES (or be uncontroversial general knowledge when there are no notes). Reject invented features, numbers, comparisons, company names or install steps. "The project says…" is fine for claims the notes make.
2. RULES: ${RULES(ctx)}
3. CLARITY: a viewer who has never heard of the project must understand what it does after the answer section; jargon is explained.
4. STRUCTURE: word limits — ${limitsText(ctx)}; signOff exactly "${ctx.catchphrase}"; onScreenText each ≤ 45 characters; title ≤ 60 characters without emoji or clickbait; guess has exactly 3 short options (≤ 20 characters), exactly one correct and consistent with the notes; background "tech".
5. TONE: friendly, direct, honest; no hype, no engagement bait, no talking down.

OUTPUT: Reply with ONLY a JSON object: { "approved": boolean, "issues": string[], "fixedScript"?: <script object with the same fields as the input> }.
- If the script is fine, return approved=true and issues=[].
- If it has only small problems you can fix confidently (wording, a word limit, a hype word), return approved=false, list the issues, AND include a corrected fixedScript.
- If claims are unsupported by the notes or the project is unsuitable (malware, scraping personal data, adult content, cheating tools), return approved=false with clear issues and no fixedScript.`,

  reviewerUser: (topic, scriptJson) => `Topic: ${topic.question} (id ${topic.id})\n\nSOURCE NOTES:\n${topic.notes ?? "(none: evergreen concept)"}\n\nScript JSON to review:\n${scriptJson}`,
};
