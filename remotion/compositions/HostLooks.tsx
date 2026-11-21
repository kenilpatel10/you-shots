import React from "react";
import { AbsoluteFill } from "remotion";
import { Host } from "../character/Host";
import { HOST_PRESETS } from "../character/hostLook";
import { useFonts } from "../components/useFonts";
import { colors, fonts } from "../theme";

export const LOOKS_WIDTH = 1600;
export const LOOKS_HEIGHT = 1000;

/** Design sheet: the preset host looks. Copy one into a persona's `host` block and tweak the colours. */
export const HostLooks: React.FC = () => {
  useFonts();
  const entries = Object.entries(HOST_PRESETS);
  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper, fontFamily: fonts.family, padding: 36 }}>
      <div style={{ fontSize: 44, fontWeight: fonts.weightBold, color: colors.ink, marginBottom: 10 }}>Host looks — pick the closest, then tune skin / hair / glasses / outfit in the persona file</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {entries.map(([label, look], i) => (
          <div key={label} style={{ backgroundColor: colors.white, borderRadius: 26, padding: 12, textAlign: "center", boxShadow: "0 8px 0 rgba(30,42,68,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 2 }}>
              <Host look={look} pose="wave" expression="happy" size={190} idPrefix={`look-${i}-a`} />
              <Host look={look} pose="point" expression="excited" mouthOpen={0.7} antennaGlow={1} size={150} idPrefix={`look-${i}-b`} />
            </div>
            <div style={{ fontSize: 26, fontWeight: fonts.weightBold, color: colors.ink, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
