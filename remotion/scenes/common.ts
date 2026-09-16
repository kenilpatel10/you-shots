import type { ChannelProps, ScriptProps, SectionTiming } from "../schema";

export type SceneProps = {
  section: SectionTiming;
  script: ScriptProps;
  channel: ChannelProps;
  layout: {
    card: { left: number; top: number; width: number };
    badge: { left: number; top: number };
    signoff: { left: number; top: number; width: number };
  };
  /** Frames this scene stays on screen (for exit timing). */
  durationInFrames: number;
  /** Max on-screen text size; smaller in the landscape layout. */
  maxFontSize?: number;
};
