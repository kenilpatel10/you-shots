/**
 * eSpeak-NG via `text2wav` (self-contained, 100+ languages including Hindi, pure JS/WASM, voices
 * inside the npm package — no downloads). Clearly robotic but intelligible: the offline fallback
 * for dry runs, or a deliberate choice via config (voice.engine = "espeak").
 */
import { createRequire } from "node:module";
import { decodeWav, fadeEdges, resample, trimSilence, type PcmAudio } from "./wav";

const require = createRequire(import.meta.url);
type Text2Wav = (text: string, opts: { voice?: string; speed?: number; pitch?: number; amplitude?: number; wordGap?: number }) => Promise<Uint8Array>;

export type EspeakOptions = { voice?: string; wpm?: number; pitch?: number; wordgap?: number };

export async function synthesizeEspeak(text: string, opts: EspeakOptions = {}): Promise<PcmAudio> {
  const text2wav = require("text2wav") as Text2Wav;
  const warn = console.warn;
  console.warn = () => undefined; // text2wav logs a harmless "wasm streaming compile failed" fallback
  try {
    const out = await text2wav(text, { voice: opts.voice ?? "en-us", speed: opts.wpm ?? 145, pitch: opts.pitch ?? 55, amplitude: 100, wordGap: opts.wordgap ?? 2 });
    const wav = decodeWav(Buffer.from(out));
    const r = resample(wav, 24000);
    return { samples: fadeEdges(trimSilence(r.samples, r.sampleRate, 0.005, 60), r.sampleRate), sampleRate: r.sampleRate };
  } finally {
    console.warn = warn;
  }
}
