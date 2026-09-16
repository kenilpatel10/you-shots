import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";

type Props = {
  text: string;
  tag?: string;
  tagColor?: string;
  box: { left: number; top: number; width: number };
  /** Frame at which the card enters (relative to the current sequence). */
  enterFrame?: number;
  align?: "left" | "center";
  maxFontSize?: number;
};

function fontSizeFor(text: string, max: number): number {
  const n = text.length;
  if (n <= 18) return max;
  if (n <= 30) return Math.round(max * 0.86);
  if (n <= 44) return Math.round(max * 0.74);
  return Math.round(max * 0.64);
}

/** Big on-screen text on a rounded card with a small section tag. Springs in gently. */
export const TitleCard: React.FC<Props> = ({ text, tag, tagColor = colors.primary, box, enterFrame = 0, align = "left", maxFontSize = 84 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - enterFrame, fps, config: { damping: 16, stiffness: 120, mass: 0.8 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const scale = interpolate(s, [0, 1], [0.92, 1]);
  const fontSize = fontSizeFor(text, maxFontSize);
  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "50% 50%",
      }}
    >
      {tag ? (
        <div
          style={{
            display: "inline-block",
            backgroundColor: tagColor,
            color: colors.white,
            fontFamily: fonts.family,
            fontWeight: fonts.weightBold,
            fontSize: 34,
            padding: "8px 26px",
            borderRadius: 999,
            marginBottom: -22,
            marginLeft: align === "left" ? 28 : 0,
            position: "relative",
            zIndex: 2,
            boxShadow: "0 6px 0 rgba(30,42,68,0.15)",
          }}
        >
          {tag}
        </div>
      ) : null}
      <div
        style={{
          backgroundColor: colors.white,
          borderRadius: 40,
          padding: tag ? "44px 40px 30px" : "34px 40px",
          boxShadow: "0 12px 0 rgba(30,42,68,0.12)",
          fontFamily: fonts.family,
          fontWeight: fonts.weightBold,
          fontSize,
          lineHeight: 1.12,
          color: colors.ink,
          textAlign: align,
          textWrap: "balance",
        }}
      >
        {text}
      </div>
    </div>
  );
};
