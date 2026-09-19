import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { estimateScriptSeconds, findBannedWords, hasGrownUpPhrase, needsGrownUp, validateScript } from "./validate";
import { FALLBACK_DIR } from "../lib/paths";

const sample = JSON.parse(readFileSync(path.join(FALLBACK_DIR, "001-why-is-the-sky-blue.json"), "utf8"));

describe("script validator", () => {
  it("accepts the hand-checked sample script", () => {
    const r = validateScript(sample);
    expect(r).toMatchObject({ ok: true });
    expect(r.estimatedSeconds).toBeGreaterThan(44);
    expect(r.estimatedSeconds).toBeLessThan(58);
  });

  it("rejects schema violations with a reason", () => {
    const r = validateScript({ ...sample, title: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join()).toMatch(/schema: title/);
  });

  it("catches banned words as whole words only", () => {
    expect(findBannedWords("The fire truck", ["fire"])).toEqual(["fire"]);
    expect(findBannedWords("A firefly glows", ["fire"])).toEqual([]);
    expect(findBannedWords("Shut up now", ["shut up"])).toEqual(["shut up"]);
    expect(findBannedWords("Only 40% of kids", ["%"])).toEqual(["%"]);
  });

  it("flags scary/violent content, engagement bait and invented statistics", () => {
    const r = validateScript({ ...sample, wowFact: sample.wowFact + " Scientists say 80% of clouds are scary monsters, so watch till the end!" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const text = r.reasons.join(" | ");
      expect(text).toMatch(/banned words/);
      expect(text).toMatch(/engagement bait/);
      expect(text).toMatch(/statistics/);
    }
  });

  it("requires the grown-up phrase when the experiment involves pouring or handling", () => {
    expect(needsGrownUp("Fill a cup with water and watch it.")).toBe(true);
    expect(needsGrownUp("Look at the clouds and count them.")).toBe(false);
    expect(hasGrownUpPhrase("Ask a grown-up to help you pour the water.")).toBe(true);
    const r = validateScript({ ...sample, experiment: "Try this! Fill a cup with water and drop in a coin. Watch the tiny waves wobble around. Do the waves get smaller as they spread out? Count how many rings you can see." });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join()).toMatch(/ask a grown-up/);
  });

  it("enforces word counts and total length", () => {
    const r = validateScript({ ...sample, answer: "Because." });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join()).toMatch(/answer: 1 words/);
    const long = { ...sample, answer: Array(70).fill("bouncy").join(" "), wowFact: Array(40).fill("wow").join(" ") };
    expect(estimateScriptSeconds(long)).toBeGreaterThan(58);
    expect(validateScript(long).ok).toBe(false);
  });

  it("rejects emoji and clickbait titles", () => {
    expect(validateScript({ ...sample, title: "Why is the sky blue?? 😱" }).ok).toBe(false);
  });
});

describe("audience modes", () => {
  it("only demands 'ask a grown-up' for the kids audience", () => {
    const script = { ...sample, experiment: "Try this! Fill a cup with water and drop in a coin. Watch the tiny waves wobble around. Do the waves get smaller as they spread out? Count how many rings you can see." };
    const kids = validateScript(script, undefined, { audience: "kids" });
    const general = validateScript(script, undefined, { audience: "general" });
    expect(kids.ok).toBe(false);
    expect((kids as { reasons: string[] }).reasons.join(" ")).toMatch(/grown-up/);
    expect(general.ok || !(general as { reasons: string[] }).reasons.join(" ").includes("grown-up")).toBe(true);
  });
});
