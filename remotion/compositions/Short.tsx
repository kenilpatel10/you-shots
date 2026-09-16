import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { Background } from "../backgrounds/Background";
import { AnimatedBolt } from "../character/AnimatedBolt";
import { Captions } from "../components/Captions";
import { MusicBed } from "../components/MusicBed";
import { ProgressBar } from "../components/ProgressBar";
import { useFonts } from "../components/useFonts";
import { shortLayout } from "../layout";
import { useMouthCurve } from "../lipsync";
import { SCENES } from "../scenes";
import type { ShortProps } from "../schema";

export const calculateShortMetadata: CalculateMetadataFunction<ShortProps> = ({ props }) => ({
  durationInFrames: props.timeline.totalFrames,
  fps: props.timeline.fps,
});

/** Frame index of a timeline millisecond. */
const toFrame = (ms: number, fps: number) => Math.round((ms / 1000) * fps);

export const Short: React.FC<ShortProps> = ({ script, channel, timeline, audio }) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const mouth = useMouthCurve(audio.voice, timeline);
  const ms = (frame / fps) * 1000;

  const sections = timeline.sections;
  const currentIndex = Math.max(
    0,
    sections.findIndex((s, i) => {
      const next = sections[i + 1];
      return ms >= s.startMs && (!next || ms < next.startMs);
    }),
  );
  const current = sections[currentIndex]!;
  const sinceStart = frame - toFrame(current.startMs, fps);
  // A tiny hop when a new section starts so pose changes feel intentional, not like a cut.
  const hopY = interpolate(sinceStart, [0, 5, 11], [0, -22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow =
    current.key === "wowFact"
      ? interpolate(sinceStart, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : current.key === "experiment"
        ? 0.35
        : 0;
  const speakingNow = sections.some((s) => ms >= s.startMs && ms <= s.endMs);
  const mouthOpen = speakingNow ? mouth(frame) : 0;

  const wordGroups = sections.map((s) => s.words);
  const L = shortLayout;

  return (
    <AbsoluteFill style={{ backgroundColor: "#fff" }}>
      <Background category={script.background} width={width} height={height} />

      {audio.voice ? <Audio src={staticFile(audio.voice)} /> : null}
      {audio.music ? (
        <MusicBed src={audio.music} timeline={timeline} volume={audio.musicVolume} duckedVolume={audio.duckedVolume} fadeSeconds={audio.fadeSeconds} totalFrames={timeline.totalFrames} />
      ) : null}

      {sections.map((s, i) => {
        const from = toFrame(s.startMs, fps);
        const next = sections[i + 1];
        const until = next ? toFrame(next.startMs, fps) : timeline.totalFrames;
        const Scene = SCENES[s.key];
        return (
          <Sequence key={s.key} from={from} durationInFrames={Math.max(1, until - from)} name={s.key}>
            <Scene section={s} script={script} channel={channel} layout={L} durationInFrames={until - from} />
          </Sequence>
        );
      })}

      <div style={{ position: "absolute", left: L.bolt.centerX - L.bolt.size / 2, top: L.bolt.top + hopY }}>
        <AnimatedBolt pose={current.pose} expression={current.expression} mouthOpen={mouthOpen} antennaGlow={glow} size={L.bolt.size} seed="short" idPrefix="short-bolt" />
      </div>

      <Captions wordGroups={wordGroups} box={L.captions} />
      <ProgressBar sections={sections} box={L.progress} />
    </AbsoluteFill>
  );
};
