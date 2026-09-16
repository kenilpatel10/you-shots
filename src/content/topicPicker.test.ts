import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { pickTopic } from "./topicPicker";
import { CATEGORIES, TopicsFileSchema, type Topic } from "./schema";
import { TOPICS_FILE } from "../lib/paths";

const topics: Topic[] = TopicsFileSchema.parse(JSON.parse(readFileSync(TOPICS_FILE, "utf8")));

describe("topics.json", () => {
  it("has 365 unique, well-formed topics across all categories", () => {
    expect(topics.length).toBeGreaterThanOrEqual(365);
    expect(new Set(topics.map((t) => t.id)).size).toBe(topics.length);
    expect(new Set(topics.map((t) => t.question.toLowerCase())).size).toBe(topics.length);
    for (const c of CATEGORIES) expect(topics.filter((t) => t.category === c).length).toBeGreaterThanOrEqual(25);
    expect(topics.filter((t) => t.difficulty === 1).length).toBeGreaterThanOrEqual(60);
  });
});

describe("topic picker", () => {
  it("never repeats and never picks the same category twice in a row over a full year", () => {
    const used: string[] = [];
    let last: string | undefined;
    for (let i = 0; i < topics.length; i++) {
      const t = pickTopic({ topics, usedTopicIds: used });
      expect(t).not.toBeNull();
      expect(used).not.toContain(t!.id);
      if (last && topics.filter((x) => !used.includes(x.id) && x.category !== last).length > 0) expect(t!.category).not.toBe(last);
      used.push(t!.id);
      last = t!.category;
    }
    expect(pickTopic({ topics, usedTopicIds: used })).toBeNull();
  });

  it("prefers difficulty 1 for the first 30 days", () => {
    const used: string[] = [];
    for (let i = 0; i < 30; i++) {
      const t = pickTopic({ topics, usedTopicIds: used })!;
      expect(t.difficulty).toBe(1);
      used.push(t.id);
    }
  });

  it("honours redo requests first", () => {
    const target = topics[100]!;
    const t = pickTopic({ topics, usedTopicIds: [target.id, topics[0]!.id], redoTopicIds: [target.id] });
    expect(t?.id).toBe(target.id);
  });

  it("is deterministic for a given seed", () => {
    const a = pickTopic({ topics, usedTopicIds: [], seed: 42 });
    const b = pickTopic({ topics, usedTopicIds: [], seed: 42 });
    expect(a?.id).toBe(b?.id);
  });
});
