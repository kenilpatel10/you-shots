import React from "react";
import { colors } from "../theme";

export type PipMood = "happy" | "curious" | "surprised" | "cheeky" | "sleepy";

export type PipProps = {
  mood?: PipMood;
  /** 0–1 wing flap. */
  flap?: number;
  /** Small vertical bob in SVG units. */
  bob?: number;
  /** Head tilt in degrees. */
  tilt?: number;
  /** Beak openness 0–1 (chirping). */
  beakOpen?: number;
  size?: number;
  facing?: "left" | "right";
  style?: React.CSSProperties;
  idPrefix?: string;
};

/**
 * Pip — Bolt's tiny yellow bird friend. Round body, big eye, two-feather crest. Pure SVG,
 * identical in every video. Pip is the one who guesses wrong, giggles and cheers.
 */
export const Pip: React.FC<PipProps> = ({ mood = "happy", flap = 0, bob = 0, tilt = 0, beakOpen = 0, size = 120, facing = "left", style, idPrefix = "pip" }) => {
  const body = "#FFC93C";
  const bodyDark = "#F0A500";
  const belly = "#FFF1B8";
  const beak = "#FF8A3D";
  const eyeScale = mood === "surprised" ? 1.25 : mood === "sleepy" ? 0.55 : mood === "curious" ? 1.1 : 1;
  const browY = mood === "curious" ? -6 : mood === "surprised" ? -9 : mood === "cheeky" ? 4 : 0;
  const browAngle = mood === "cheeky" ? 14 : mood === "curious" ? -10 : 0;
  const mouthOpen = Math.max(beakOpen, mood === "surprised" ? 0.6 : 0);
  const wingAngle = -20 - flap * 55;
  const cx = 60;
  const cy = 62 + bob;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${idPrefix}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD966" />
          <stop offset="100%" stopColor={body} />
        </linearGradient>
      </defs>
      <g transform={`translate(${cx} ${cy}) scale(${facing === "left" ? 1 : -1} 1) rotate(${tilt})`}>
        {/* tail */}
        <path d="M 30 8 l 18 -6 l -4 14 z" fill={bodyDark} stroke={colors.ink} strokeWidth={3} strokeLinejoin="round" />
        {/* body */}
        <ellipse cx={0} cy={4} rx={34} ry={30} fill={`url(#${idPrefix}-b)`} stroke={colors.ink} strokeWidth={3.5} />
        <ellipse cx={-4} cy={12} rx={18} ry={14} fill={belly} />
        {/* wing */}
        <g transform={`translate(12 2) rotate(${wingAngle})`}>
          <ellipse cx={10} cy={6} rx={17} ry={9} fill={bodyDark} stroke={colors.ink} strokeWidth={3} />
        </g>
        {/* feet */}
        <path d="M -12 33 l -6 8 M -12 33 l 0 9 M -12 33 l 6 8" stroke={beak} strokeWidth={3.5} strokeLinecap="round" />
        <path d="M 6 33 l -6 8 M 6 33 l 0 9 M 6 33 l 6 8" stroke={beak} strokeWidth={3.5} strokeLinecap="round" />
        {/* crest */}
        <path d="M -8 -24 q -6 -14 4 -18" stroke={colors.ink} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        <path d="M -8 -24 q -6 -14 4 -18" stroke={bodyDark} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        <path d="M -2 -25 q 2 -15 12 -14" stroke={colors.ink} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        <path d="M -2 -25 q 2 -15 12 -14" stroke={bodyDark} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        {/* eye */}
        <g transform={`translate(-12 -6) scale(1 ${eyeScale})`}>
          <circle r={11} fill={colors.white} stroke={colors.ink} strokeWidth={3} />
          <circle cx={-2} cy={1} r={5.5} fill={colors.ink} />
          <circle cx={-4} cy={-2} r={2} fill={colors.white} />
        </g>
        {/* brow */}
        <line x1={-22} y1={-19 + browY} x2={-4} y2={-19 + browY + browAngle * 0.25} stroke={colors.ink} strokeWidth={3.5} strokeLinecap="round" transform={`rotate(${browAngle} -13 -19)`} />
        {/* cheek */}
        <circle cx={-22} cy={4} r={5} fill={colors.boltCheek} opacity={0.8} />
        {/* beak */}
        <path d={`M -30 -2 l -14 5 l 14 ${5 + mouthOpen * 8} z`} fill={beak} stroke={colors.ink} strokeWidth={3} strokeLinejoin="round" />
      </g>
    </svg>
  );
};
