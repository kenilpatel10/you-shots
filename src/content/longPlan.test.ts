import { describe, expect, it } from "vitest";
import { chapterList, formatChapterTime, planLongVideo } from "../../remotion/long/plan";
import { CHAPTER_CARD_FRAMES, INTRO_FRAMES, OUTRO_FRAMES } from "../../remotion/schema";
import { sampleLongProps } from "../../remotion/sample/sampleLong";

describe("long video plan", () => {
  it("lays out intro, chapter cards, episodes and outro back to back", () => {
    const plan = planLongVideo(sampleLongProps);
    expect(plan.episodes[0]!.chapterFrom).toBe(INTRO_FRAMES);
    expect(plan.episodes[0]!.from).toBe(INTRO_FRAMES + CHAPTER_CARD_FRAMES);
    for (let i = 1; i < plan.episodes.length; i++) {
      const prev = plan.episodes[i - 1]!;
      expect(plan.episodes[i]!.chapterFrom).toBe(prev.from + prev.durationInFrames);
    }
    const last = plan.episodes[plan.episodes.length - 1]!;
    expect(plan.outroFrom).toBe(last.from + last.durationInFrames);
    expect(plan.totalFrames).toBe(plan.outroFrom + OUTRO_FRAMES);
  });

  it("produces YouTube-style chapters starting at 00:00, each at least 10 s apart", () => {
    const text = chapterList(sampleLongProps, 30);
    const lines = text.split("\n");
    expect(lines[0]).toMatch(/^00:00 /);
    const secs = lines.map((l) => {
      const [m, s] = l.slice(0, 5).split(":").map(Number);
      return m! * 60 + s!;
    });
    for (let i = 1; i < secs.length; i++) expect(secs[i]! - secs[i - 1]!).toBeGreaterThanOrEqual(10);
    expect(lines.length).toBe(sampleLongProps.episodes.length);
  });

  it("formats times", () => {
    expect(formatChapterTime(0, 30)).toBe("00:00");
    expect(formatChapterTime(30 * 65, 30)).toBe("01:05");
  });
});
