export type Pose = "idle" | "wave" | "point" | "think" | "jump";

export type PoseSpec = {
  /** Shoulder rotation in degrees for [left, right] arms. 0 = hanging down. Positive = raised outward/up. */
  armAngle: [number, number];
  /** Elbow bend for [left, right]. */
  elbowAngle: [number, number];
  /** Whether the right hand is a pointing hand. */
  pointing: boolean;
  /** Body lift in SVG units (jump). */
  lift: number;
  /** Feet tuck (0–1). */
  feetTuck: number;
  /** Body tilt in degrees. */
  tilt: number;
  /** Hand near chin (think). */
  handToChin: boolean;
};

export const poses: Record<Pose, PoseSpec> = {
  idle: { armAngle: [12, -12], elbowAngle: [0, 0], pointing: false, lift: 0, feetTuck: 0, tilt: 0, handToChin: false },
  wave: { armAngle: [14, -138], elbowAngle: [0, -28], pointing: false, lift: 0, feetTuck: 0, tilt: -3, handToChin: false },
  point: { armAngle: [18, -105], elbowAngle: [0, -10], pointing: true, lift: 0, feetTuck: 0, tilt: 2, handToChin: false },
  think: { armAngle: [10, -95], elbowAngle: [0, -120], pointing: false, lift: 0, feetTuck: 0, tilt: 4, handToChin: true },
  jump: { armAngle: [150, -150], elbowAngle: [10, -10], pointing: false, lift: 70, feetTuck: 1, tilt: 0, handToChin: false },
};

export const POSE_LIST: Pose[] = ["idle", "wave", "point", "think", "jump"];
