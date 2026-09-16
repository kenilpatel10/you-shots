/**
 * Picks the next topic: never repeats, rotates categories so the same category is never used
 * twice in a row, and prefers difficulty 1 for the first 30 topics. Pure, unit-tested.
 */
import type { Topic } from "./schema";

export type PickInput = {
  topics: Topic[];
  usedTopicIds: string[];
  /** Topics explicitly requested for regeneration (/redo). Picked first if unused-by-video. */
  redoTopicIds?: string[];
  /** Category of the previous topic (to rotate away from). Derived from usedTopicIds if omitted. */
  lastCategory?: string;
  seed?: number;
};

/** Small deterministic PRNG so runs are reproducible for a given seed. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickTopic(input: PickInput): Topic | null {
  const byId = new Map(input.topics.map((t) => [t.id, t]));
  const used = new Set(input.usedTopicIds);

  const redo = (input.redoTopicIds ?? []).map((id) => byId.get(id)).find((t): t is Topic => !!t);
  if (redo) return redo;

  const lastId = input.usedTopicIds[input.usedTopicIds.length - 1];
  const lastCategory = input.lastCategory ?? (lastId ? byId.get(lastId)?.category : undefined);
  const early = used.size < 30;

  let candidates = input.topics.filter((t) => !used.has(t.id));
  if (candidates.length === 0) return null;
  const rotated = candidates.filter((t) => t.category !== lastCategory);
  if (rotated.length) candidates = rotated;
  if (early) {
    const easy = candidates.filter((t) => t.difficulty === 1);
    if (easy.length) candidates = easy;
  }
  // Prefer the least-used categories to keep variety across the year.
  const counts = new Map<string, number>();
  for (const id of used) {
    const c = byId.get(id)?.category;
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const minCount = Math.min(...candidates.map((t) => counts.get(t.category) ?? 0));
  const leastUsed = candidates.filter((t) => (counts.get(t.category) ?? 0) === minCount);
  const rnd = mulberry32(input.seed ?? used.size + 1);
  return leastUsed[Math.floor(rnd() * leastUsed.length)] ?? null;
}
