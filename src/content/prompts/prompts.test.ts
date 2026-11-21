import { describe, expect, it } from "vitest";
import { getPrompts } from "./index";
import { en } from "./en";
import { enTech } from "./enTech";
import { defaultLimits } from "./en";

describe("prompt sets", () => {
  it("selects the explainer set by language and the tech set by persona promptSet", () => {
    expect(getPrompts("en", "explainer")).toBe(en);
    expect(getPrompts("en", "tech")).toBe(enTech);
    expect(() => getPrompts("hi", "tech")).toThrow(/No "tech" prompts/);
  });

  it("tech prompts feed the source notes to writer and reviewer and forbid links in the script", () => {
    const ctx = {
      characterName: "Kenil",
      channelName: "60-Second AI",
      characterBio: "a developer",
      characterVoice: "plainly",
      audience: "general" as const,
      audienceDescription: "developers",
      experimentGuide: "one command",
      experimentLabel: "Try it",
      extraRules: [],
      language: "en",
      gags: false,
      catchphrase: "Go build.",
      bannedWords: ["damn"],
      hazardWords: [],
      askGrownUp: "",
      ...defaultLimits(),
    };
    const topic = { id: "gh-a-b", question: "What is b?", category: "tech" as const, difficulty: 1 as const, notes: "Repository: a/b\nREADME excerpt:\nDoes X.", sourceUrl: "https://github.com/a/b", sourceName: "a/b" };
    const user = enTech.writerUser(topic, ctx);
    expect(user).toContain("SOURCE NOTES");
    expect(user).toContain("Does X.");
    expect(enTech.writerSystem(ctx)).toMatch(/Never put a URL in the script/);
    expect(enTech.reviewerUser(topic, "{}")).toContain("Does X.");
  });
});
