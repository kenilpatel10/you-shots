import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";

type Props = { text: string; left: number; top: number; width: number; enterFrame?: number; fontSize?: number; tail?: "left" | "right" };

/** White rounded bubble with a small tail, for the guest's one-liner. */
export const SpeechBubble: React.FC<Props> = ({ text, left, top, width, enterFrame = 0, fontSize = 36, tail = "right" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - enterFrame, fps, config: { damping: 11, stiffness: 160 } });
  return (
    <div
      style={{ position: "absolute", left, top, width, transform: `scale(${interpolate(s, [0, 1], [0.6, 1])})`, transformOrigin: tail === "right" ? "90% 100%" : "10% 100%", opacity: frame >= enterFrame ? s : 0, fontFamily: fonts.family }}
    >
      <div
        style={{
          backgroundColor: colors.white,
          color: colors.ink,
          borderRadius: 30,
          padding: "16px 24px",
          fontSize,
          fontWeight: fonts.weightSemi,
          lineHeight: 1.2,
          textAlign: "center",
          boxShadow: "0 8px 0 rgba(30,42,68,0.14)",
          border: `4px solid ${colors.ink}`,
        }}
      >
        {text}
      </div>
      <svg width={40} height={26} style={{ position: "absolute", bottom: -22, [tail === "right" ? "right" : "left"]: 44 }}>
        <path d="M 4 0 L 20 24 L 36 0 Z" fill={colors.white} stroke={colors.ink} strokeWidth={4} strokeLinejoin="round" />
        <rect x={6} y={-4} width={28} height={8} fill={colors.white} />
      </svg>
    </div>
  );
};
