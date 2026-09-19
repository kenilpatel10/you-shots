import { afterEach, describe, expect, it } from "vitest";
import { channelIdentity, configuredChannels, listPersonas, loadPersonaConfig } from "./config";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("personas", () => {
  it("lists the default persona plus every config/personas/*.json", () => {
    const list = listPersonas();
    expect(list[0]).toBe("bolt-pip");
    expect(list).toContain("ncert-science");
    expect(list).toContain("demo-coaching");
  });

  it("loads a persona with its audience, files and identity", () => {
    const cfg = loadPersonaConfig("ncert-science", "hi");
    expect(cfg.persona).toBe("ncert-science");
    expect(cfg.audience).toBe("general");
    expect(cfg.topicsFile).toMatch(/ncert-science\/topics\.json$/);
    expect(cfg.bannedWordsFile).toMatch(/banned-words-general\.json$/);
    const id = channelIdentity(cfg, "hi");
    expect(id.name).toBe("60 सेकंड विज्ञान");
    expect(cfg.languages.hi?.labels.experiment).toBe("परीक्षा टिप");
    expect(cfg.brand.primary).toBe("#2FA36B");
  });

  it("keeps the default persona as before", () => {
    const cfg = loadPersonaConfig("bolt-pip", "en");
    expect(cfg.audience).toBe("kids");
    expect(cfg.topicsFile).toBe("data/topics.json");
    expect(cfg.brand).toEqual({});
  });

  it("rejects unknown personas and languages", () => {
    expect(() => loadPersonaConfig("nope", "en")).toThrow(/No persona/);
    expect(() => loadPersonaConfig("ncert-science", "ta")).toThrow(/no entry/);
  });

  it("parses CHANNELS as persona/lang pairs, with bare languages meaning the default persona", () => {
    process.env.CHANNELS = '["bolt-pip/en","ncert-science/hi","hi"]';
    expect(configuredChannels()).toEqual([
      { persona: "bolt-pip", language: "en" },
      { persona: "ncert-science", language: "hi" },
      { persona: "bolt-pip", language: "hi" },
    ]);
  });
});
