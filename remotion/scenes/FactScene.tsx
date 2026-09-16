import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { colors } from "../theme";
import type { SceneProps } from "./common";

/** Wow fact: card plus a few soft sparkles drifting up around the card. Slow, no flashing. */
export const FactScene: React.FC<SceneProps> = ({ script, layout, maxFontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sparkles = [0.08, 0.3, 0.55, 0.78, 0.95];
  return (
    <>
      <TitleCard text={script.onScreenText.wowFact} tag="Wow fact!" tagColor={colors.accent} box={layout.card} maxFontSize={maxFontSize} />
      <svg style={{ position: "absolute", left: layout.card.left - 40, top: layout.card.top - 60, pointerEvents: "none" }} width={layout.card.width + 80} height={420}>
        {sparkles.map((fx, i) => {
          const y = 380 - ((t * 40 + i * 90) % 400);
          const o = interpolate(y, [0, 60, 320, 380], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const s = 0.6 + 0.4 * Math.sin(t * 2 + i);
          return (
            <path key={i} transform={`translate(${fx * (layout.card.width + 80)} ${y}) scale(${s})`} d="M 0 -18 l 5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5 z" fill={colors.accent} opacity={o} />
          );
        })}
      </svg>
    </>
  );
};
