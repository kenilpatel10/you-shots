import React from "react";
import { AbsoluteFill } from "remotion";
import { Guest } from "../character/Guest";
import { GUESTS } from "../guests";
import { useFonts } from "../components/useFonts";
import { colors, fonts } from "../theme";

export const CAST_WIDTH = 1600;
export const CAST_HEIGHT = 900;

/** Design sheet: the ten guest characters with their names and the topic category they belong to. */
export const GuestCast: React.FC = () => {
  useFonts();
  const entries = Object.entries(GUESTS);
  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper, fontFamily: fonts.family, padding: 40 }}>
      <div style={{ fontSize: 48, fontWeight: fonts.weightBold, color: colors.ink, marginBottom: 12 }}>The guest cast — one per topic category</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 24 }}>
        {entries.map(([category, g], i) => (
          <div key={category} style={{ backgroundColor: colors.white, borderRadius: 28, padding: 16, textAlign: "center", boxShadow: "0 8px 0 rgba(30,42,68,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
              <Guest kind={g.kind} mood="happy" size={150} idPrefix={`cast-${i}-a`} />
              <Guest kind={g.kind} mood="surprised" mouthOpen={0.7} size={110} idPrefix={`cast-${i}-b`} style={{ marginTop: 40 }} />
            </div>
            <div style={{ fontSize: 30, fontWeight: fonts.weightBold, color: colors.ink, marginTop: 6 }}>{g.name.en}</div>
            <div style={{ fontSize: 22, color: colors.primary, marginTop: 2 }}>{category}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
