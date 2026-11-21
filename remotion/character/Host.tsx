import React from "react";
import { colors } from "../theme";
import { expressions, type Expression } from "./expressions";
import { poses, type Pose } from "./poses";
import { shade } from "./Bolt";
import { DEFAULT_HOST_LOOK, type HostLook } from "./hostLook";

export type HostProps = {
  look?: Partial<HostLook> | undefined;
  pose?: Pose;
  expression?: Expression;
  /** 0 = closed, 1 = fully open (lip sync). */
  mouthOpen?: number;
  /** "Idea" glow: a small light bulb above the head on the wow beat (Bolt's antenna equivalent). */
  antennaGlow?: number;
  blink?: boolean;
  armWaveDeg?: number;
  bob?: number;
  /** Render size in px (width). Height follows the 400×500 viewBox, like Bolt. */
  size?: number;
  style?: React.CSSProperties;
  idPrefix?: string;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * The human host: a friendly, flat-shaded cartoon presenter in the same 400×500 frame and with the
 * same pose/expression/lip-sync inputs as Bolt, so every scene works unchanged. Pure SVG.
 */
export const Host: React.FC<HostProps> = ({ look: lookIn, pose = "idle", expression = "happy", mouthOpen = 0, antennaGlow = 0, blink = false, armWaveDeg = 0, bob = 0, size = 400, style, idPrefix = "host" }) => {
  const look: HostLook = { ...DEFAULT_HOST_LOOK, ...(lookIn ?? {}) };
  const p = poses[pose];
  const e = expressions[expression];
  const open = clamp01(mouthOpen);
  const glow = clamp01(Math.max(antennaGlow, e.glow));
  const skinDark = shade(look.skin, -0.18);
  const hairDark = shade(look.hairColor, -0.25);
  const outfitDark = shade(look.outfitColor, -0.22);
  const g = idPrefix;

  const cx = 200;
  const lift = p.lift * 0.6;
  const headCy = 212 - lift + bob;
  const headRx = 88;
  const headRy = 100;
  const eyeY = headCy - 6;
  const eyeDx = 36;
  const mouthY = headCy + 56;
  const shoulderY = 352 - lift + bob;

  // Mouth: closed = smile line, open = dark mouth with a hint of teeth.
  const smile = e.smile * (1 - open * 0.45);
  const w = 20 * e.mouthWidth + 6 * open;
  const h = 3 + 28 * open;
  const topCtrl = mouthY + 10 * smile - h * 0.25;
  const bottomCtrl = mouthY + 10 * smile + h;
  const mouthPath = `M ${cx - w} ${mouthY} Q ${cx} ${topCtrl} ${cx + w} ${mouthY} Q ${cx} ${bottomCtrl} ${cx - w} ${mouthY} Z`;
  const blinkScale = blink ? 0.08 : 1;

  const Eye = ({ x }: { x: number }) => {
    const rx = 19 * e.eyeScale;
    const ry = 21 * e.eyeScale;
    const [px, py] = e.pupilOffset;
    return (
      <g transform={`translate(${x} ${eyeY}) scale(1 ${blinkScale})`}>
        <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={colors.white} stroke={colors.ink} strokeWidth={3.5} />
        <circle cx={px * 0.6} cy={py * 0.6 + 1} r={10} fill={look.eyeColor} />
        <circle cx={px * 0.6} cy={py * 0.6 + 1} r={5.5} fill={colors.ink} />
        <circle cx={px * 0.6 - 4} cy={py * 0.6 - 4} r={3} fill={colors.white} />
        {e.sparkle ? <circle cx={px * 0.6 + 5} cy={py * 0.6 + 5} r={1.8} fill={colors.white} /> : null}
      </g>
    );
  };

  const Brow = ({ x, index }: { x: number; index: 0 | 1 }) => {
    const angle = e.browAngle[index] * (index === 0 ? 1 : -1);
    const liftB = e.browLift[index];
    return (
      <g transform={`translate(${x} ${eyeY - 36 - liftB}) rotate(${angle})`}>
        <path d="M -20 2 Q 0 -6 20 2" stroke={hairDark} strokeWidth={7} strokeLinecap="round" fill="none" />
      </g>
    );
  };

  const Arm = ({ side }: { side: "l" | "r" }) => {
    const i = side === "l" ? 0 : 1;
    const sx = side === "l" ? cx - 122 : cx + 122;
    const dir = side === "l" ? 1 : -1;
    const shoulder = p.armAngle[i];
    const elbow = p.elbowAngle[i] + (side === "r" ? armWaveDeg : 0);
    const upper = 58;
    const fore = 48;
    const sleeve = look.outfit === "tee" ? 28 : upper + 8;
    return (
      <g transform={`translate(${sx} ${shoulderY + 6}) rotate(${shoulder})`}>
        <rect x={-16} y={-12} width={32} height={upper + 12} rx={16} fill={look.skin} stroke={colors.ink} strokeWidth={4.5} />
        <rect x={-17} y={-13} width={34} height={sleeve} rx={16} fill={look.outfitColor} stroke={colors.ink} strokeWidth={4.5} />
        <g transform={`translate(0 ${upper}) rotate(${elbow})`}>
          <rect x={-14} y={-8} width={28} height={fore + 8} rx={14} fill={look.skin} stroke={colors.ink} strokeWidth={4.5} />
          {look.outfit !== "tee" ? <rect x={-15} y={-9} width={30} height={14} rx={7} fill={outfitDark} stroke={colors.ink} strokeWidth={3} /> : null}
          {p.pointing && side === "r" ? (
            <g transform={`translate(0 ${fore + 6})`}>
              <circle cx={0} cy={0} r={19} fill={look.skin} stroke={colors.ink} strokeWidth={4.5} />
              <rect x={-7} y={10} width={14} height={30} rx={7} fill={look.skin} stroke={colors.ink} strokeWidth={4.5} transform={`rotate(${-dir * 15})`} />
            </g>
          ) : (
            <g transform={`translate(0 ${fore + 6})`}>
              <circle cx={0} cy={0} r={20} fill={look.skin} stroke={colors.ink} strokeWidth={4.5} />
              <path d="M -9 -4 q 9 7 18 0" stroke={skinDark} strokeWidth={3.5} fill="none" strokeLinecap="round" />
            </g>
          )}
        </g>
      </g>
    );
  };

  const hairBack = (() => {
    switch (look.hair) {
      case "none":
        return null;
      case "buzz":
        return <ellipse cx={cx} cy={headCy - 42} rx={headRx + 2} ry={62} fill={look.hairColor} opacity={0.92} />;
      case "curly":
        return (
          <g fill={look.hairColor}>
            <ellipse cx={cx} cy={headCy - 40} rx={headRx + 14} ry={78} />
            {Array.from({ length: 9 }).map((_, i) => {
              const a = Math.PI + (i / 8) * Math.PI;
              return <circle key={i} cx={cx + Math.cos(a) * (headRx + 10)} cy={headCy - 36 + Math.sin(a) * 72} r={24} />;
            })}
          </g>
        );
      case "long":
        return (
          <g fill={look.hairColor}>
            <ellipse cx={cx} cy={headCy - 36} rx={headRx + 10} ry={80} />
            <path d={`M ${cx - headRx - 8} ${headCy - 20} Q ${cx - headRx - 22} ${headCy + 120} ${cx - headRx + 4} ${headCy + 170} L ${cx - headRx + 46} ${headCy + 170} Q ${cx - headRx + 24} ${headCy + 80} ${cx - headRx + 30} ${headCy - 10} Z`} />
            <path d={`M ${cx + headRx + 8} ${headCy - 20} Q ${cx + headRx + 22} ${headCy + 120} ${cx + headRx - 4} ${headCy + 170} L ${cx + headRx - 46} ${headCy + 170} Q ${cx + headRx - 24} ${headCy + 80} ${cx + headRx - 30} ${headCy - 10} Z`} />
          </g>
        );
      case "bun":
        return (
          <g fill={look.hairColor}>
            <ellipse cx={cx} cy={headCy - 40} rx={headRx + 6} ry={70} />
            <circle cx={cx} cy={headCy - headRy - 22} r={34} stroke={colors.ink} strokeWidth={4} />
          </g>
        );
      case "side":
      case "short":
      default:
        return <ellipse cx={cx} cy={headCy - 40} rx={headRx + 8} ry={72} fill={look.hairColor} />;
    }
  })();

  const hairFront = (() => {
    const top = headCy - headRy;
    switch (look.hair) {
      case "none":
      case "buzz":
        return null;
      case "side":
        return <path d={`M ${cx - headRx + 2} ${top + 70} Q ${cx - headRx + 10} ${top + 10} ${cx + 10} ${top + 4} Q ${cx + 80} ${top + 2} ${cx + headRx - 4} ${top + 58} Q ${cx + 40} ${top + 24} ${cx - 20} ${top + 46} Q ${cx - 50} ${top + 60} ${cx - headRx + 2} ${top + 70} Z`} fill={look.hairColor} />;
      case "curly":
        return (
          <g fill={look.hairColor}>
            {[-56, -20, 16, 52].map((dx, i) => (
              <circle key={i} cx={cx + dx} cy={top + 14 + (i % 2) * 8} r={22} />
            ))}
          </g>
        );
      case "long":
      case "bun":
      case "short":
      default:
        return <path d={`M ${cx - headRx + 4} ${top + 64} Q ${cx - headRx + 12} ${top + 6} ${cx} ${top + 4} Q ${cx + headRx - 12} ${top + 6} ${cx + headRx - 4} ${top + 64} Q ${cx + 50} ${top + 30} ${cx + 12} ${top + 40} Q ${cx - 40} ${top + 48} ${cx - headRx + 4} ${top + 64} Z`} fill={look.hairColor} />;
    }
  })();

  const facialHair = (() => {
    const chin = headCy + headRy;
    switch (look.facialHair) {
      case "none":
        return null;
      case "moustache":
        return <path d={`M ${cx - 30} ${mouthY - 10} Q ${cx - 16} ${mouthY - 30} ${cx} ${mouthY - 18} Q ${cx + 16} ${mouthY - 30} ${cx + 30} ${mouthY - 10} Q ${cx + 14} ${mouthY - 6} ${cx} ${mouthY - 10} Q ${cx - 14} ${mouthY - 6} ${cx - 30} ${mouthY - 10} Z`} fill={look.hairColor} />;
      case "goatee":
        return (
          <g fill={look.hairColor}>
            <path d={`M ${cx - 26} ${mouthY + 10} Q ${cx - 30} ${chin + 2} ${cx} ${chin + 4} Q ${cx + 30} ${chin + 2} ${cx + 26} ${mouthY + 10} Q ${cx} ${mouthY + 22} ${cx - 26} ${mouthY + 10} Z`} />
            <path d={`M ${cx - 30} ${mouthY - 10} Q ${cx - 16} ${mouthY - 28} ${cx} ${mouthY - 18} Q ${cx + 16} ${mouthY - 28} ${cx + 30} ${mouthY - 10} Q ${cx + 14} ${mouthY - 6} ${cx} ${mouthY - 10} Q ${cx - 14} ${mouthY - 6} ${cx - 30} ${mouthY - 10} Z`} />
          </g>
        );
      case "stubble":
      case "beard":
      default:
        return (
          <path
            d={`M ${cx - headRx + 2} ${headCy + 6} Q ${cx - headRx + 4} ${chin - 4} ${cx} ${chin + 3} Q ${cx + headRx - 4} ${chin - 4} ${cx + headRx - 2} ${headCy + 6} L ${cx + headRx - 14} ${headCy + 34} Q ${cx + headRx - 34} ${mouthY + 22} ${cx} ${mouthY + 20} Q ${cx - headRx + 34} ${mouthY + 22} ${cx - headRx + 14} ${headCy + 34} Z`}
            fill={look.hairColor}
            opacity={look.facialHair === "stubble" ? 0.4 : 1}
          />
        );
    }
  })();

  const glasses = (() => {
    if (look.glasses === "none") return null;
    const c = look.glassesColor;
    if (look.glasses === "round") {
      return (
        <g fill="none" stroke={c} strokeWidth={5}>
          <circle cx={cx - eyeDx} cy={eyeY} r={30} />
          <circle cx={cx + eyeDx} cy={eyeY} r={30} />
          <line x1={cx - 6} y1={eyeY - 4} x2={cx + 6} y2={eyeY - 4} />
          <line x1={cx - eyeDx - 30} y1={eyeY - 4} x2={cx - headRx} y2={eyeY - 10} />
          <line x1={cx + eyeDx + 30} y1={eyeY - 4} x2={cx + headRx} y2={eyeY - 10} />
        </g>
      );
    }
    return (
      <g fill="none" stroke={c} strokeWidth={5}>
        <rect x={cx - eyeDx - 30} y={eyeY - 24} width={60} height={46} rx={10} />
        <rect x={cx + eyeDx - 30} y={eyeY - 24} width={60} height={46} rx={10} />
        <line x1={cx - 6} y1={eyeY - 6} x2={cx + 6} y2={eyeY - 6} />
        <line x1={cx - eyeDx - 30} y1={eyeY - 6} x2={cx - headRx} y2={eyeY - 12} />
        <line x1={cx + eyeDx + 30} y1={eyeY - 6} x2={cx + headRx} y2={eyeY - 12} />
      </g>
    );
  })();

  const accessory = (() => {
    const top = headCy - headRy;
    if (look.accessory === "headphones") {
      return (
        <g>
          <path d={`M ${cx - headRx - 6} ${headCy} Q ${cx - headRx - 10} ${top - 14} ${cx} ${top - 18} Q ${cx + headRx + 10} ${top - 14} ${cx + headRx + 6} ${headCy}`} fill="none" stroke={look.accessoryColor} strokeWidth={12} strokeLinecap="round" />
          <rect x={cx - headRx - 22} y={headCy - 24} width={30} height={54} rx={12} fill={look.accessoryColor} stroke={colors.ink} strokeWidth={4} />
          <rect x={cx + headRx - 8} y={headCy - 24} width={30} height={54} rx={12} fill={look.accessoryColor} stroke={colors.ink} strokeWidth={4} />
          <circle cx={cx - headRx - 7} cy={headCy + 3} r={7} fill={colors.boltAccent} />
          <circle cx={cx + headRx + 7} cy={headCy + 3} r={7} fill={colors.boltAccent} />
        </g>
      );
    }
    if (look.accessory === "cap") {
      return (
        <g>
          <path d={`M ${cx - headRx - 4} ${top + 58} Q ${cx - headRx} ${top - 20} ${cx} ${top - 22} Q ${cx + headRx} ${top - 20} ${cx + headRx + 4} ${top + 58} Z`} fill={look.accessoryColor} stroke={colors.ink} strokeWidth={4} />
          <path d={`M ${cx - 30} ${top + 56} L ${cx + headRx + 60} ${top + 50} Q ${cx + headRx + 70} ${top + 64} ${cx + headRx + 50} ${top + 72} L ${cx - 30} ${top + 70} Z`} fill={shade(look.accessoryColor, -0.2)} stroke={colors.ink} strokeWidth={4} />
          <rect x={cx - headRx - 4} y={top + 50} width={headRx * 2 + 8} height={16} rx={6} fill={shade(look.accessoryColor, -0.2)} stroke={colors.ink} strokeWidth={3} />
        </g>
      );
    }
    return null;
  })();

  const torso = (() => {
    const y = shoulderY;
    const body = `M ${cx - 150} 500 L ${cx - 150} ${y + 70} Q ${cx - 150} ${y - 8} ${cx - 70} ${y - 14} L ${cx - 30} ${y - 22} L ${cx + 30} ${y - 22} L ${cx + 70} ${y - 14} Q ${cx + 150} ${y - 8} ${cx + 150} ${y + 70} L ${cx + 150} 500 Z`;
    return (
      <g>
        {look.outfit === "hoodie" ? <path d={`M ${cx - 78} ${y + 8} Q ${cx - 92} ${y - 60} ${cx} ${y - 70} Q ${cx + 92} ${y - 60} ${cx + 78} ${y + 8} Z`} fill={outfitDark} stroke={colors.ink} strokeWidth={4.5} /> : null}
        <path d={body} fill={look.outfitColor} stroke={colors.ink} strokeWidth={5} strokeLinejoin="round" />
        {look.outfit === "hoodie" ? (
          <g>
            <path d={`M ${cx - 60} ${y - 10} Q ${cx} ${y + 40} ${cx + 60} ${y - 10}`} fill="none" stroke={outfitDark} strokeWidth={5} />
            <line x1={cx - 16} y1={y + 24} x2={cx - 20} y2={y + 110} stroke={look.outfitAccent} strokeWidth={6} strokeLinecap="round" />
            <line x1={cx + 16} y1={y + 24} x2={cx + 20} y2={y + 110} stroke={look.outfitAccent} strokeWidth={6} strokeLinecap="round" />
          </g>
        ) : look.outfit === "shirt" ? (
          <g>
            <path d={`M ${cx - 34} ${y - 22} L ${cx} ${y + 26} L ${cx - 6} ${y - 2} Z`} fill={colors.white} stroke={colors.ink} strokeWidth={3.5} />
            <path d={`M ${cx + 34} ${y - 22} L ${cx} ${y + 26} L ${cx + 6} ${y - 2} Z`} fill={colors.white} stroke={colors.ink} strokeWidth={3.5} />
            {[50, 90, 130].map((dy) => (
              <circle key={dy} cx={cx} cy={y + dy} r={4.5} fill={look.outfitAccent} stroke={colors.ink} strokeWidth={2} />
            ))}
          </g>
        ) : (
          <g>
            <path d={`M ${cx - 44} ${y - 20} Q ${cx} ${y + 22} ${cx + 44} ${y - 20}`} fill="none" stroke={outfitDark} strokeWidth={5} />
            <rect x={cx - 34} y={y + 48} width={68} height={54} rx={12} fill={look.outfitAccent} opacity={0.9} />
            <path d={`M ${cx - 18} ${y + 92} l 10 -26 10 26 M ${cx + 4} ${y + 70} l 12 0`} stroke={look.outfitColor} strokeWidth={5} fill="none" strokeLinecap="round" />
          </g>
        )}
      </g>
    );
  })();

  return (
    <svg viewBox="0 0 400 500" width={size} height={size * 1.25} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${g}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.boltAccent} stopOpacity={0.95} />
          <stop offset="55%" stopColor={colors.boltAccent} stopOpacity={0.35} />
          <stop offset="100%" stopColor={colors.boltAccent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={`rotate(${p.tilt} ${cx} 400)`}>
        {/* idea bulb (the wow beat) */}
        {glow > 0.04 ? (
          <g transform={`translate(${cx + 118} ${headCy - headRy - 16})`} opacity={Math.min(1, glow * 1.2)}>
            <circle cx={0} cy={0} r={54} fill={`url(#${g}-glow)`} />
            <circle cx={0} cy={-6} r={18} fill="#FFE37A" stroke={colors.ink} strokeWidth={4} />
            <rect x={-8} y={10} width={16} height={12} rx={4} fill="#CBD5E1" stroke={colors.ink} strokeWidth={3} />
            {[-1, 0, 1].map((k) => (
              <line key={k} x1={k * 26} y1={-40} x2={k * 34} y2={-52} stroke={colors.boltAccent} strokeWidth={4} strokeLinecap="round" />
            ))}
          </g>
        ) : null}

        <Arm side="l" />
        {torso}
        {/* neck */}
        <rect x={cx - 24} y={headCy + headRy - 24} width={48} height={52} rx={14} fill={skinDark} stroke={colors.ink} strokeWidth={4.5} />
        {/* hair behind the head */}
        {hairBack}
        {/* ears */}
        <circle cx={cx - headRx + 2} cy={headCy + 6} r={16} fill={look.skin} stroke={colors.ink} strokeWidth={4} />
        <circle cx={cx + headRx - 2} cy={headCy + 6} r={16} fill={look.skin} stroke={colors.ink} strokeWidth={4} />
        {/* face */}
        <ellipse cx={cx} cy={headCy} rx={headRx} ry={headRy} fill={look.skin} stroke={colors.ink} strokeWidth={5} />
        {facialHair}
        <circle cx={cx - 58} cy={headCy + 30} r={13} fill={colors.boltCheek} opacity={e.cheekOpacity * 0.45} />
        <circle cx={cx + 58} cy={headCy + 30} r={13} fill={colors.boltCheek} opacity={e.cheekOpacity * 0.45} />
        <Eye x={cx - eyeDx} />
        <Eye x={cx + eyeDx} />
        <Brow x={cx - eyeDx} index={0} />
        <Brow x={cx + eyeDx} index={1} />
        {/* nose */}
        <path d={`M ${cx - 4} ${headCy + 12} q -8 18 4 24 q 10 -2 8 -8`} fill="none" stroke={skinDark} strokeWidth={4} strokeLinecap="round" />
        {/* mouth */}
        <path d={mouthPath} fill={colors.ink} stroke={colors.ink} strokeWidth={5} strokeLinejoin="round" />
        {open > 0.45 ? <rect x={cx - w * 0.55} y={mouthY + 10 * smile - 1} width={w * 1.1} height={Math.max(3, h * 0.22)} rx={2} fill={colors.white} opacity={Math.min(1, (open - 0.45) * 2.5)} /> : null}
        {open > 0.35 ? <ellipse cx={cx} cy={mouthY + 10 * smile + h * 0.72} rx={w * 0.4} ry={Math.max(2, h * 0.2)} fill={colors.boltCheek} opacity={Math.min(1, (open - 0.35) * 2.2)} /> : null}
        {glasses}
        {hairFront}
        {accessory}
        <Arm side="r" />
      </g>
    </svg>
  );
};
