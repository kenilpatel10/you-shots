/**
 * Visual identity for Bolt Asks Why. Everything visual reads from here so the
 * channel looks identical in every video.
 */
export const colors = {
  // Bolt's palette (4 colours + white/ink)
  boltBody: "#3C7DFF", // friendly blue
  boltBodyDark: "#2A5FD6", // shading
  boltBelly: "#EAF2FF", // pale panel
  boltAccent: "#FFB627", // antenna light, buttons
  boltCheek: "#FF8FA3",
  ink: "#1E2A44",
  white: "#FFFFFF",

  // UI
  primary: "#3C7DFF",
  accent: "#FFB627",
  highlight: "#FF6B6B",
  paper: "#FFFDF7",
  captionBg: "rgba(30, 42, 68, 0.92)",
  captionText: "#FFFFFF",
  captionActive: "#FFB627",
} as const;

export const fonts = {
  family: "Fredoka, 'Baloo 2', 'Nunito', 'Arial Rounded MT Bold', 'Segoe UI', sans-serif",
  weightRegular: 400,
  weightSemi: 600,
  weightBold: 700,
} as const;

export const spacing = {
  /** Safe-zone paddings for 1080x1920 Shorts (fractions of height/width). */
  shortsSafeTop: 0.15,
  shortsSafeBottom: 0.25,
  shortsSafeRight: 0.14,
  gutter: 56,
  radius: 36,
} as const;

/** Category → background palette. Calm, high-contrast, low saturation. */
export const categoryPalettes: Record<string, { sky: string; ground: string; accent: string; label: string }> = {
  animals: { sky: "#FFF3D6", ground: "#9FD98A", accent: "#F4A261", label: "Animals" },
  space: { sky: "#141B3D", ground: "#2A3570", accent: "#FFD166", label: "Space" },
  "human-body": { sky: "#FFE8EC", ground: "#FFC2CC", accent: "#EF6F8B", label: "My Body" },
  "weather-nature": { sky: "#D8F0FF", ground: "#A5D8A0", accent: "#4FB3E8", label: "Nature" },
  "everyday-things": { sky: "#FFF7E0", ground: "#F4D58D", accent: "#FF9F1C", label: "Everyday" },
  food: { sky: "#FFF0E0", ground: "#FFD6A5", accent: "#FF7B54", label: "Food" },
  ocean: { sky: "#CDEFFF", ground: "#2C8FD6", accent: "#12B5CB", label: "Ocean" },
  dinosaurs: { sky: "#F3F0DE", ground: "#B8C480", accent: "#7A9E4B", label: "Dinosaurs" },
  "how-things-work": { sky: "#EDEBFF", ground: "#C9C3F5", accent: "#6C5CE7", label: "How It Works" },
  "feelings-friendship": { sky: "#FFECF6", ground: "#FFC8E6", accent: "#E56AA8", label: "Friends" },
};

export const FPS = 30;
export const SHORT_WIDTH = 1080;
export const SHORT_HEIGHT = 1920;
export const LONG_WIDTH = 1920;
export const LONG_HEIGHT = 1080;
