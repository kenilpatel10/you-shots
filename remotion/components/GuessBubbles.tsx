import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";

type Props = {
  prompt: string;
  options: string[];
  answer: number;
  mode: "ask" | "reveal";
  box: { left: number; top: number; width: number };
  compact?: boolean;
};

const BUBBLE_COLORS = ["#3C7DFF", "#FF8FA3", "#2FA36B"];
const LETTERS = ["A", "B", "C"];

/**
 * The "What do you think?" beat: three big answer bubbles. In `ask` mode they pop in one after
 * another; in `reveal` mode the right one grows with a tick and the others fade.
 */
export const GuessBubbles: React.FC<Props> = ({ prompt, options, answer, mode, box, compact }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontSize = compact ? 40 : 50;
  return (
    <div style={{ position: "absolute", left: box.left, top: box.top, width: box.width, fontFamily: fonts.family }}>
      <div
        style={{
          fontSize: compact ? 44 : 56,
          fontWeight: fonts.weightBold,
          color: colors.ink,
          textAlign: "center",
          marginBottom: compact ? 14 : 20,
          opacity: mode === "ask" ? interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }) : interpolate(frame, [0, 10], [1, 0.35], { extrapolateRight: "clamp" }),
        }}
      >
        {mode === "ask" ? prompt : "The answer is…"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 12 : 16 }}>
        {options.map((opt, i) => {
          const s = spring({ frame: frame - (mode === "ask" ? 6 + i * 7 : 0), fps, config: { damping: 13, stiffness: 150 } });
          const correct = i === answer;
          const revealScale = mode === "reveal" ? interpolate(spring({ frame: frame - 6, fps, config: { damping: 10, stiffness: 160 } }), [0, 1], [1, correct ? 1.06 : 0.96]) : 1;
          const revealOpacity = mode === "reveal" ? (correct ? 1 : interpolate(frame, [4, 20], [1, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) : 1;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                backgroundColor: mode === "reveal" && correct ? "#2FA36B" : colors.white,
                color: mode === "reveal" && correct ? colors.white : colors.ink,
                borderRadius: 999,
                padding: compact ? "12px 22px" : "16px 26px",
                boxShadow: "0 8px 0 rgba(30,42,68,0.14)",
                transform: `scale(${(mode === "ask" ? interpolate(s, [0, 1], [0.6, 1]) : 1) * revealScale})`,
                opacity: (mode === "ask" ? s : 1) * revealOpacity,
                transformOrigin: "left center",
                fontSize,
                fontWeight: fonts.weightBold,
                lineHeight: 1.1,
              }}
            >
              <span
                style={{
                  width: compact ? 52 : 64,
                  height: compact ? 52 : 64,
                  borderRadius: "50%",
                  backgroundColor: mode === "reveal" && correct ? colors.white : BUBBLE_COLORS[i],
                  color: mode === "reveal" && correct ? "#2FA36B" : colors.white,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: compact ? 30 : 36,
                  flexShrink: 0,
                }}
              >
                {mode === "reveal" && correct ? "✓" : LETTERS[i]}
              </span>
              {opt}
            </div>
          );
        })}
      </div>
    </div>
  );
};
