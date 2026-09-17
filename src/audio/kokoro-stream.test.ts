import { describe, expect, it } from "vitest";
import { TextSplitterStream } from "kokoro-js";

/**
 * Regression for the silent exit seen on GitHub Actions: kokoro-js's stream() with a plain string
 * never closes its splitter, so the async iterator waits forever after the last sentence.
 * tts.ts pushes + closes the splitter itself; this pins down the behaviour we rely on.
 */
describe("kokoro TextSplitterStream", () => {
  const text = "Why is the sky blue? Sunlight is made of every colour. Blue bounces the most!";

  it("yields every sentence, including the last one, once closed", async () => {
    const splitter = new TextSplitterStream();
    splitter.push(text);
    splitter.close();
    const out: string[] = [];
    for await (const s of splitter) out.push(s);
    expect(out).toEqual(["Why is the sky blue?", "Sunlight is made of every colour.", "Blue bounces the most!"]);
  });

  it("never finishes when left open (the bug we work around)", async () => {
    const splitter = new TextSplitterStream();
    splitter.push(text);
    const out: string[] = [];
    const iter = (async () => {
      for await (const s of splitter) out.push(s);
      return "done";
    })();
    const timeout = new Promise<string>((r) => setTimeout(() => r("timeout"), 200));
    expect(await Promise.race([iter, timeout])).toBe("timeout");
    expect(out.length).toBeLessThan(3);
    splitter.close(); // let the dangling iterator finish so vitest can exit
    await iter;
  });
});
