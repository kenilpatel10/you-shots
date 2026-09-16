import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, random } from "remotion";
import { categoryPalettes, colors } from "../theme";

type Props = { category: string; width: number; height: number };

const Sun: React.FC<{ x: number; y: number; r: number; color: string }> = ({ x, y, r, color }) => (
  <g>
    <circle cx={x} cy={y} r={r * 1.6} fill={color} opacity={0.18} />
    <circle cx={x} cy={y} r={r} fill={color} />
  </g>
);

const Cloud: React.FC<{ x: number; y: number; s: number; opacity?: number }> = ({ x, y, s, opacity = 0.9 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
    <ellipse cx={0} cy={0} rx={70} ry={38} fill={colors.white} />
    <circle cx={-40} cy={8} r={34} fill={colors.white} />
    <circle cx={42} cy={6} r={40} fill={colors.white} />
    <circle cx={4} cy={-18} r={44} fill={colors.white} />
  </g>
);

const Hills: React.FC<{ w: number; h: number; color: string; y: number; phase?: number }> = ({ w, h, color, y, phase = 0 }) => (
  <path d={`M 0 ${y + 80 + phase} Q ${w * 0.25} ${y - 60} ${w * 0.5} ${y + 40} T ${w} ${y} L ${w} ${h} L 0 ${h} Z`} fill={color} />
);

const Stars: React.FC<{ w: number; h: number; t: number; n?: number }> = ({ w, h, t, n = 60 }) => (
  <g>
    {Array.from({ length: n }).map((_, i) => {
      const x = random(`sx${i}`) * w;
      const y = random(`sy${i}`) * h * 0.75;
      const r = 2 + random(`sr${i}`) * 4;
      const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + random(`st${i}`)) * Math.PI * 2 + i);
      return <circle key={i} cx={x} cy={y} r={r} fill="#FFF6D5" opacity={tw} />;
    })}
  </g>
);

/**
 * One calm, simple SVG background per topic category. Motion is slow and low-contrast so it
 * stays comfortable for young children.
 */
