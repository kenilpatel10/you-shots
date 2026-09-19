import React from "react";
import type { GuestKind } from "../guests";
import { colors } from "../theme";

export type GuestMood = "happy" | "surprised" | "cheeky";

export type GuestProps = {
  kind: GuestKind;
  mood?: GuestMood;
  /** 0 = closed, 1 = open (driven by the guest's own voice). */
  mouthOpen?: number;
  bob?: number;
  size?: number;
  idPrefix?: string;
  style?: React.CSSProperties;
};

const INK = colors.ink;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Shared face in the Bolt/Pip style: big eyes with highlights, brows, cheeks, one mouth. */
const Face: React.FC<{ mood: GuestMood; mouthOpen: number; scale?: number; y?: number }> = ({ mood, mouthOpen, scale = 1, y = 0 }) => {
  const eye = mood === "surprised" ? 1.25 : 1;
  const browY = mood === "surprised" ? -9 : mood === "cheeky" ? 3 : 0;
  const browA = mood === "cheeky" ? 12 : 0;
  const open = Math.max(clamp01(mouthOpen), mood === "surprised" ? 0.5 : 0);
  return (
    <g transform={`translate(0 ${y}) scale(${scale})`}>
      {[-16, 16].map((x, i) => (
        <g key={i} transform={`translate(${x} -6) scale(${eye})`}>
          <ellipse cx={0} cy={0} rx={11} ry={12} fill={colors.white} stroke={INK} strokeWidth={3} />
          <circle cx={1} cy={2} r={6} fill={INK} />
          <circle cx={-1.5} cy={-1} r={2.2} fill={colors.white} />
        </g>
      ))}
      {[-16, 16].map((x, i) => (
        <line key={i} x1={x - 9} y1={-22 + browY + (i === 0 ? browA * 0.3 : -browA * 0.3)} x2={x + 9} y2={-22 + browY - (i === 0 ? browA * 0.3 : -browA * 0.3)} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      ))}
      <ellipse cx={-26} cy={6} rx={6} ry={4} fill="#FF8FA3" opacity={0.7} />
      <ellipse cx={26} cy={6} rx={6} ry={4} fill="#FF8FA3" opacity={0.7} />
      {open > 0.15 ? <ellipse cx={0} cy={14} rx={8 + open * 3} ry={3 + open * 9} fill={INK} /> : <path d={`M -9 12 q 9 ${mood === "cheeky" ? 9 : 7} 18 0`} stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />}
    </g>
  );
};

