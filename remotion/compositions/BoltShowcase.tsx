import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Bolt } from "../character/Bolt";
import { AnimatedBolt } from "../character/AnimatedBolt";
import { EXPRESSION_LIST } from "../character/expressions";
import { POSE_LIST } from "../character/poses";
import { colors, fonts } from "../theme";
import { useFonts } from "../components/useFonts";

export const SHOWCASE_WIDTH = 1920;
export const SHOWCASE_HEIGHT = 1440;

/**
 * Every pose × expression, plus mouth-open and antenna-glow ramps, so the design can be
 * reviewed in Remotion Studio or as a rendered PNG (`npm run showcase`).
 */
export const BoltShowcase: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cell = 210;
  const label: React.CSSProperties = {
    fontFamily: fonts.family,
    fontWeight: fonts.weightSemi,
    fontSize: 26,
    color: colors.ink,
    textAlign: "center",
  };
  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper, padding: 40, fontFamily: fonts.family }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <div style={{ ...label, fontSize: 48, fontWeight: fonts.weightBold, color: colors.primary }}>Bolt — design sheet</div>
        <div style={{ ...label, fontSize: 24, opacity: 0.7 }}>rows: poses · columns: expressions</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `120px repeat(${EXPRESSION_LIST.length}, ${cell}px)`, marginTop: 10 }}>
        <div />
        {EXPRESSION_LIST.map((e) => (
          <div key={e} style={label}>
            {e}
          </div>
        ))}
        {POSE_LIST.map((pose) => (
          <React.Fragment key={pose}>
            <div style={{ ...label, alignSelf: "center" }}>{pose}</div>
            {EXPRESSION_LIST.map((expression) => (
              <div key={expression} style={{ display: "flex", justifyContent: "center" }}>
                <AnimatedBolt pose={pose} expression={expression} size={cell * 0.8} seed={`${pose}-${expression}`} idPrefix={`${pose}-${expression}`} />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 8, alignItems: "flex-end" }}>
        <div style={{ ...label, width: 120 }}>mouth 0→1</div>
        {[0, 0.25, 0.5, 0.75, 1].map((m) => (
          <Bolt key={m} expression="happy" mouthOpen={m} size={150} idPrefix={`m${m}`} />
        ))}
        <div style={{ ...label, width: 140 }}>glow 0→1</div>
        {[0, 0.5, 1].map((g) => (
          <Bolt key={g} expression="excited" antennaGlow={g} mouthOpen={0.3} size={150} idPrefix={`g${g}`} />
        ))}
        <div style={{ ...label, width: 120 }}>talking</div>
        <Bolt expression="curious" mouthOpen={0.5 + 0.5 * Math.sin((frame / fps) * 14)} antennaGlow={0.4} size={150} idPrefix="talk" />
      </div>
    </AbsoluteFill>
  );
};
