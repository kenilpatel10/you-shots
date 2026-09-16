/**
 * Writer pass → reviewer pass → deterministic validation. One rewrite with the reviewer's
 * feedback; if it still fails, the caller moves to the next topic.
 */
import { createLogger } from "../lib/logger";
import { reviewScript } from "./reviewer";
import { validateScript } from "./validate";
import { writeScript } from "./writer";
import type { Script, ScriptRecord, Topic } from "./schema";

const log = createLogger("script");

export type ProduceOutcome =
  | { ok: true; record: ScriptRecord; attempts: number }
  | { ok: false; reasons: string[]; attempts: number };

export async function produceScript(topic: Topic, language: string): Promise<ProduceOutcome> {
  let feedback: string[] | undefined;
  const notes: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    log.info(`Writing script for "${topic.question}" (attempt ${attempt})`);
    const written = await writeScript(topic, feedback);
    let candidate: Script = written.script;

    const review = await reviewScript(candidate, topic, written.provider);
    log.info(`Reviewer (${review.provider}/${review.model}${review.provider !== written.provider ? ", independent of writer" : ""}): approved=${review.approved}${review.issues.length ? ` issues=${review.issues.length}` : ""}`);
    notes.push(...review.issues.map((i) => `[attempt ${attempt}] ${i}`));
    if (!review.approved) {
      if (review.fixedScript) {
        candidate = review.fixedScript;
        log.info("Using the reviewer's corrected script");
      } else {
        feedback = review.issues;
        continue;
      }
    }

    const validation = validateScript(candidate);
    if (validation.ok) {
      return {
        ok: true,
        attempts: attempt,
        record: {
          ...candidate,
          language,
          source: "llm",
          model: `${written.provider}/${written.model}`,
          reviewerNotes: notes,
          createdAt: new Date().toISOString(),
        },
      };
    }
    log.warn(`Validator rejected attempt ${attempt}: ${validation.reasons.join("; ")}`);
    notes.push(...validation.reasons.map((r) => `[validator ${attempt}] ${r}`));
    feedback = [...(review.approved ? [] : review.issues), ...validation.reasons];
  }
  return { ok: false, reasons: notes, attempts: 2 };
}
