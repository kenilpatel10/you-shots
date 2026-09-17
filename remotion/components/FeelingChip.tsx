import React from "react";
import { interpolate } from "remotion";
import { colors, fonts } from "../theme";

type Props = { text: string; left: number; top: number; enterFrame: number; frame: number };

/** Small rounded chip naming Bolt's feeling for a moment when his expression changes (ages 5–6 love naming feelings). */
export const FeelingChip: React.FC<Props> = ({ text, left, top, frame }) => {
  const opacity = interpolate(frame, [0, 6, 38, 50], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 6], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        transform: `translateY(${y}px)`,
        opacity,
        backgroundColor: colors.white,
        color: colors.ink,
        borderRadius: 999,
        padding: "8px 18px",
        fontFamily: fonts.family,
        fontWeight: fonts.weightSemi,
        fontSize: 28,
        boxShadow: "0 5px 0 rgba(30,42,68,0.14)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};
