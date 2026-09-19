import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { SpeechBubble } from "../components/SpeechBubble";
import { AnimatedGuest } from "../character/AnimatedGuest";
import { colors } from "../theme";
import type { SceneProps } from "./common";

/** Wow fact: card plus a few soft sparkles drifting up around the card. Slow, no flashing. */
export const FactScene: React.FC<SceneProps & { guestMouth?: number }> = ({ script, channel, layout, maxFontSize, section, guestMouth = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sparkles = [0.08, 0.3, 0.55, 0.78, 0.95];
  // Comedy beat: the guest pops in when its line starts (timeline.gag) and stays till the section ends.
  const gagFrame = section.gag ? Math.round(((section.gag.startMs - section.startMs) / 1000) * fps) - 8 : null;
  const showGuest = Boolean(script.gag && layout.guest && gagFrame !== null && frame >= gagFrame);
  const g = layout.guest;
  return (
    <>
      <TitleCard text={script.onScreenText.wowFact} tag={channel.labels?.wowFact ?? "Wow fact!"} tagColor={channel.brand?.accent ?? colors.accent} box={layout.card} maxFontSize={maxFontSize} />
      <svg style={{ position: "absolute", left: layout.card.left - 40, top: layout.card.top - 60, pointerEvents: "none" }} width={layout.card.width + 80} height={420}>
        {sparkles.map((fx, i) => {
          const y = 380 - ((t * 40 + i * 90) % 400);
          const o = interpolate(y, [0, 60, 320, 380], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const s = 0.6 + 0.4 * Math.sin(t * 2 + i);
          return <path key={i} transform={`translate(${fx * (layout.card.width + 80)} ${y}) scale(${s})`} d="M 0 -18 l 5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5 z" fill={colors.accent} opacity={o} />;
        })}
      </svg>
      {showGuest && script.gag && g ? (
        <>
          <AnimatedGuest
            kind={script.gag.guest as never}
            mood={script.gag.reaction === "oops" ? "cheeky" : "happy"}
            mouthOpen={guestMouth}
            size={g.size}
            enterFrame={gagFrame ?? 0}
            idPrefix={`guest-${script.topicId}`}
            style={{ position: "absolute", left: g.left, top: g.top }}
          />
          <SpeechBubble text={script.gag.line} left={g.left - g.size * 0.9} top={g.top - 150} width={g.size * 1.55} enterFrame={(gagFrame ?? 0) + 4} fontSize={(maxFontSize ?? 84) < 84 ? 30 : 34} tail="right" />
        </>
      ) : null}
    </>
  );
};
