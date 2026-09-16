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

export function spokenText(script: Script): string {
  return [script.hook, script.answer, script.wowFact, script.experiment, script.signOff].join(" ");
}
