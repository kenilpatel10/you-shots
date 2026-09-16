/**
 * Frame plan for the weekly compilation. Pure and browser-safe so the CLI can compute YouTube
 * chapter timestamps with exactly the same numbers the composition renders.
 */
import { CHAPTER_CARD_FRAMES, INTRO_FRAMES, OUTRO_FRAMES, type LongVideoProps, type Timeline } from "../schema";

export type PlannedEpisode = { index: number; chapterFrom: number; from: number; durationInFrames: number };

export function planLongVideo(props: Pick<LongVideoProps, "episodes">): { episodes: PlannedEpisode[]; outroFrom: number; totalFrames: number } {
  let cursor = INTRO_FRAMES;
  const episodes: PlannedEpisode[] = props.episodes.map((ep, index) => {
    const chapterFrom = cursor;
    const from = chapterFrom + CHAPTER_CARD_FRAMES;
    const durationInFrames = ep.timeline.totalFrames;
    cursor = from + durationInFrames;
    return { index, chapterFrom, from, durationInFrames };
  });
  return { episodes, outroFrom: cursor, totalFrames: cursor + OUTRO_FRAMES };
}

/** A timeline covering every spoken span in the long video (for music ducking). */
export function mergedTimeline(props: Pick<LongVideoProps, "episodes">, fps: number): Timeline {
  const plan = planLongVideo(props);
  const sections = props.episodes.flatMap((ep, i) => {
    const offsetMs = (plan.episodes[i]!.from / fps) * 1000;
    return ep.timeline.sections.map((s) => ({
      ...s,
      startMs: s.startMs + offsetMs,
      endMs: s.endMs + offsetMs,
      words: s.words.map((w) => ({ ...w, startMs: w.startMs + offsetMs, endMs: w.endMs + offsetMs })),
    }));
  });
  return { fps, totalFrames: plan.totalFrames, sections, timingSource: "estimated" };
}

export function formatChapterTime(frame: number, fps: number): string {
  const total = Math.floor(frame / fps);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** YouTube chapter list for the description (first chapter must be 00:00, each ≥ 10 s). */
export function chapterList(props: Pick<LongVideoProps, "episodes" | "weekTitle" | "outro">, fps: number): string {
  const plan = planLongVideo(props);
  const lines = [`00:00 ${props.weekTitle}`];
  for (const ep of plan.episodes) lines.push(`${formatChapterTime(ep.chapterFrom, fps)} ${props.episodes[ep.index]!.chapterTitle}`);
  lines.push(`${formatChapterTime(plan.outroFrom, fps)} ${props.outro}`);
  return lines.join("\n");
}
