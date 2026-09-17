import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Pip, type PipProps } from "./Pip";

export type AnimatedPipProps = Omit<PipProps, "flap" | "bob" | "beakOpen" | "tilt"> & {
  /** Chirping (beak moves) while true. */
  talking?: boolean;
  /** Hop animation intensity (0 = calm). */
  excitement?: number;
  seed?: string;
};

/** Pip with life: gentle breathing bob, occasional wing flutter, hops when excited, head tilts when curious. */
export const AnimatedPip: React.FC<AnimatedPipProps> = ({ talking = false, excitement = 0, ...props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const hop = excitement > 0 ? Math.abs(Math.sin(t * Math.PI * 2 * 1.8)) * 8 * excitement : 0;
  const bob = Math.sin(t * Math.PI * 2 * 0.9) * 2 - hop;
  const flutter = (t % 3.1 < 0.5 ? Math.abs(Math.sin(t * Math.PI * 2 * 6)) : 0) * (0.5 + excitement * 0.5) + (excitement > 0 ? 0.3 : 0);
  const tilt = props.mood === "curious" ? Math.sin(t * Math.PI * 2 * 0.5) * 8 - 6 : 0;
  const beakOpen = talking ? 0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI * 2 * 7)) : 0;
  return <Pip {...props} bob={bob} flap={flutter} tilt={tilt} beakOpen={beakOpen} />;
};
