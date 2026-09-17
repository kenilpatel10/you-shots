/**
 * eSpeak-NG via `mespeak` (pure JS, voices bundled in the npm package, no downloads). Clearly
 * robotic but perfectly intelligible — a real offline voice for dry runs on machines that cannot
 * reach Hugging Face, or a deliberate choice via config (voice.engine = "espeak").
 */
import { createRequire } from "node:module";
import { decodeWav, fadeEdges, resample, trimSilence, type PcmAudio } from "./wav";

const require = createRequire(import.meta.url);

type MeSpeak = {
  loadConfig: (cfg: unknown) => void;
  loadVoice: (voice: unknown) => void;
  speak: (text: string, opts: Record<string, unknown>) => Buffer;
};

let engine: MeSpeak | null = null;

function load(): MeSpeak {
  if (!engine) {
    const m = require("mespeak") as MeSpeak;
    m.loadConfig(require("mespeak/src/mespeak_config.json"));
    m.loadVoice(require("mespeak/voices/en/en-us.json"));
    engine = m;
  }
  return engine;
}

export type EspeakOptions = { wpm?: number; pitch?: number; wordgap?: number };

export function synthesizeEspeak(text: string, opts: EspeakOptions = {}): PcmAudio {
  const m = load();
  const buf = m.speak(text, { rawdata: "buffer", speed: opts.wpm ?? 150, pitch: opts.pitch ?? 55, amplitude: 100, wordgap: opts.wordgap ?? 2 });
  const wav = decodeWav(Buffer.from(buf));
  const out = resample(wav, 24000);
  return { samples: fadeEdges(trimSilence(out.samples, out.sampleRate, 0.005, 60), out.sampleRate), sampleRate: out.sampleRate };
}
