/**
 * Hand-checked scripts used when no LLM is available. Each is used at most once (tracked in
 * state.usedFallbackScripts); the reviewer is told on Telegram when one is used.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { FALLBACK_DIR } from "../lib/paths";
import { ScriptSchema, type Script, type Topic } from "./schema";

export type FallbackScript = { file: string; script: Script };

/** English scripts live in data/fallback-scripts/, other languages in data/fallback-scripts/<lang>/. */
export function fallbackDirFor(language: string): string {
  return language === "en" ? FALLBACK_DIR : path.join(FALLBACK_DIR, language);
}

export async function listFallbackScripts(language = "en"): Promise<FallbackScript[]> {
  const dir = fallbackDirFor(language);
  let files: string[] = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  const out: FallbackScript[] = [];
  for (const file of files) {
    const raw = JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
    out.push({ file: language === "en" ? file : `${language}/${file}`, script: ScriptSchema.parse(raw) });
  }
  return out;
}

/** Pick an unused fallback script, preferring one whose topic has not been used yet. */
export async function pickFallbackScript(usedFiles: string[], usedTopicIds: string[], preferTopicId?: string, language = "en"): Promise<FallbackScript | null> {
  const all = await listFallbackScripts(language);
  const unused = all.filter((f) => !usedFiles.includes(f.file));
  if (preferTopicId) {
    const exact = unused.find((f) => f.script.topicId === preferTopicId);
    if (exact) return exact;
  }
  return unused.find((f) => !usedTopicIds.includes(f.script.topicId)) ?? unused[0] ?? null;
}

export function fallbackTopic(script: Script, topics: Topic[]): Topic {
  return topics.find((t) => t.id === script.topicId) ?? { id: script.topicId, question: script.title, category: script.background, difficulty: 1 };
}
