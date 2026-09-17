/**
 * Props contract between the Node pipeline (src/) and the Remotion compositions (remotion/).
 * Browser-safe: no Node imports here.
 */
import { z } from "zod";

export const SectionKeyZ = z.enum(["hook", "answer", "wowFact", "experiment", "signOff"]);
export type SectionKey = z.infer<typeof SectionKeyZ>;

export const PoseZ = z.enum(["idle", "wave", "point", "think", "jump"]);
export const ExpressionZ = z.enum(["neutral", "curious", "happy", "surprised", "thinking", "excited"]);

export const WordTimingZ = z.object({
  text: z.string(),
  /** Milliseconds from the start of the whole voice track. */
  startMs: z.number(),
  endMs: z.number(),
});
export type WordTiming = z.infer<typeof WordTimingZ>;

export const SectionTimingZ = z.object({
  key: SectionKeyZ,
  startMs: z.number(),
  endMs: z.number(),
  words: z.array(WordTimingZ),
  pose: PoseZ,
  expression: ExpressionZ,
  /** Show the "ask a grown-up" badge (experiment only). */
  grownUp: z.boolean().default(false),
});
export type SectionTiming = z.infer<typeof SectionTimingZ>;

export const TimelineZ = z.object({
  fps: z.number().int().positive(),
  totalFrames: z.number().int().positive(),
  sections: z.array(SectionTimingZ),
  /** Where the word timings came from — shown nowhere, but useful for QA. */
  timingSource: z.enum(["whisper", "estimated"]).default("estimated"),
  /** Silent "guess" window between the hook and the answer (only when script.guess exists). */
  guess: z.object({ startMs: z.number(), endMs: z.number() }).optional(),
});
export type Timeline = z.infer<typeof TimelineZ>;

export const ScriptZ = z.object({
  topicId: z.string(),
  title: z.string(),
  hook: z.string(),
  answer: z.string(),
  wowFact: z.string(),
  experiment: z.string(),
  signOff: z.string(),
  onScreenText: z.object({ hook: z.string(), answer: z.string(), wowFact: z.string(), experiment: z.string() }),
  background: z.string(),
  guess: z.object({ prompt: z.string(), options: z.array(z.string()).length(3), answer: z.number().int().min(0).max(2) }).optional(),
});
export type ScriptProps = z.infer<typeof ScriptZ>;

export const ChannelPropsZ = z.object({
  name: z.string(),
  handle: z.string(),
  characterName: z.string(),
  catchphrase: z.string(),
  askGrownUp: z.string(),
  language: z.string(),
  feelings: z.record(z.string(), z.string()).default({}),
  sidekickName: z.string().default("Pip"),
  labels: z.record(z.string(), z.string()).default({}),
});
export type ChannelProps = z.infer<typeof ChannelPropsZ>;

export const AudioPropsZ = z.object({
  /** Path relative to public/, e.g. drafts/<id>/voice.wav. Empty string = no voice (silent preview). */
  voice: z.string(),
  music: z.string().optional(),
  musicVolume: z.number().min(0).max(1).default(0.14),
  duckedVolume: z.number().min(0).max(1).default(0.045),
  fadeSeconds: z.number().min(0).default(1.5),
  /** Optional soft chimes (public-relative paths). */
  sfx: z.object({ ding: z.string(), pop: z.string(), jingle: z.string().optional() }).optional(),
});

export const ShortPropsZ = z.object({
  script: ScriptZ,
  channel: ChannelPropsZ,
  timeline: TimelineZ,
  audio: AudioPropsZ,
});
export type ShortProps = z.infer<typeof ShortPropsZ>;

export const LongEpisodeZ = z.object({
  draftId: z.string(),
  script: ScriptZ,
  timeline: TimelineZ,
  audio: AudioPropsZ,
  /** Chapter title shown on the title card. */
  chapterTitle: z.string(),
});
export type LongEpisode = z.infer<typeof LongEpisodeZ>;

export const LongVideoPropsZ = z.object({
  channel: ChannelPropsZ,
  weekTitle: z.string(),
  outro: z.string(),
  episodes: z.array(LongEpisodeZ),
  music: z.string().optional(),
  musicVolume: z.number().min(0).max(1).default(0.12),
  duckedVolume: z.number().min(0).max(1).default(0.04),
});
export type LongVideoProps = z.infer<typeof LongVideoPropsZ>;

export const ThumbnailPropsZ = z.object({
  channel: ChannelPropsZ,
  words: z.array(z.string()).min(1).max(4),
  background: z.string(),
});
export type ThumbnailProps = z.infer<typeof ThumbnailPropsZ>;

/* Timing constants shared by the pipeline and the compositions. */
export const INTRO_FRAMES = 30 * 3; // title card before the first episode in the long video
export const CHAPTER_CARD_FRAMES = 30 * 2.5;
export const OUTRO_FRAMES = 30 * 4;
export const SIGNOFF_TAIL_FRAMES = 30 * 2; // wave + channel name after the last word
/** Silent pause after the hook while the three guess bubbles are shown. */
export const GUESS_PAUSE_MS = 2600;
/** Frames at the start of the answer during which the correct bubble is revealed. */
export const REVEAL_FRAMES = 42;
