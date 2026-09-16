export type Expression = "curious" | "happy" | "surprised" | "thinking" | "excited" | "neutral";

export type ExpressionSpec = {
  /** Eye openness multiplier (1 = normal, >1 wide). */
  eyeScale: number;
  /** Pupil offset in SVG units (x, y). Positive y looks down. */
  pupilOffset: [number, number];
  /** Brow angle (degrees) and lift (SVG units) for [left, right]. Positive angle = outer end down. */
  browAngle: [number, number];
  browLift: [number, number];
  /** Mouth shape when closed: smile curvature (−1 frown … 1 big smile) and width factor. */
  smile: number;
  mouthWidth: number;
  /** Extra antenna glow baseline. */
  glow: number;
  /** Show sparkles in eyes. */
  sparkle: boolean;
  cheekOpacity: number;
};

export const expressions: Record<Expression, ExpressionSpec> = {
  neutral: { eyeScale: 1, pupilOffset: [0, 0], browAngle: [0, 0], browLift: [0, 0], smile: 0.55, mouthWidth: 1, glow: 0, sparkle: false, cheekOpacity: 0.55 },
  curious: { eyeScale: 1.08, pupilOffset: [3, -2], browAngle: [-8, 10], browLift: [6, -2], smile: 0.35, mouthWidth: 0.7, glow: 0.15, sparkle: false, cheekOpacity: 0.5 },
  happy: { eyeScale: 0.98, pupilOffset: [0, 1], browAngle: [4, -4], browLift: [2, 2], smile: 1, mouthWidth: 1.1, glow: 0.1, sparkle: false, cheekOpacity: 0.8 },
  surprised: { eyeScale: 1.22, pupilOffset: [0, -1], browAngle: [-10, 10], browLift: [12, 12], smile: 0.1, mouthWidth: 0.6, glow: 0.35, sparkle: false, cheekOpacity: 0.45 },
  thinking: { eyeScale: 0.95, pupilOffset: [6, -6], browAngle: [10, -12], browLift: [-2, 8], smile: 0.25, mouthWidth: 0.75, glow: 0.25, sparkle: false, cheekOpacity: 0.4 },
  excited: { eyeScale: 1.12, pupilOffset: [0, 0], browAngle: [-6, 6], browLift: [9, 9], smile: 1, mouthWidth: 1.25, glow: 0.9, sparkle: true, cheekOpacity: 0.9 },
};

export const EXPRESSION_LIST: Expression[] = ["neutral", "curious", "happy", "surprised", "thinking", "excited"];
