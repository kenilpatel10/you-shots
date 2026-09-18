import { describe, expect, it } from "vitest";
import { alignWords, mergeTokens, normalizeWord, segmentWords, tokensLookGarbled } from "./align";

describe("whisper alignment", () => {
  it("merges sub-word tokens into words", () => {
    const merged = mergeTokens([
      { text: " Ask", startMs: 0, endMs: 200 },
      { text: " a", startMs: 200, endMs: 300 },
      { text: " grown", startMs: 300, endMs: 500 },
      { text: "-", startMs: 500, endMs: 520 },
      { text: "up", startMs: 520, endMs: 700 },
      { text: " [BLANK_AUDIO]", startMs: 700, endMs: 900 },
    ]);
    expect(merged.map((t) => t.text)).toEqual(["Ask", "a", "grown-up"]);
    expect(merged[2]).toMatchObject({ startMs: 300, endMs: 700 });
  });

  it("takes recognised timings for matched words and interpolates the rest", () => {
    const { words, matched } = alignWords(
      "Why is the sky blue today?",
      [
        { text: " Why", startMs: 100, endMs: 300 },
        { text: " is", startMs: 300, endMs: 400 },
        { text: " the", startMs: 400, endMs: 500 },
        { text: " skye", startMs: 500, endMs: 800 }, // misspelled → similar()
        { text: " today", startMs: 1100, endMs: 1400 },
      ],
      0,
      1600,
    );
    expect(matched).toBe(5);
    expect(words.map((w) => w.text)).toEqual(["Why", "is", "the", "sky", "blue", "today?"]);
    expect(words[3]).toMatchObject({ startMs: 500, endMs: 800 });
    // "blue" was not recognised → sits between sky and today
    expect(words[4]!.startMs).toBeGreaterThanOrEqual(800);
    expect(words[4]!.endMs).toBeLessThanOrEqual(1100);
    expect(words[5]).toMatchObject({ startMs: 1100, endMs: 1400 });
  });

  it("falls back to estimates when nothing matches", () => {
    const { words, matched } = alignWords("Hello there friends", [], 0, 1500);
    expect(matched).toBe(0);
    expect(words).toHaveLength(3);
    expect(words[0]!.startMs).toBe(0);
    expect(words[2]!.endMs).toBe(1500);
  });

  it("keeps timings monotonic", () => {
    const { words } = alignWords(
      "one two three",
      [
        { text: " one", startMs: 0, endMs: 500 },
        { text: " two", startMs: 300, endMs: 400 },
        { text: " three", startMs: 380, endMs: 900 },
      ],
      0,
      1000,
    );
    for (let i = 1; i < words.length; i++) expect(words[i]!.startMs).toBeGreaterThanOrEqual(words[i - 1]!.endMs);
  });

  it("keeps Devanagari vowel signs when normalising", () => {
    expect(normalizeWord("डायनासोर!")).toBe("डायनासोर");
    expect(normalizeWord("किस")).not.toBe(normalizeWord("कस"));
  });

  it("aligns Hindi from segment text when token pieces are garbled bytes", () => {
    const script = "क्या डायनासोर रंग-बिरंगे होते थे?";
    const garbled = [
      { text: "\uFFFD\uFFFD", startMs: 0, endMs: 300 },
      { text: "\uFFFD", startMs: 300, endMs: 600 },
      { text: "\uFFFD\uFFFD\uFFFD", startMs: 600, endMs: 1200 },
    ];
    expect(tokensLookGarbled(garbled)).toBe(true);
    expect(alignWords(script, garbled, 0, 3000).matched).toBe(0);
    const bySegment = segmentWords([{ text: " क्या डायनासोर रंग-बिरंगे होते थे?", offsets: { from: 120, to: 2900 } }]);
    expect(bySegment.map((t) => t.text.trim())).toEqual(["क्या", "डायनासोर", "रंग-बिरंगे", "होते", "थे?"]);
    expect(bySegment[0]!.startMs).toBe(120);
    expect(bySegment[4]!.endMs).toBe(2900);
    const r = alignWords(script, bySegment, 0, 3000);
    expect(r.matched).toBe(5);
    expect(r.words[1]!.text).toBe("डायनासोर");
    expect(r.words[1]!.startMs).toBeGreaterThan(r.words[0]!.startMs);
  });
});
