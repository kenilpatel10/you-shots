import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { draftForDate, emptyState, langState, loadState, makeDraftId, migrateState, saveState, transition, TransitionError, upsertDraft, withLangState, type Draft } from "./state";

const now = new Date("2026-09-16T05:00:00Z");
const base: Draft = {
  id: "short-2026-09-16-animals-001",
  kind: "short",
  topicId: "animals-001",
  date: "2026-09-16",
  language: "en",
  title: "Why do cats purr?",
  status: "drafted",
  source: "llm",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  assets: {},
  reviewerIssues: [],
  includes: [],
  tags: [],
};

describe("state transitions", () => {
  it("drafted → approved → uploaded", () => {
    let s = upsertDraft(emptyState(), base);
    s = transition(s, base.id, "approved", {}, now);
    expect(s.drafts[0]?.status).toBe("approved");
    expect(s.drafts[0]?.approvedAt).toBe(now.toISOString());
    s = transition(s, base.id, "uploaded", { youtubeVideoId: "abc" }, now);
    expect(s.drafts[0]?.status).toBe("uploaded");
    expect(s.drafts[0]?.youtubeVideoId).toBe("abc");
  });

  it("rejects invalid transitions", () => {
    let s = upsertDraft(emptyState(), base);
    expect(() => transition(s, base.id, "uploaded")).toThrow(TransitionError);
    s = transition(s, base.id, "rejected", { rejectReason: "too long" });
    expect(() => transition(s, base.id, "approved")).toThrow(TransitionError);
    expect(() => transition(s, "nope", "approved")).toThrow(TransitionError);
  });

  it("failed uploads can be re-approved", () => {
    let s = upsertDraft(emptyState(), base);
    s = transition(s, base.id, "approved");
    s = transition(s, base.id, "failed", { failureReason: "quota" });
    s = transition(s, base.id, "approved");
    expect(s.drafts[0]?.status).toBe("approved");
  });

  it("draftForDate ignores rejected drafts", () => {
    let s = upsertDraft(emptyState(), base);
    expect(draftForDate(s, "2026-09-16")?.id).toBe(base.id);
    s = transition(s, base.id, "rejected");
    expect(draftForDate(s, "2026-09-16")).toBeUndefined();
  });

  it("round-trips through disk and fills defaults", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "bolt-state-"));
    const file = path.join(dir, "state.json");
    expect((await loadState(file)).drafts).toEqual([]);
    const s = upsertDraft(emptyState(), base);
    await saveState(s, file);
    const back = await loadState(file);
    expect(back.drafts[0]?.id).toBe(base.id);
    expect(back.lastTelegramUpdateId).toBeNull();
  });

  it("migrates a v1 state file into per-language bookkeeping", () => {
    const v1 = {
      version: 1,
      usedTopicIds: ["a"],
      redoTopicIds: ["b"],
      usedFallbackScripts: ["001.json"],
      weeklyCompiled: ["2026-W37"],
      drafts: [base],
      lastTelegramUpdateId: 7,
    };
    const s = migrateState(v1);
    expect(s.version).toBe(2);
    expect(langState(s, "en")).toEqual({
      usedTopicIds: ["a"],
      redoTopicIds: ["b"],
      usedFallbackScripts: ["001.json"],
      weeklyCompiled: ["2026-W37"],
    });
    expect(langState(s, "hi").usedTopicIds).toEqual([]);
    expect(s.lastTelegramUpdateId).toBe(7);
    expect(s.drafts[0]?.id).toBe(base.id);
  });

  it("keeps topic history separate per language", () => {
    let s = withLangState(emptyState(), "en", { usedTopicIds: ["ocean-001"] });
    s = withLangState(s, "hi", { usedTopicIds: ["ocean-002"] });
    expect(langState(s, "en").usedTopicIds).toEqual(["ocean-001"]);
    expect(langState(s, "hi").usedTopicIds).toEqual(["ocean-002"]);
    expect(draftForDate(upsertDraft(s, base), "2026-09-16", "short", "hi")).toBeUndefined();
    expect(draftForDate(upsertDraft(s, base), "2026-09-16", "short", "en")?.id).toBe(base.id);
  });

  it("puts the language into draft ids", () => {
    expect(makeDraftId("short", "2026-09-19", "ocean-002", "hi")).toBe("short-2026-09-19-hi-ocean-002");
    expect(makeDraftId("weekly", "2026-W38", "", "en")).toBe("weekly-2026-W38-en");
  });
});
