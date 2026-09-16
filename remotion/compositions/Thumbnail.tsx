import React from "react";
import { AbsoluteFill } from "remotion";
import { Bolt } from "../character/Bolt";
import { useFonts } from "../components/useFonts";
import type { ThumbnailProps } from "../schema";
import { categoryPalettes, colors, fonts } from "../theme";

export const THUMB_WIDTH = 1280;
export const THUMB_HEIGHT = 720;

/** Bright, uncluttered still for the weekly video: Bolt + 3–4 big words. */
export const Thumbnail: React.FC<ThumbnailProps> = ({ words, background }) => {
  useFonts();
  const pal = categoryPalettes[background] ?? categoryPalettes["space"]!;
  return (
    <AbsoluteFill style={{ backgroundColor: pal.sky, fontFamily: fonts.family, overflow: "hidden" }}>
      <svg width={THUMB_WIDTH} height={THUMB_HEIGHT} style={{ position: "absolute", inset: 0 }}>
        <circle cx={1100} cy={120} r={160} fill={pal.accent} opacity={0.5} />
        <ellipse cx={640} cy={760} rx={900} ry={180} fill={pal.ground} />
      </svg>
      <div style={{ position: "absolute", left: 40, top: 20 }}>
        <Bolt pose="point" expression="excited" antennaGlow={1} mouthOpen={0.35} size={540} idPrefix="thumb" />
      </div>
      <div style={{ position: "absolute", left: 560, top: 90, width: 680, display: "flex", flexDirection: "column", gap: 4 }}>
        {words.map((w, i) => (
          <div
            key={i}
            style={{
              fontSize: words.length > 3 ? 132 : 156,
              lineHeight: 1,
              fontWeight: fonts.weightBold,
              color: i % 2 === 0 ? colors.ink : colors.primary,
              textShadow: "0 8px 0 rgba(255,255,255,0.9)",
              letterSpacing: -2,
            }}
          >
            {w}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
