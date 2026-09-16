import { describe, expect, it } from "vitest";
import { mixSections } from "./mix";
import { decodeWav, encodeWav, normalizeLoudness, resample, rms } from "./wav";

const tone = (seconds: number, amp: number, sr = 24000) => {
  const s = new Float32Array(Math.round(seconds * sr));
  for (let i = 0; i < s.length; i++) s[i] = amp * Math.sin((2 * Math.PI * 220 * i) / sr);
  return { samples: s, sampleRate: sr };
};

describe("audio utilities", () => {
  it("round-trips WAV encoding", () => {
    const a = tone(0.1, 0.5);
    const back = decodeWav(encodeWav(a));
    expect(back.sampleRate).toBe(24000);
    expect(back.samples.length).toBe(a.samples.length);
    expect(Math.abs(back.samples[100]! - a.samples[100]!)).toBeLessThan(1e-3);
  });

  it("normalises quiet and loud clips to the same loudness without clipping", () => {
    const quiet = normalizeLoudness(tone(0.5, 0.05).samples);
    const loud = normalizeLoudness(tone(0.5, 0.9).samples);
    expect(Math.abs(rms(quiet) - rms(loud))).toBeLessThan(0.01);
    for (const v of loud) expect(Math.abs(v)).toBeLessThanOrEqual(0.95 + 1e-6);
  });

  it("resamples to 16 kHz", () => {
    const r = resample(tone(1, 0.5), 16000);
    expect(r.sampleRate).toBe(16000);
    expect(r.samples.length).toBe(16000);
  });

  it("mixes sections with gaps and reports section starts", () => {
    const { track, starts } = mixSections([tone(1, 0.3), tone(0.5, 0.3)], 380, 250);
    expect(starts).toEqual([250, 250 + 1000 + 380]);
    expect(track.samples.length).toBe(Math.round(((250 + 1000 + 380 + 500 + 400) / 1000) * 24000));
  });

  it("adds an extra pause after a chosen section", () => {
    const { starts } = mixSections([tone(1, 0.3), tone(0.5, 0.3)], 380, 250, [2600]);
    expect(starts).toEqual([250, 250 + 1000 + 380 + 2600]);
  });
});
