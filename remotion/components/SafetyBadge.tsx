import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";

type Props = { text: string; left: number; top: number; enterFrame?: number };

/** "Ask a grown-up" badge shown during experiments that involve pouring or handling. */
export const SafetyBadge: React.FC<Props> = ({ text, left, top, enterFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - enterFrame, fps, config: { damping: 14, stiffness: 140 } });
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        transform: `scale(${interpolate(s, [0, 1], [0.6, 1])}) rotate(-4deg)`,
        opacity: s,
        backgroundColor: colors.highlight,
        color: colors.white,
        borderRadius: 999,
        padding: "12px 26px 12px 18px",
        fontFamily: fonts.family,
        fontWeight: fonts.weightBold,
        fontSize: 32,
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 8px 0 rgba(30,42,68,0.18)",
      }}
    >
      <svg width={38} height={38} viewBox="0 0 44 44">
        <circle cx={22} cy={22} r={20} fill={colors.white} />
        <circle cx={22} cy={15} r={7} fill={colors.highlight} />
        <path d="M 9 36 q 13 -16 26 0" fill={colors.highlight} />
      </svg>
      {text}
    </div>
  );
};
