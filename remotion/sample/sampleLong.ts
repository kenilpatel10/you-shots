import channel from "../../config/channel.json";
import s1 from "../../data/fallback-scripts/001-why-is-the-sky-blue.json";
import s2 from "../../data/fallback-scripts/002-why-do-cats-purr.json";
import s3 from "../../data/fallback-scripts/003-why-does-the-moon-change-shape.json";
import { estimateTimeline, type ExpressionCue } from "../../src/content/timeline";
import type { LongEpisode, LongVideoProps, ThumbnailProps } from "../schema";
import { FPS } from "../theme";
import { sampleChannel } from "./sampleProps";

const lang = channel.languages[channel.language as keyof typeof channel.languages];

const episode = (s: typeof s1, i: number): LongEpisode => ({
  draftId: `sample-${i}`,
  chapterTitle: s.title,
  script: { topicId: s.topicId, title: s.title, hook: s.hook, answer: s.answer, wowFact: s.wowFact, experiment: s.experiment, signOff: s.signOff, onScreenText: s.onScreenText, background: s.background, guess: s.guess },
  timeline: estimateTimeline(s, FPS, s.expressionCues as ExpressionCue[], true),
  audio: { voice: "", musicVolume: 0.12, duckedVolume: 0.04, fadeSeconds: 1.5 },
});

export const sampleLongProps: LongVideoProps = {
  channel: sampleChannel,
  weekTitle: lang.weeklyTitle,
  outro: lang.weeklyOutro,
  episodes: [episode(s1, 1), episode(s2, 2), episode(s3, 3)],
  musicVolume: channel.music.volume,
  duckedVolume: channel.music.duckedVolume,
};

export const sampleThumbnailProps: ThumbnailProps = { channel: sampleChannel, words: ["Why is", "the sky", "BLUE?"], background: "weather-nature" };
