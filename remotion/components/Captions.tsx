import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { WordTiming } from "../schema";
import { colors, fonts } from "../theme";

export type CaptionPage = { words: WordTiming[]; startMs: number; endMs: number };

/** Group words into pages of at most `maxWords` words / `maxChars` characters. */
export function paginate(words: WordTiming[], maxWords = 4, maxChars = 22): CaptionPage[] {
  const pages: CaptionPage[] = [];
  let cur: WordTiming[] = [];
  let chars = 0;
  const flush = () => {
    if (cur.length) {
      pages.push({ words: cur, startMs: cur[0]!.startMs, endMs: cur[cur.length - 1]!.endMs });
      cur = [];
      chars = 0;
    }
  };
  for (const w of words) {
    const len = w.text.length;
    if (cur.length && (cur.length >= maxWords || chars + len + 1 > maxChars)) flush();
    cur.push(w);
    chars += len + 1;
    if (/[.!?]$/.test(w.text) && cur.length >= 2) flush();
  }
  flush();
  // Hold each page until the next one starts so there is never a flicker between pages.
  for (let i = 0; i < pages.length - 1; i++) pages[i]!.endMs = Math.max(pages[i]!.endMs, pages[i + 1]!.startMs);
  return pages;
}

type Props = {
  /** Words grouped by section so a caption page never crosses a section boundary. */
  wordGroups: WordTiming[][];
  /** Layout box (px) inside the composition. */
  box: { left: number; top: number; width: number; height: number };
  fontSize?: number;
  /** Keep the last page visible for this many ms after the last word. */
  holdMs?: number;
};

/** Large, rounded, high-contrast captions with the current word highlighted. */
export const Captions: React.FC<Props> = ({ wordGroups, box, fontSize = 60, holdMs = 400 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const pages = useMemo(() => wordGroups.flatMap((g) => paginate(g)), [wordGroups]);
  const page = pages.find((p, i) => ms >= p.startMs - 80 && ms < p.endMs + (i === pages.length - 1 ? holdMs : 0));
  if (!page) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          backgroundColor: colors.captionBg,
          borderRadius: 34,
          padding: "18px 34px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "6px 18px",
          maxWidth: box.width,
          fontFamily: fonts.family,
          fontWeight: fonts.weightBold,
          fontSize,
          lineHeight: 1.25,
          color: colors.captionText,
          textAlign: "center",
        }}
      >
        {page.words.map((w, i) => {
          const active = ms >= w.startMs && ms < w.endMs + 60;
          const done = ms >= w.endMs + 60;
          return (
            <span
              key={i}
              style={{
                color: active ? colors.captionActive : colors.captionText,
                opacity: done ? 0.92 : 1,
                transform: active ? "scale(1.08)" : "scale(1)",
                display: "inline-block",
                transition: "none",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
