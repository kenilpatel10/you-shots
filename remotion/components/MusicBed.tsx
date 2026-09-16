import React, { useCallback, useMemo } from "react";
import { Audio, interpolate, staticFile, useVideoConfig } from "remotion";
import type { Timeline } from "../schema";

type Props = {
  src: string;
  timeline: Timeline;
  volume: number;
  duckedVolume: number;
  fadeSeconds: number;
  totalFrames: number;
};

/** Looping background music that ducks under speech and fades in/out. */
export const MusicBed: React.FC<Props> = ({ src, timeline, volume, duckedVolume, fadeSeconds, totalFrames }) => {
  const { fps } = useVideoConfig();
  const spans = useMemo(() => timeline.sections.map((s) => [s.startMs - 250, s.endMs + 350] as const), [timeline]);
  const volumeAt = useCallback(
    (frame: number) => {
      const ms = (frame / fps) * 1000;
      // Distance to nearest speech span → smooth duck over ~350ms.
      let d = Infinity;
      for (const [a, b] of spans) {
        if (ms >= a && ms <= b) {
          d = 0;
          break;
        }
        d = Math.min(d, ms < a ? a - ms : ms - b);
      }
      const duck = interpolate(d, [0, 350], [duckedVolume, volume], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const fadeIn = interpolate(frame, [0, fadeSeconds * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const fadeOut = interpolate(frame, [totalFrames - fadeSeconds * fps, totalFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return Math.max(0, duck * fadeIn * fadeOut);
    },
    [fps, spans, duckedVolume, volume, fadeSeconds, totalFrames],
  );
  return <Audio src={staticFile(src)} loop volume={volumeAt} />;
};
