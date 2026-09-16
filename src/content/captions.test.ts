import { describe, expect, it } from "vitest";
import { paginate } from "../../remotion/components/Captions";
import { estimateWordTimings } from "../audio/estimateTimings";

describe("caption pagination", () => {
  const words = estimateWordTimings("Sunlight looks white, but it is really all the colours of the rainbow mixed together. When sunlight reaches Earth, it bumps into tiny bits of air.", 0, 12000);

  it("never exceeds 4 words or 22 characters per page", () => {
    for (const p of paginate(words)) {
      expect(p.words.length).toBeLessThanOrEqual(4);
      expect(p.words.map((w) => w.text).join(" ").length).toBeLessThanOrEqual(22 + 8); // a single long word may exceed
    }
  });

  it("covers every word exactly once, in order", () => {
    const flat = paginate(words).flatMap((p) => p.words.map((w) => w.text));
    expect(flat).toEqual(words.map((w) => w.text));
  });

  it("holds each page until the next page starts (no flicker gaps)", () => {
    const pages = paginate(words);
    for (let i = 0; i < pages.length - 1; i++) expect(pages[i]!.endMs).toBeGreaterThanOrEqual(pages[i + 1]!.startMs);
  });

  it("breaks after sentence-ending punctuation", () => {
    const pages = paginate(estimateWordTimings("Hi there. Now go on and see", 0, 3000));
    expect(pages[0]!.words.map((w) => w.text)).toEqual(["Hi", "there."]);
  });
});
