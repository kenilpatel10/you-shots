import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { z } from "zod";
import { Character } from "../character/Character";
import { Pip } from "../character/Pip";
import { useFonts } from "../components/useFonts";
import { ChannelPropsZ } from "../schema";
import { colors, fonts } from "../theme";
import { shade } from "../character/Bolt";

/**
 * Channel branding stills: a square avatar (YouTube crops it to a circle) and a 2048×1152 banner
 * whose text stays inside the 1235×338 "safe area" that every device shows.
 */
export const BrandingPropsZ = z.object({ channel: ChannelPropsZ, tagline: z.string() });
export type BrandingProps = z.infer<typeof BrandingPropsZ>;

export const AVATAR_SIZE = 800;
export const BANNER_WIDTH = 2048;
export const BANNER_HEIGHT = 1152;
const SAFE = { w: 1235, h: 338 };

export const Avatar: React.FC<BrandingProps> = ({ channel }) => {
  useFonts();
  // Brand kits recolour the ring and the ground; the default stays Bolt's yellow and grass.
  const ring = channel.brand?.accent ?? colors.accent;
  const ground = channel.brand?.primary ?? "#9FD98A";
  return (
    <AbsoluteFill style={{ backgroundColor: ring, overflow: "hidden" }}>
      <svg width={AVATAR_SIZE} height={AVATAR_SIZE} style={{ position: "absolute", inset: 0 }}>
        <circle cx={400} cy={400} r={400} fill={ring} />
        <circle cx={400} cy={430} r={330} fill={colors.paper} />
        <ellipse cx={400} cy={860} rx={520} ry={150} fill={ground} />
      </svg>
      {channel.brand?.photo ? (
        // The presenter's photo fills the inner circle (YouTube crops the avatar to a circle anyway).
        <Img src={staticFile(channel.brand.photo)} style={{ position: "absolute", left: 70, top: 100, width: 660, height: 660, borderRadius: "50%", objectFit: "cover", border: `14px solid ${colors.paper}`, boxShadow: "0 10px 0 rgba(30,42,68,0.15)" }} />
      ) : (
        /* Bolt's head fills the circle; the body sits below the crop. */
        <div style={{ position: "absolute", left: 130, top: 90 }}>
          <Character host={channel.host} bodyColor={channel.brand?.primary} pose="wave" expression="happy" antennaGlow={1} mouthOpen={0.3} size={540} idPrefix="avatar" />
        </div>
      )}
      {channel.sidekick === false ? null : (
        <div style={{ position: "absolute", left: 540, top: 470 }}>
          <Pip mood="happy" size={190} facing="left" idPrefix="avatar-pip" />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const Banner: React.FC<BrandingProps> = ({ channel, tagline }) => {
  useFonts();
  const left = (BANNER_WIDTH - SAFE.w) / 2;
  const top = (BANNER_HEIGHT - SAFE.h) / 2;
  // Keep the name on one line inside the safe area whatever the script.
  const titleSize = channel.name.length > 14 ? 76 : channel.name.length > 10 ? 92 : 118;
  // Brand kits recolour the sky, the sun and the ground; the default stays Bolt's.
  const primary = channel.brand?.primary ?? colors.primary;
  const accent = channel.brand?.accent ?? colors.accent;
  const sky = channel.brand?.primary ? shade(channel.brand.primary, 0.85) : "#DDEBFF";
  const ground = channel.brand?.primary ?? "#9FD98A";
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${sky} 0%, ${colors.paper} 60%)`, fontFamily: fonts.family, overflow: "hidden" }}>
      <svg width={BANNER_WIDTH} height={BANNER_HEIGHT} style={{ position: "absolute", inset: 0 }}>
        <circle cx={1750} cy={180} r={220} fill={accent} opacity={0.55} />
        <ellipse cx={1024} cy={1180} rx={1300} ry={220} fill={ground} />
        {[220, 560, 1480, 1830].map((x, i) => (
          <circle key={i} cx={x} cy={300 + (i % 2) * 220} r={18 + (i % 3) * 8} fill={primary} opacity={0.12} />
        ))}
      </svg>
      {/* Characters just inside the safe area so they survive the TV/desktop crops. */}
      {channel.brand?.photo ? (
        <Img src={staticFile(channel.brand.photo)} style={{ position: "absolute", left: left + 10, top: top - 10, width: 360, height: 360, borderRadius: 48, objectFit: "cover", border: `10px solid ${colors.white}`, boxShadow: "0 12px 0 rgba(30,42,68,0.14)" }} />
      ) : (
        <div style={{ position: "absolute", left: left - 20, top: top - 120 }}>
          <Character host={channel.host} bodyColor={channel.brand?.primary} pose="point" expression="excited" antennaGlow={1} mouthOpen={0.35} size={360} idPrefix="banner" />
        </div>
      )}
      {channel.sidekick === false ? null : (
        <div style={{ position: "absolute", left: left + SAFE.w - 250, top: top + 90 }}>
          <Pip mood="curious" size={230} facing="left" idPrefix="banner-pip" />
        </div>
      )}
      <div style={{ position: "absolute", left: left + 350, top: top + 30, width: SAFE.w - 620, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontSize: titleSize, lineHeight: 1.05, whiteSpace: "nowrap", fontWeight: fonts.weightBold, color: colors.ink, textShadow: "0 6px 0 rgba(255,255,255,0.9)", letterSpacing: -1 }}>{channel.name}</div>
        <div style={{ marginTop: 14, fontSize: 36, lineHeight: 1.2, fontWeight: 600, color: primary }}>{tagline}</div>
        <div style={{ marginTop: 8, fontSize: 28, color: "#5A6B8A" }}>{channel.handle}</div>
      </div>
    </AbsoluteFill>
  );
};
