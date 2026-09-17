/**
 * Assemble section clips into the final voice track: loudness-normalised, evenly spaced with
 * short silences. Music is layered at render time inside Remotion (see MusicBed), which ducks it
 * under speech — so no ffmpeg mixing step is needed.
 */
import { concat, normalizeLoudness, silence, type PcmAudio } from "./wav";
import { SECTION_GAP_MS } from "./estimateTimings";

/** Room for the 1-second signature jingle before Bolt starts talking. */
export const LEAD_IN_MS = 800;

export type MixedVoice = {
  track: PcmAudio;
  /** Absolute start of each section (ms) within the track. */
  starts: number[];
};

/** `extraGapAfterMs[i]` adds silence after section i (used for the guess pause after the hook). */
export function mixSections(sections: PcmAudio[], gapMs = SECTION_GAP_MS, leadInMs = LEAD_IN_MS, extraGapAfterMs: number[] = []): MixedVoice {
  const sr = sections[0]?.sampleRate ?? 24000;
  const parts: Float32Array[] = [silence(leadInMs, sr)];
  const starts: number[] = [];
  let cursor = leadInMs;
  sections.forEach((s, i) => {
    if (s.sampleRate !== sr) throw new Error("All sections must share a sample rate");
    starts.push(cursor);
    const norm = normalizeLoudness(s.samples);
    parts.push(norm);
    cursor += Math.round((norm.length / sr) * 1000);
    if (i < sections.length - 1) {
      const g = gapMs + (extraGapAfterMs[i] ?? 0);
      parts.push(silence(g, sr));
      cursor += g;
    }
  });
  parts.push(silence(400, sr));
  return { track: { samples: concat(parts), sampleRate: sr }, starts };
}
