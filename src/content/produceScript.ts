/**
 * Writer pass → reviewer pass → deterministic validation. One rewrite with the reviewer's
 * feedback; if it still fails, the caller moves to the next topic.
 */
import { createLogger } from "../lib/logger";
import { reviewScript } from "./reviewer";
import { validateScript } from "./validate";
import { currentLanguage } from "../config";
import { writeScript } from "./writer";
import type { Script, ScriptRecord, Topic } from "./schema";

const log = createLogger("script");

export type ProduceOutcome = { ok: true; record: ScriptRecord; attempts: number } | { ok: false; reasons: string[]; attempts: number };

/** Turn "estimated length 62.3s (target 44–58s)" into an instruction the writer can act on. */
export function lengthAdvice(reason: string, wordsPerSecond: number): string | null {
  const m = /estimated length ([\d.]+)s \(target (\d+)–(\d+)s\)/.exec(reason);
  if (!m) return null;
  const est = Number(m[1]);
  const min = Number(m[2]);
  const max = Number(m[3]);
  const aim = Math.round((min + max) / 2);
  if (est > max)
    return `Too long: about ${est.toFixed(0)} seconds when spoken; the limit is ${max}. Cut roughly ${Math.max(5, Math.round((est - aim) * wordsPerSecond))} words (shorter sentences, drop one detail), aiming for ${aim} seconds.`;
  if (est < min) return `Too short: about ${est.toFixed(0)} seconds when spoken; the minimum is ${min}. Add roughly ${Math.max(5, Math.round((aim - est) * wordsPerSecond))} words of real content, aiming for ${aim} seconds.`;
  return null;
}

export async function produceScript(topic: Topic, language: string): Promise<ProduceOutcome> {
  const wps = currentLanguage().voice.wordsPerSecond;
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

    const validation = validateScript(candidate, undefined, {
      wordsPerSecond: currentLanguage().voice.wordsPerSecond,
    });
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
    feedback = [...(review.approved ? [] : review.issues), ...validation.reasons.map((r) => lengthAdvice(r, wps) ?? r)];
  }
  return { ok: false, reasons: notes, attempts: 2 };
}
