import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeL16, DEFAULT_GEMINI_TTS_MODELS, parseL16Rate, synthesizeGemini } from "./geminiTts";

describe("gemini tts helpers", () => {
  it("parses the sample rate from both mime spellings", () => {
    expect(parseL16Rate("audio/L16;codec=pcm;rate=24000")).toBe(24000);
    expect(parseL16Rate("audio/l16; rate=16000; channels=1")).toBe(16000);
    expect(() => parseL16Rate("audio/mpeg")).toThrow();
  });
  it("decodes signed 16-bit little-endian PCM", () => {
    const buf = Buffer.alloc(6);
    buf.writeInt16LE(0, 0);
    buf.writeInt16LE(16384, 2);
    buf.writeInt16LE(-32768, 4);
    expect(Array.from(decodeL16(buf))).toEqual([0, 0.5, -1]);
  });
});

describe("gemini tts model chain", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("moves to the next model when one answers 200 without audio", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    const pcm = Buffer.alloc(2400 * 2); // 0.1 s of silence at 24 kHz
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const model = DEFAULT_GEMINI_TTS_MODELS.find((m) => url.includes(m)) ?? "?";
        calls.push(model);
        const body =
          calls.length === 1
            ? { candidates: [{ content: { parts: [{ text: "" }] } }] }
            : { candidates: [{ content: { parts: [{ inlineData: { mimeType: "audio/L16;codec=pcm;rate=24000", data: pcm.toString("base64") } }] } }] };
        return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
      }),
    );
    const out = await synthesizeGemini("नमस्ते", { voice: "Leda" });
    expect(out.sampleRate).toBe(24000);
    expect(calls.slice(0, 2)).toEqual(DEFAULT_GEMINI_TTS_MODELS.slice(0, 2));
  });
});
