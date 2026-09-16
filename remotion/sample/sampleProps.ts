/**
 * Sample props so Remotion Studio and the CI smoke render work without running the pipeline.
 * Uses the first hand-checked fallback script with estimated timings and no audio.
 */
import channel from "../../config/channel.json";
import script from "../../data/fallback-scripts/001-why-is-the-sky-blue.json";
import { estimateTimeline, type ExpressionCue } from "../../src/content/timeline";
import { FPS } from "../theme";
import type { ChannelProps, ShortProps } from "../schema";

const lang = channel.languages[channel.language as keyof typeof channel.languages];

export const sampleChannel: ChannelProps = {
  name: channel.name,
  handle: channel.handle,
  characterName: channel.characterName,
  catchphrase: lang.catchphrase,
  askGrownUp: lang.askGrownUp,
  language: channel.language,
};

export const sampleShortProps: ShortProps = {
  script: {
    topicId: script.topicId,
    title: script.title,
    hook: script.hook,
    answer: script.answer,
    wowFact: script.wowFact,
    experiment: script.experiment,
    signOff: script.signOff,
    onScreenText: script.onScreenText,
    background: script.background,
    guess: script.guess,
  },
  channel: sampleChannel,
  timeline: estimateTimeline(script, FPS, script.expressionCues as ExpressionCue[], true),
  audio: { voice: "", musicVolume: channel.music.volume, duckedVolume: channel.music.duckedVolume, fadeSeconds: channel.music.fadeSeconds },
};
