import { z } from "zod";

export const SECTION_KEYS = ["hook", "answer", "wowFact", "experiment", "signOff"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const EXPRESSIONS = ["curious", "happy", "surprised", "thinking", "excited"] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export const CATEGORIES = [
  "animals",
  "space",
  "human-body",
  "weather-nature",
  "everyday-things",
  "food",
  "ocean",
  "dinosaurs",
  "how-things-work",
  "feelings-friendship",
] as const;
export type Category = (typeof CATEGORIES)[number];

const nonEmpty = z.string().trim().min(1);

export const GuessSchema = z.object({
  /** Spoken + shown right after the hook, e.g. "What do you think?" (≤ 4 words). */
  prompt: z.string().trim().min(3).max(32),
  /** Three short answer bubbles (≤ 20 characters each), one correct. */
  options: z.array(z.string().trim().min(1).max(20)).length(3),
  answer: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});
export type Guess = z.infer<typeof GuessSchema>;

export const ScriptSchema = z.object({
  topicId: nonEmpty,
  title: z.string().trim().min(3).max(60),
  hook: nonEmpty,
  answer: nonEmpty,
  wowFact: nonEmpty,
  experiment: nonEmpty,
  signOff: nonEmpty,
  onScreenText: z.object({
    hook: nonEmpty,
    answer: nonEmpty,
    wowFact: nonEmpty,
    experiment: nonEmpty,
  }),
  expressionCues: z
    .array(
      z.object({
        section: z.enum(SECTION_KEYS),
        expression: z.enum(EXPRESSIONS),
      }),
    )
    .min(1),
  background: z.enum(CATEGORIES),
  guess: GuessSchema.optional(),
  description: nonEmpty,
  tags: z.array(z.string().trim().min(1)).min(1).max(20),
});

export type Script = z.infer<typeof ScriptSchema>;

/** Script plus provenance the pipeline adds after writing/reviewing. */
export const ScriptRecordSchema = ScriptSchema.extend({
  language: z.string(),
  source: z.enum(["llm", "fallback"]),
  model: z.string().optional(),
  reviewerNotes: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type ScriptRecord = z.infer<typeof ScriptRecordSchema>;

export const ReviewResultSchema = z.object({
  approved: z.boolean(),
  issues: z.array(z.string()).default([]),
  fixedScript: ScriptSchema.optional(),
});
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

export const TopicSchema = z.object({
  id: nonEmpty,
  question: nonEmpty,
  category: z.enum(CATEGORIES),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type Topic = z.infer<typeof TopicSchema>;
export const TopicsFileSchema = z.array(TopicSchema);

/** Text actually spoken for a section: the hook also speaks the guess prompt when present. */
export function sectionSpokenText(script: Pick<Script, SectionKey> & { guess?: Pick<Guess, "prompt"> | undefined }, key: SectionKey): string {
  if (key === "hook" && script.guess) return `${script.hook} ${script.guess.prompt}`;
  return script[key];
}

export function spokenText(script: Script): string {
  return SECTION_KEYS.map((k) => sectionSpokenText(script, k)).join(" ");
}
