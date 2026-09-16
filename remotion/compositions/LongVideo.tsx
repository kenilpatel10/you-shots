import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { AnimatedBolt } from "../character/AnimatedBolt";
import { MusicBed } from "../components/MusicBed";
import { useFonts } from "../components/useFonts";
import { mergedTimeline, planLongVideo } from "../long/plan";
import { CHAPTER_CARD_FRAMES, INTRO_FRAMES, OUTRO_FRAMES, type LongVideoProps } from "../schema";
import { categoryPalettes, colors, fonts } from "../theme";
import { Episode } from "./Episode";

export const calculateLongMetadata: CalculateMetadataFunction<LongVideoProps> = ({ props }) => ({
  durationInFrames: planLongVideo(props).totalFrames,
});

const Card: React.FC<{ title: string; subtitle?: string; category?: string; pose?: "wave" | "point" | "jump" | "idle"; index?: number }> = ({ title, subtitle, category, pose = "wave", index }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const pal = categoryPalettes[category ?? "everyday-things"] ?? categoryPalettes["everyday-things"]!;
  const dark = category === "space";
  const textColor = dark ? colors.white : colors.ink;
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 110 } });
  return (
    <AbsoluteFill style={{ backgroundColor: pal.sky, justifyContent: "center", alignItems: "center", fontFamily: fonts.family }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <circle cx={width * 0.85} cy={height * 0.2} r={140} fill={pal.accent} opacity={0.35} />
        <circle cx={width * 0.1} cy={height * 0.85} r={220} fill={pal.ground} opacity={0.6} />
      </svg>
      <div style={{ display: "flex", alignItems: "center", gap: 60, transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`, opacity: s }}>
        <AnimatedBolt pose={pose} expression="excited" antennaGlow={0.6} size={360} seed={`card-${title}`} idPrefix={`card-${index ?? 0}`} />
        <div style={{ maxWidth: 1000 }}>
          {index !== undefined ? <div style={{ fontSize: 40, fontWeight: fonts.weightSemi, color: dark ? colors.accent : colors.primary }}>Question {index}</div> : null}
          <div style={{ fontSize: title.length > 26 ? 84 : 104, fontWeight: fonts.weightBold, color: textColor, lineHeight: 1.05, textWrap: "balance" }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 44, fontWeight: fonts.weightSemi, color: textColor, opacity: 0.75, marginTop: 16 }}>{subtitle}</div> : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** 1920×1080 weekly compilation: intro → (chapter card + landscape episode)… → outro. */
export const LongVideo: React.FC<LongVideoProps> = (props) => {
  useFonts();
  const { fps } = useVideoConfig();
  const plan = planLongVideo(props);
  const timeline = mergedTimeline(props, fps);
  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper }}>
      {props.music ? <MusicBed src={props.music} timeline={timeline} volume={props.musicVolume} duckedVolume={props.duckedVolume} fadeSeconds={2} totalFrames={plan.totalFrames} /> : null}
      <Sequence from={0} durationInFrames={INTRO_FRAMES} name="intro">
        <Card title={props.weekTitle} subtitle={`${props.episodes.length} big questions with ${props.channel.characterName}`} pose="jump" />
      </Sequence>
      {props.episodes.map((ep, i) => {
        const p = plan.episodes[i]!;
        return (
          <React.Fragment key={ep.draftId}>
            <Sequence from={p.chapterFrom} durationInFrames={CHAPTER_CARD_FRAMES} name={`chapter-${i + 1}`}>
              <Card title={ep.chapterTitle} category={ep.script.background} pose="point" index={i + 1} />
            </Sequence>
            <Sequence from={p.from} durationInFrames={p.durationInFrames} name={`episode-${i + 1}`}>
              <Episode script={ep.script} channel={props.channel} timeline={ep.timeline} voice={ep.audio.voice} variant="long" sfx={ep.audio.sfx} />
            </Sequence>
          </React.Fragment>
        );
      })}
      <Sequence from={plan.outroFrom} durationInFrames={OUTRO_FRAMES} name="outro">
        <Card title={props.outro} subtitle={`${props.channel.name} · ${props.channel.handle}`} pose="wave" />
      </Sequence>
    </AbsoluteFill>
  );
};