export const Background: React.FC<Props> = ({ category, width: w, height: h }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pal = categoryPalettes[category] ?? categoryPalettes["everyday-things"]!;
  const drift = (t * 14) % (w + 400);
  const groundY = h * 0.72;

  let scene: React.ReactNode;
  switch (category) {
    case "space":
      scene = (
        <>
          <Stars w={w} h={h} t={t} />
          <circle cx={w * 0.82} cy={h * 0.2} r={70} fill="#FFF1B8" />
          <circle cx={w * 0.79} cy={h * 0.19} r={62} fill="#FFF8DC" />
          <g transform={`translate(${w * 0.2} ${h * 0.82}) rotate(-18)`}>
            <circle r={90} fill="#F28C6B" />
            <ellipse rx={150} ry={26} fill="none" stroke="#FFD166" strokeWidth={14} opacity={0.9} />
          </g>
          <Hills w={w} h={h} color={pal.ground} y={h * 0.88} />
        </>
      );
      break;
    case "ocean":
      scene = (
        <>
          <Sun x={w * 0.8} y={h * 0.16} r={60} color="#FFD166" />
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M ${-400 + ((t * (20 + i * 8)) % 400)} ${groundY + i * 70} q 100 -40 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 L ${w + 400} ${h} L -400 ${h} Z`}
              fill={i === 0 ? "#6EC4F0" : i === 1 ? "#3FA9E0" : pal.ground}
              opacity={0.95}
            />
          ))}
          {Array.from({ length: 14 }).map((_, i) => {
            const x = random(`bx${i}`) * w;
            const y = h - ((t * (40 + random(`bv${i}`) * 40) + random(`by${i}`) * h) % (h * 0.3));
            return <circle key={i} cx={x} cy={y} r={6 + random(`br${i}`) * 10} fill={colors.white} opacity={0.35} />;
          })}
        </>
      );
      break;
    case "dinosaurs":
      scene = (
        <>
          <Sun x={w * 0.22} y={h * 0.16} r={64} color="#FFB627" />
          <path d={`M ${w * 0.55} ${groundY} L ${w * 0.75} ${h * 0.42} L ${w * 0.95} ${groundY} Z`} fill="#8C7B6B" />
          <path d={`M ${w * 0.7} ${h * 0.5} L ${w * 0.75} ${h * 0.42} L ${w * 0.8} ${h * 0.5} Z`} fill="#E8D9C5" />
          <Hills w={w} h={h} color={pal.ground} y={groundY} />
          {[0.1, 0.3, 0.9].map((fx, i) => (
            <g key={i} transform={`translate(${w * fx} ${groundY + 40}) scale(${1 + i * 0.2})`}>
              {[-30, -10, 10, 30].map((a) => (
                <path key={a} d="M 0 0 q 10 -80 0 -160" stroke="#5E8C3A" strokeWidth={10} fill="none" strokeLinecap="round" transform={`rotate(${a + Math.sin(t + a) * 2})`} />
              ))}
            </g>
          ))}
        </>
      );
      break;
    case "how-things-work":
      scene = (
        <>
          {[
            { x: w * 0.15, y: h * 0.2, r: 90, s: 1 },
            { x: w * 0.85, y: h * 0.3, r: 120, s: -0.75 },
            { x: w * 0.8, y: h * 0.9, r: 140, s: 0.6 },
          ].map((g, i) => (
            <g key={i} transform={`translate(${g.x} ${g.y}) rotate(${t * 12 * g.s})`} opacity={0.5}>
              {Array.from({ length: 10 }).map((_, k) => (
                <rect key={k} x={-14} y={-g.r - 18} width={28} height={36} rx={6} fill="#8E85F2" transform={`rotate(${k * 36})`} />
              ))}
              <circle r={g.r} fill="#A9A2F7" />
              <circle r={g.r * 0.35} fill={pal.sky} />
            </g>
          ))}
          <Hills w={w} h={h} color={pal.ground} y={groundY + 60} />
        </>
      );
      break;
    case "feelings-friendship":
      scene = (
        <>
          {Array.from({ length: 10 }).map((_, i) => {
            const x = random(`hx${i}`) * w;
            const y = h - ((t * (25 + random(`hv${i}`) * 20) + random(`hy${i}`) * h) % (h * 1.1));
            const s = 0.5 + random(`hs${i}`) * 0.8;
            return (
              <path key={i} transform={`translate(${x} ${y}) scale(${s})`} d="M 0 20 C -40 -10 -30 -50 0 -30 C 30 -50 40 -10 0 20 Z" fill="#FF9EC7" opacity={0.45} />
            );
          })}
          <Hills w={w} h={h} color={pal.ground} y={groundY + 40} />
        </>
      );
      break;
    case "human-body":
      scene = (
        <>
          {Array.from({ length: 12 }).map((_, i) => (
            <circle key={i} cx={random(`cx${i}`) * w} cy={random(`cy${i}`) * h} r={30 + random(`cr${i}`) * 60} fill="#FFB3C1" opacity={0.25 + 0.1 * Math.sin(t + i)} />
          ))}
          <Hills w={w} h={h} color={pal.ground} y={groundY + 60} />
        </>
      );
      break;
    case "food":
      scene = (
        <>
          <Sun x={w * 0.8} y={h * 0.16} r={58} color="#FFD166" />
          <rect x={0} y={groundY} width={w} height={h - groundY} fill={pal.ground} />
          <rect x={0} y={groundY} width={w} height={26} fill="#E8B27A" />
          {[0.15, 0.5, 0.85].map((fx, i) => (
            <g key={i} transform={`translate(${w * fx} ${groundY - 10})`}>
              <ellipse rx={90} ry={22} fill="#FFF3E0" />
              <circle cx={-20} cy={-26} r={26} fill={["#FF6B6B", "#FFB627", "#8BD17C"][i]} />
              <circle cx={22} cy={-22} r={22} fill={["#FFB627", "#8BD17C", "#FF6B6B"][i]} />
            </g>
          ))}
        </>
      );
      break;
    case "everyday-things":
      scene = (
        <>
          <rect x={w * 0.62} y={h * 0.16} width={w * 0.3} height={h * 0.28} rx={20} fill="#BFE3FF" stroke="#FFFFFF" strokeWidth={16} />
          <line x1={w * 0.77} y1={h * 0.16} x2={w * 0.77} y2={h * 0.44} stroke="#FFFFFF" strokeWidth={12} />
          <line x1={w * 0.62} y1={h * 0.3} x2={w * 0.92} y2={h * 0.3} stroke="#FFFFFF" strokeWidth={12} />
          <Cloud x={w * 0.72 + Math.sin(t / 3) * 8} y={h * 0.25} s={0.5} opacity={0.9} />
          <rect x={0} y={groundY} width={w} height={h - groundY} fill={pal.ground} />
          <rect x={w * 0.05} y={groundY - 120} width={w * 0.3} height={120} rx={14} fill="#D9A066" />
          <rect x={w * 0.08} y={groundY - 210} width={40} height={90} rx={8} fill="#FF6B6B" />
          <rect x={w * 0.13} y={groundY - 190} width={40} height={70} rx={8} fill="#3C7DFF" />
          <rect x={w * 0.18} y={groundY - 200} width={40} height={80} rx={8} fill="#8BD17C" />
        </>
      );
      break;
    case "weather-nature":
      scene = (
        <>
          <Sun x={w * 0.78} y={h * 0.14} r={64} color="#FFD166" />
          <Cloud x={((drift + 200) % (w + 400)) - 200} y={h * 0.2} s={1.1} />
          <Cloud x={((drift * 0.6 + 700) % (w + 400)) - 200} y={h * 0.32} s={0.8} opacity={0.8} />
          <Hills w={w} h={h} color="#8CCB7F" y={groundY - 40} phase={20} />
          <Hills w={w} h={h} color={pal.ground} y={groundY + 60} />
          <g transform={`translate(${w * 0.12} ${groundY + 20})`}>
            <rect x={-14} y={-10} width={28} height={110} rx={10} fill="#8B5E3C" />
            <circle cx={0} cy={-60} r={70} fill="#5FAF57" />
            <circle cx={-45} cy={-30} r={45} fill="#6DBE66" />
            <circle cx={45} cy={-35} r={48} fill="#6DBE66" />
          </g>
        </>
      );
      break;
    case "animals":
    default:
      scene = (
        <>
          <Sun x={w * 0.8} y={h * 0.14} r={62} color="#FFD166" />
          <Cloud x={((drift + 100) % (w + 400)) - 200} y={h * 0.22} s={1} />
          <Cloud x={((drift * 0.7 + 600) % (w + 400)) - 200} y={h * 0.34} s={0.7} opacity={0.85} />
          <Hills w={w} h={h} color="#B6E39E" y={groundY - 30} />
          <Hills w={w} h={h} color={pal.ground} y={groundY + 70} phase={30} />
          <g transform={`translate(${w * 0.88} ${groundY + 20})`}>
            <rect x={-12} y={-10} width={24} height={100} rx={8} fill="#8B5E3C" />
            <circle cx={0} cy={-50} r={64} fill="#5FAF57" />
            <circle cx={-40} cy={-20} r={40} fill="#6DBE66" />
          </g>
          {[0.2, 0.45].map((fx, i) => (
            <g key={i} transform={`translate(${w * fx} ${groundY + 120 + i * 30})`}>
              <ellipse rx={18} ry={10} fill="#F4A261" />
              <circle cx={-20} cy={-6} r={8} fill="#F4A261" />
            </g>
          ))}
        </>
      );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: pal.sky }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="bg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={pal.sky} />
            <stop offset="100%" stopColor={category === "space" ? "#22307A" : "#FFFFFF"} stopOpacity={category === "space" ? 1 : 0.55} />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={w} height={h} fill="url(#bg-sky)" />
        {scene}
      </svg>
    </AbsoluteFill>
  );
};
