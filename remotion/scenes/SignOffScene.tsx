import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TitleCard } from "../components/TitleCard";
import { colors, fonts } from "../theme";
import type { SceneProps } from "./common";

/** Catchphrase card, then the channel name fades in for the final two seconds while Bolt waves. */
export const SignOffScene: React.FC<SceneProps> = ({ section, channel, layout, maxFontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wordsEndFrame = Math.round(((section.endMs - section.startMs) / 1000) * fps);
  const s = spring({ frame: frame - wordsEndFrame + 6, fps, config: { damping: 14, stiffness: 110 } });
  return (
    <>
      <TitleCard text={channel.catchphrase} box={layout.card} align="center" maxFontSize={maxFontSize} />
      <div
        style={{
          position: "absolute",
          left: layout.signoff.left,
          top: layout.signoff.top,
          width: layout.signoff.width,
          textAlign: "center",
          opacity: interpolate(s, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
          fontFamily: fonts.family,
        }}
      >
        <div style={{ fontSize: 84, fontWeight: fonts.weightBold, color: colors.ink, lineHeight: 1.05 }}>{channel.name}</div>
        <div style={{ fontSize: 44, fontWeight: fonts.weightSemi, color: channel.brand?.primary ?? colors.primary, marginTop: 10 }}>{channel.handle}</div>
      </div>
    </>
  );
};
