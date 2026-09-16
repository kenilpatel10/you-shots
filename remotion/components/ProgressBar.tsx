import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { SectionTiming } from "../schema";
import { colors } from "../theme";

type Props = { sections: SectionTiming[]; box: { left: number; top: number; width: number } };

/** Five small pills, one per section, filling as Bolt speaks. Calm and unobtrusive. */
export const ProgressBar: React.FC<Props> = ({ sections, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const gap = 10;
  const w = (box.width - gap * (sections.length - 1)) / sections.length;
  return (
    <div style={{ position: "absolute", left: box.left, top: box.top, width: box.width, display: "flex", gap }}>
      {sections.map((s) => {
        const p = Math.max(0, Math.min(1, (ms - s.startMs) / Math.max(1, s.endMs - s.startMs)));
        return (
          <div key={s.key} style={{ width: w, height: 12, borderRadius: 999, backgroundColor: "rgba(30,42,68,0.18)", overflow: "hidden" }}>
            <div style={{ width: `${p * 100}%`, height: "100%", backgroundColor: colors.accent }} />
          </div>
        );
      })}
    </div>
  );
};
