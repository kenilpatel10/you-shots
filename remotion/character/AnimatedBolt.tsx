import React from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { Bolt, type BoltProps } from "./Bolt";

/** Deterministic blink schedule: blinks every 2–5s with a 5-frame close/open. */
export function isBlinking(frame: number, fps: number, seed: string): boolean {
  const blinkFrames = 5;
  let t = Math.round(fps * (1.2 + random(`${seed}-0`) * 2));
  let i = 1;
  while (t <= frame + blinkFrames) {
    if (frame >= t && frame < t + blinkFrames) return true;
    t += Math.round(fps * (2 + random(`${seed}-${i}`) * 3));
    i++;
    if (i > 10_000) break;
  }
  return false;
}

export type AnimatedBoltProps = Omit<BoltProps, "blink" | "bob" | "armWaveDeg"> & {
  seed?: string;
  /** Amplitude of the idle bob in SVG units. */
  bobAmount?: number;
  /** Start frame of the animation cycle (so seeded blinks differ per scene). */
  startFrame?: number;
};

/**
 * Bolt with idle life: gentle bob, seeded blinking, a waving forearm in the wave pose
 * and a soft antenna pulse when glowing.
 */
export const AnimatedBolt: React.FC<AnimatedBoltProps> = ({ seed = "bolt", bobAmount = 6, startFrame = 0, ...props }) => {
  const frame = useCurrentFrame() + startFrame;
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const bob = Math.sin((t * Math.PI * 2) / 2.6) * bobAmount;
  const blink = isBlinking(frame, fps, seed);
  const armWaveDeg = props.pose === "wave" ? Math.sin(t * Math.PI * 2 * 1.6) * 22 : 0;
  const glowBase = props.antennaGlow ?? 0;
  const antennaGlow = glowBase > 0 ? glowBase * (0.85 + 0.15 * Math.sin(t * Math.PI * 2 * 1.2)) : 0;
  return <Bolt {...props} bob={bob} blink={blink} armWaveDeg={armWaveDeg} antennaGlow={antennaGlow} />;
};
