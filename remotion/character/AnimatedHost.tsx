import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { isBlinking } from "./AnimatedBolt";
import { Host, type HostProps } from "./Host";

export type AnimatedHostProps = Omit<HostProps, "blink" | "bob" | "armWaveDeg"> & { seed?: string; bobAmount?: number; startFrame?: number };

/** The host with idle life: a gentle breathing bob, seeded blinks, a waving hand in the wave pose. */
export const AnimatedHost: React.FC<AnimatedHostProps> = ({ seed = "host", bobAmount = 4, startFrame = 0, ...props }) => {
  const frame = useCurrentFrame() + startFrame;
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const bob = Math.sin((t * Math.PI * 2) / 3.1) * bobAmount;
  const blink = isBlinking(frame, fps, seed);
  const armWaveDeg = props.pose === "wave" ? Math.sin(t * Math.PI * 2 * 1.6) * 22 : 0;
  const glowBase = props.antennaGlow ?? 0;
  const antennaGlow = glowBase > 0 ? glowBase * (0.85 + 0.15 * Math.sin(t * Math.PI * 2 * 1.2)) : 0;
  return <Host {...props} bob={bob} blink={blink} armWaveDeg={armWaveDeg} antennaGlow={antennaGlow} />;
};
