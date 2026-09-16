import { describe, expect, it } from "vitest";
import { listFallbackScripts } from "./fallback";
import { validateScript } from "./validate";

describe("fallback scripts", () => {
  it("has at least 14 scripts that all pass the deterministic validator", async () => {
    const all = await listFallbackScripts();
    expect(all.length).toBeGreaterThanOrEqual(14);
    const failures = all.map((f) => ({ file: f.file, r: validateScript(f.script) })).filter((x) => !x.r.ok);
    expect(failures.map((f) => `${f.file}: ${(f.r as { reasons: string[] }).reasons.join("; ")}`)).toEqual([]);
    expect(new Set(all.map((f) => f.script.topicId)).size).toBe(all.length);
  });
});
