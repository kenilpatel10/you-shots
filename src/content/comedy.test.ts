import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GUESTS, guestFor, guestName } from "../../remotion/guests";
import { CATEGORIES, ScriptSchema, sectionSpokenText } from "./schema";
import { buildTimeline } from "./timeline";
import { validateScript } from "./validate";
import { FALLBACK_DIR } from "../lib/paths";

const sample = JSON.parse(readFileSync(path.join(FALLBACK_DIR, "002-why-do-cats-purr.json"), "utf8"));

describe("comedy beats", () => {
  it("has a guest for every topic category, named in both languages", () => {
    for (const c of CATEGORIES) {
      expect(GUESTS[c]).toBeDefined();
      expect(guestName(c, "en")).toMatch(/\w/);
      expect(guestName(c, "hi")).toMatch(/[ऀ-ॿ]/);
    }
    expect(guestFor("nope").kind).toBe("gear");
  });

  it("accepts a gag and a silly guess, and speaks the gag with the wow fact", () => {
    const s = ScriptSchema.parse(sample);
    expect(s.gag?.reaction).toBe("laugh");
    expect(s.guess?.silly).toBe(2);
    expect(sectionSpokenText(s, "wowFact")).toContain(s.gag!.line);
    expect(validateScript(sample)).toMatchObject({ ok: true });
  });

  it("rejects a silly index that is the right answer and gag lines that ramble", () => {
    const r1 = validateScript({ ...sample, guess: { ...sample.guess, silly: sample.guess.answer } });
    expect(r1.ok).toBe(false);
    const r2 = validateScript({ ...sample, gag: { line: "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen", reaction: "wow" } });
    expect(r2.ok).toBe(false);
  });

  it("places the gag window inside the wow-fact section", () => {
    const t = buildTimeline({
      fps: 30,
      sections: [
        { key: "hook", text: "a b", durationMs: 1000 },
        { key: "answer", text: "a b", durationMs: 1000 },
        { key: "wowFact", text: "a b c d", durationMs: 4000, gagOffsetMs: 2500 },
        { key: "experiment", text: "a b", durationMs: 1000 },
        { key: "signOff", text: "a", durationMs: 500 },
      ],
    });
    const wow = t.sections.find((s) => s.key === "wowFact")!;
    expect(wow.gag).toEqual({ startMs: wow.startMs + 2500, endMs: wow.endMs });
    expect(t.sections.find((s) => s.key === "hook")!.gag).toBeUndefined();
  });
});
