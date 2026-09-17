import { describe, expect, it } from "vitest";
import { decodeL16, parseL16Rate } from "./geminiTts";

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
