/**
 * Builds the render timeline from per-section audio durations and word timings.
 * Pure and browser-safe (imported by Remotion for Studio samples too).
 */
import { GUESS_PAUSE_MS, SIGNOFF_TAIL_FRAMES, type SectionKey, type SectionTiming, type Timeline, type WordTiming } from "../../remotion/schema";
import { sectionSpokenText } from "./schema";
import { estimateSectionDurationMs, estimateWordTimings, SECTION_GAP_MS, SECTION_ORDER } from "../audio/estimateTimings";

export type SectionInput = {
  key: SectionKey;
  text: string;
  /** Duration of this section's audio in ms. */
  durationMs: number;
  /** Word timings relative to the section start (optional → estimated). */
  words?: WordTiming[];
};

export type ExpressionCue = { section: SectionKey; expression: "curious" | "happy" | "surprised" | "thinking" | "excited" };

const DEFAULT_POSE: Record<SectionKey, SectionTiming["pose"]> = {
  hook: "idle",
  answer: "point",
  wowFact: "jump",
  experiment: "think",
  signOff: "wave",
};

const DEFAULT_EXPRESSION: Record<SectionKey, SectionTiming["expression"]> = {
  hook: "curious",
  answer: "happy",
  wowFact: "surprised",
  experiment: "excited",
  signOff: "happy",
};

export function buildTimeline(opts: {
  sections: SectionInput[];
  fps: number;
  expressionCues?: ExpressionCue[];
  gapMs?: number;
  grownUp?: boolean;
  timingSource?: Timeline["timingSource"];
  tailFrames?: number;
  /** Extra silence after the hook for the guess bubbles (0 when the script has no guess). */
  guessPauseMs?: number;
}): Timeline {
  const gap = opts.gapMs ?? SECTION_GAP_MS;
  let cursor = 0;
  const sections: SectionTiming[] = [];
  for (const s of opts.sections) {
    const startMs = cursor;
    const endMs = startMs + s.durationMs;
    const words = (s.words ?? estimateWordTimings(s.text, 0, s.durationMs)).map((w) => ({
      text: w.text,
      startMs: startMs + w.startMs,
      endMs: startMs + w.endMs,
    }));
    const cue = opts.expressionCues?.find((c) => c.section === s.key);
    sections.push({
      key: s.key,
      startMs,
      endMs,
      words,
      pose: DEFAULT_POSE[s.key],
      expression: cue?.expression ?? DEFAULT_EXPRESSION[s.key],
      grownUp: s.key === "experiment" && (opts.grownUp ?? false),
    });
    cursor = endMs + gap;
    if (s.key === "hook" && opts.guessPauseMs) cursor += opts.guessPauseMs;
  }
  const lastEnd = sections.length ? sections[sections.length - 1]!.endMs : 0;
  const tail = opts.tailFrames ?? SIGNOFF_TAIL_FRAMES;
  const totalFrames = Math.ceil((lastEnd / 1000) * opts.fps) + tail;
  const timeline: Timeline = { fps: opts.fps, totalFrames, sections, timingSource: opts.timingSource ?? "estimated" };
  if (opts.guessPauseMs) {
    const hook = sections.find((s) => s.key === "hook");
    const answer = sections.find((s) => s.key === "answer");
    if (hook && answer) timeline.guess = { startMs: hook.endMs + 150, endMs: answer.startMs };
  }
  return timeline;
}

/** Timeline with purely estimated durations (no audio yet). */
export function estimateTimeline(script: Record<SectionKey, string> & { guess?: { prompt: string } | undefined }, fps: number, cues?: ExpressionCue[], grownUp = false): Timeline {
  return buildTimeline({
    fps,
    expressionCues: cues,
    grownUp,
    guessPauseMs: script.guess ? GUESS_PAUSE_MS : 0,
    sections: SECTION_ORDER.map((key) => {
      const text = sectionSpokenText(script, key);
      return { key, text, durationMs: estimateSectionDurationMs(text) };
    }),
  });
}

export function timelineDurationSeconds(t: Timeline): number {
  return t.totalFrames / t.fps;
}