/** A small character per topic category; drawn in a 120×120 box like Pip. */
export const Guest: React.FC<GuestProps> = ({ kind, mood = "happy", mouthOpen = 0, bob = 0, size = 150, idPrefix = "guest", style }) => {
  const g = `${idPrefix}-${kind}`;
  const body = (() => {
    switch (kind) {
      case "cat":
        return (
          <>
            <path d="M -34 -28 l 8 -30 l 20 22 z" fill="#8E8BF7" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <path d="M 34 -28 l -8 -30 l -20 22 z" fill="#8E8BF7" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <ellipse cx={0} cy={4} rx={40} ry={36} fill="#A7A4FF" stroke={INK} strokeWidth={3.5} />
            <path d="M 36 20 q 30 -6 26 -30" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
            <path d="M -14 18 l -12 2 M -14 22 l -12 4 M 14 18 l 12 2 M 14 22 l 12 4" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
            <Face mood={mood} mouthOpen={mouthOpen} y={4} />
          </>
        );
      case "star":
        return (
          <>
            <path d="M 0 -48 l 13 30 l 33 3 l -25 22 l 8 32 l -29 -17 l -29 17 l 8 -32 l -25 -22 l 33 -3 z" fill="#FFD166" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <Face mood={mood} mouthOpen={mouthOpen} y={4} scale={0.85} />
          </>
        );
      case "tooth":
        return (
          <>
            <path d="M -34 -30 q 34 -28 68 0 q 6 34 -10 62 q -8 12 -14 -10 q -4 -14 -10 -14 q -6 0 -10 14 q -6 22 -14 10 q -16 -28 -10 -62 z" fill="#FFFFFF" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <Face mood={mood} mouthOpen={mouthOpen} y={-4} scale={0.9} />
          </>
        );
      case "raindrop":
        return (
          <>
            <path d="M 0 -52 q 34 44 34 62 a 34 34 0 0 1 -68 0 q 0 -18 34 -62 z" fill="#6EC1FF" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <ellipse cx={-14} cy={-6} rx={5} ry={9} fill="#FFFFFF" opacity={0.6} />
            <Face mood={mood} mouthOpen={mouthOpen} y={10} scale={0.85} />
          </>
        );
      case "sock":
        return (
          <>
            <path d="M -26 -50 h 44 v 44 q 0 14 12 22 l 12 8 q 10 8 -2 18 h -40 q -14 0 -22 -12 l -8 -14 q -4 -8 -4 -20 z" fill="#FF8FA3" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <rect x={-26} y={-50} width={44} height={12} fill="#FFFFFF" stroke={INK} strokeWidth={3} />
            <circle cx={-6} cy={-16} r={5} fill="#FFD166" />
            <circle cx={8} cy={0} r={5} fill="#6EC1FF" />
            <Face mood={mood} mouthOpen={mouthOpen} y={22} scale={0.72} />
          </>
        );
      case "mango":
        return (
          <>
            <path d="M -30 -20 q 20 -40 56 -10 q 22 30 -6 56 q -30 26 -56 4 q -20 -22 6 -50 z" fill="#FFB627" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <path d="M -18 -30 q -12 -16 -2 -26" stroke="#2FA36B" strokeWidth={5} fill="none" strokeLinecap="round" />
            <path d="M -14 -38 q 18 -10 24 4 q -18 8 -24 -4 z" fill="#5FCB7B" stroke={INK} strokeWidth={3} />
            <Face mood={mood} mouthOpen={mouthOpen} y={6} />
          </>
        );
      case "fish":
        return (
          <>
            <path d="M 34 4 l 26 -22 l 0 44 z" fill="#4CC9F0" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <ellipse cx={0} cy={4} rx={40} ry={30} fill="#4CC9F0" stroke={INK} strokeWidth={3.5} />
            <path d="M -6 -22 q 10 -14 22 -2" stroke={INK} strokeWidth={3} fill="none" />
            <circle cx={-12} cy={20} r={3} fill="#FFFFFF" opacity={0.7} />
            <Face mood={mood} mouthOpen={mouthOpen} y={4} scale={0.85} />
          </>
        );
      case "dino":
        return (
          <>
            <path d="M -34 -8 q 6 -46 40 -40 q 30 8 26 40 q -2 30 -30 34 q -30 2 -36 -34 z" fill="#5FCB7B" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <path d="M -8 -46 l 8 -12 l 8 12 M 6 -44 l 8 -12 l 8 12" fill="#2FA36B" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            <path d="M -34 8 q -22 6 -26 22 q 18 -4 26 -10" fill="#5FCB7B" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <Face mood={mood} mouthOpen={mouthOpen} y={2} />
          </>
        );
      case "gear":
        return (
          <>
            <path
              d={
                Array.from({ length: 8 }, (_, i) => {
                  const a = (i / 8) * Math.PI * 2;
                  const b = a + Math.PI / 8;
                  const r1 = 46;
                  const r2 = 36;
                  return `${i === 0 ? "M" : "L"} ${Math.cos(a) * r1} ${Math.sin(a) * r1} L ${Math.cos(b) * r1} ${Math.sin(b) * r1} L ${Math.cos(b + Math.PI / 16) * r2} ${Math.sin(b + Math.PI / 16) * r2} L ${Math.cos(a + Math.PI / 4 - Math.PI / 16) * r2} ${Math.sin(a + Math.PI / 4 - Math.PI / 16) * r2}`;
                }).join(" ") + " Z"
              }
              fill="#B0BEC5"
              stroke={INK}
              strokeWidth={3.5}
              strokeLinejoin="round"
            />
            <circle cx={0} cy={0} r={30} fill="#CFD8DC" stroke={INK} strokeWidth={3} />
            <Face mood={mood} mouthOpen={mouthOpen} y={4} scale={0.8} />
          </>
        );
      case "heart":
      default:
        return (
          <>
            <path d="M 0 40 q -46 -30 -44 -58 q 2 -22 22 -22 q 14 0 22 14 q 8 -14 22 -14 q 20 0 22 22 q 2 28 -44 58 z" fill="#FF6B8A" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <Face mood={mood} mouthOpen={mouthOpen} y={0} scale={0.85} />
          </>
        );
    }
  })();
  return (
    <svg viewBox="-60 -60 120 120" width={size} height={size} style={style} xmlns="http://www.w3.org/2000/svg" data-guest={g}>
      <g transform={`translate(0 ${bob})`}>{body}</g>
    </svg>
  );
};
