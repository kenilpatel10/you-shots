import { SHORT_HEIGHT, SHORT_WIDTH, spacing } from "./theme";

/**
 * 1080×1920 layout. Everything important stays inside the YouTube Shorts safe area:
 * not in the top ~15%, the bottom ~25%, or behind the right-hand action buttons.
 */
const safeTop = Math.round(SHORT_HEIGHT * spacing.shortsSafeTop); // 288
const safeBottom = Math.round(SHORT_HEIGHT * (1 - spacing.shortsSafeBottom)); // 1440
const safeRight = Math.round(SHORT_WIDTH * (1 - spacing.shortsSafeRight)); // 929
const left = spacing.gutter;
const width = safeRight - left; // 873

export const shortLayout = {
  safe: { top: safeTop, bottom: safeBottom, left, right: safeRight },
  card: { left, top: safeTop + 20, width },
  bolt: { centerX: 430, top: 598, size: 520 },
  captions: { left, top: 1170, width, height: 230 },
  progress: { left, top: safeBottom - 24, width },
  badge: { left: 590, top: 1062 },
  signoff: { left, top: 1200, width },
};

/** 1920×1080 landscape layout: Bolt on the left, text and captions on the right. */
export const longLayout = {
  bolt: { centerX: 400, top: 250, size: 520 },
  card: { left: 760, top: 150, width: 1040 },
  captions: { left: 760, top: 640, width: 1040, height: 220 },
  badge: { left: 760, top: 540 },
  progress: { left: 760, top: 960, width: 1040 },
};
