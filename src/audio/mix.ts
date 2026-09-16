/**
 * Assemble section clips into the final voice track: loudness-normalised, evenly spaced with
 * short silences. Music is layered at render time inside Remotion (see MusicBed), which ducks it
 * under speech — so no ffmpeg mixing step is needed.
 */
import { concat, normalizeLoudness, silence, type PcmAudio } from "./wav";
import { SECTION_GAP_MS } from "./estimateTimings";

export const LEAD_IN_MS = 250;

export type MixedVoice = {
  track: PcmAudio;
  /** Absolute start of each section (ms) within the track. */
  starts: number[];
};

export function mixSections(sections: PcmAudio[], gapMs = SECTION_GAP_MS, leadInMs = LEAD_IN_MS): MixedVoice {
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
      parts.push(silence(gapMs, sr));
      cursor += gapMs;
    }
  });
  parts.push(silence(400, sr));
  return { track: { samples: concat(parts), sampleRate: sr }, starts };
}
