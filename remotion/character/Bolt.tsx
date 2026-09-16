import React from "react";
import { colors } from "../theme";
import { expressions, type Expression } from "./expressions";
import { poses, type Pose } from "./poses";

export type BoltProps = {
  pose?: Pose;
  expression?: Expression;
  /** 0 = closed, 1 = fully open. Driven by audio amplitude for lip sync. */
  mouthOpen?: number;
  /** 0 = off, 1 = bright. */
  antennaGlow?: number;
  blink?: boolean;
  /** Extra degrees applied to the right forearm (wave animation). */
  armWaveDeg?: number;
  /** Extra vertical offset in SVG units (idle bob). */
  bob?: number;
  /** Render size in px (width). Height follows the 400×500 viewBox. */
  size?: number;
  style?: React.CSSProperties;
  /** Unique id prefix so several Bolts on one page don't share gradient ids. */
  idPrefix?: string;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Bolt — a small, round, friendly robot. Pure SVG, no hooks, fully deterministic
 * from props so he looks identical in every video.
 */
export const Bolt: React.FC<BoltProps> = ({
  pose = "idle",
  expression = "happy",
  mouthOpen = 0,
  antennaGlow = 0,
  blink = false,
  armWaveDeg = 0,
  bob = 0,
  size = 400,
  style,
  idPrefix = "bolt",
}) => {
  const p = poses[pose];
  const e = expressions[expression];
  const open = clamp01(mouthOpen);
  const glow = clamp01(Math.max(antennaGlow, e.glow));

  const cx = 200;
  const bodyCy = 268 - p.lift + bob;
  const eyeY = bodyCy - 46;
  const eyeDx = 46;
  const mouthY = bodyCy + 32;

  // Mouth geometry: closed = thick smile line, open = rounded dark mouth.
  const smile = e.smile * (1 - open * 0.45);
  const w = 26 * e.mouthWidth + 8 * open;
  const h = 3 + 34 * open;
  const topCtrl = mouthY + 12 * smile - h * 0.25;
  const bottomCtrl = mouthY + 12 * smile + h;
  const mouthPath = `M ${cx - w} ${mouthY} Q ${cx} ${topCtrl} ${cx + w} ${mouthY} Q ${cx} ${bottomCtrl} ${cx - w} ${mouthY} Z`;

  const blinkScale = blink ? 0.08 : 1;

  const Eye = ({ x, side }: { x: number; side: "l" | "r" }) => {
    const rx = 34 * e.eyeScale;
    const ry = 38 * e.eyeScale;
    const [px, py] = e.pupilOffset;
    return (
      <g transform={`translate(${x} ${eyeY}) scale(1 ${blinkScale})`}>
        <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={colors.white} stroke={colors.ink} strokeWidth={5} />
        <circle cx={px} cy={py + 2} r={16} fill={colors.ink} />
        <circle cx={px - 6} cy={py - 6} r={6} fill={colors.white} />
        <circle cx={px + 6} cy={py + 6} r={2.6} fill={colors.white} opacity={0.9} />
        {e.sparkle ? (
          <path
            d={side === "l" ? "M -22 -30 l 3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" : "M 22 -30 l 3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z"}
            fill={colors.boltAccent}
          />
        ) : null}
      </g>
    );
  };

  const Brow = ({ x, index }: { x: number; index: 0 | 1 }) => {
    const angle = e.browAngle[index] * (index === 0 ? 1 : -1);
    const lift = e.browLift[index];
    const y = eyeY - 52 - lift;
    return (
      <g transform={`translate(${x} ${y}) rotate(${angle})`}>
        <line x1={-22} y1={0} x2={22} y2={0} stroke={colors.ink} strokeWidth={9} strokeLinecap="round" />
      </g>
    );
  };

  const Arm = ({ side }: { side: "l" | "r" }) => {
    const i = side === "l" ? 0 : 1;
    const sx = side === "l" ? cx - 118 : cx + 118;
    const sy = bodyCy + 4;
    const dir = side === "l" ? 1 : -1;
    const shoulder = p.armAngle[i];
    const elbow = p.elbowAngle[i] + (side === "r" ? armWaveDeg : 0);
    const upper = 52;
    const fore = 44;
    const thinkHand = p.handToChin && side === "r";
    return (
      <g transform={`translate(${sx} ${sy}) rotate(${shoulder})`}>
        <rect x={-15} y={-10} width={30} height={upper + 10} rx={15} fill={colors.boltBody} stroke={colors.ink} strokeWidth={5} />
        <circle cx={0} cy={0} r={11} fill={colors.boltBodyDark} />
        <g transform={`translate(0 ${upper}) rotate(${elbow})`}>
          <rect x={-13} y={-8} width={26} height={fore + 8} rx={13} fill={colors.boltBody} stroke={colors.ink} strokeWidth={5} />
          {p.pointing && side === "r" ? (
            <g transform={`translate(0 ${fore + 6})`}>
              <circle cx={0} cy={0} r={19} fill={colors.boltBelly} stroke={colors.ink} strokeWidth={5} />
              <rect x={-8} y={10} width={16} height={30} rx={8} fill={colors.boltBelly} stroke={colors.ink} strokeWidth={5} transform={`rotate(${-dir * 15})`} />
            </g>
          ) : (
            <g transform={`translate(0 ${fore + 6}) ${thinkHand ? "scale(1.05)" : ""}`}>
              <circle cx={0} cy={0} r={20} fill={colors.boltBelly} stroke={colors.ink} strokeWidth={5} />
              <path d="M -9 -6 q 9 8 18 0" stroke={colors.ink} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.6} />
            </g>
          )}
        </g>
      </g>
    );
  };

  const feetY = bodyCy + 128 - p.feetTuck * 26;
  const g = idPrefix;

  return (
    <svg viewBox="0 0 400 500" width={size} height={size * 1.25} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${g}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.boltAccent} stopOpacity={0.95} />
          <stop offset="55%" stopColor={colors.boltAccent} stopOpacity={0.35} />
          <stop offset="100%" stopColor={colors.boltAccent} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${g}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5C93FF" />
          <stop offset="100%" stopColor={colors.boltBody} />
        </linearGradient>
        <clipPath id={`${g}-bodyclip`}>
          <ellipse cx={cx} cy={bodyCy} rx={126} ry={138} />
        </clipPath>
      </defs>

      <g transform={`rotate(${p.tilt} ${cx} ${bodyCy + 140})`}>
        {/* shadow on the ground */}
        <ellipse cx={cx} cy={410} rx={110 - p.lift * 0.4} ry={16 - p.lift * 0.06} fill={colors.ink} opacity={0.12} />

        {/* antenna */}
        <g transform={`translate(${cx} ${bodyCy - 138})`}>
          <rect x={-6} y={-38} width={12} height={44} rx={6} fill={colors.ink} />
          <circle cx={0} cy={-46} r={54} fill={`url(#${g}-glow)`} opacity={glow} />
          <circle cx={0} cy={-46} r={17} fill={colors.boltAccent} stroke={colors.ink} strokeWidth={5} />
          <circle cx={-5} cy={-51} r={5} fill={colors.white} opacity={0.7 + glow * 0.3} />
        </g>

        {/* feet */}
        <g>
          <rect x={cx - 100} y={feetY} width={78} height={36} rx={18} fill={colors.boltBodyDark} stroke={colors.ink} strokeWidth={5} />
          <rect x={cx + 22} y={feetY} width={78} height={36} rx={18} fill={colors.boltBodyDark} stroke={colors.ink} strokeWidth={5} />
        </g>

        {/* left arm behind body for a cleaner silhouette */}
        <Arm side="l" />

        {/* body */}
        <ellipse cx={cx} cy={bodyCy} rx={126} ry={138} fill={`url(#${g}-body)`} stroke={colors.ink} strokeWidth={6} />
        <g clipPath={`url(#${g}-bodyclip)`}>
          <ellipse cx={cx} cy={bodyCy + 118} rx={150} ry={62} fill={colors.boltBodyDark} opacity={0.55} />
          <ellipse cx={cx - 62} cy={bodyCy - 78} rx={40} ry={26} fill={colors.white} opacity={0.32} transform={`rotate(-28 ${cx - 62} ${bodyCy - 78})`} />
        </g>

        {/* side bolts (ears) */}
        <circle cx={cx - 124} cy={bodyCy - 30} r={15} fill={colors.boltBodyDark} stroke={colors.ink} strokeWidth={5} />
        <circle cx={cx + 124} cy={bodyCy - 30} r={15} fill={colors.boltBodyDark} stroke={colors.ink} strokeWidth={5} />
        <circle cx={cx - 124} cy={bodyCy - 30} r={5} fill={colors.boltAccent} />
        <circle cx={cx + 124} cy={bodyCy - 30} r={5} fill={colors.boltAccent} />

        {/* chest button */}
        <circle cx={cx} cy={bodyCy + 88} r={13} fill={colors.boltAccent} stroke={colors.ink} strokeWidth={4} />
        <circle cx={cx - 3} cy={bodyCy + 85} r={4} fill={colors.white} opacity={0.8} />

        {/* face */}
        <circle cx={cx - 84} cy={bodyCy + 4} r={17} fill={colors.boltCheek} opacity={e.cheekOpacity} />
        <circle cx={cx + 84} cy={bodyCy + 4} r={17} fill={colors.boltCheek} opacity={e.cheekOpacity} />
        <Eye x={cx - eyeDx} side="l" />
        <Eye x={cx + eyeDx} side="r" />
        <Brow x={cx - eyeDx} index={0} />
        <Brow x={cx + eyeDx} index={1} />
        <path d={mouthPath} fill={colors.ink} stroke={colors.ink} strokeWidth={6} strokeLinejoin="round" />
        {open > 0.35 ? (
          <ellipse cx={cx} cy={mouthY + 12 * smile + h * 0.72} rx={w * 0.45} ry={Math.max(2, h * 0.22)} fill={colors.boltCheek} opacity={Math.min(1, (open - 0.35) * 2.2)} />
        ) : null}

        {/* right arm in front */}
        <Arm side="r" />
      </g>
    </svg>
  );
};
