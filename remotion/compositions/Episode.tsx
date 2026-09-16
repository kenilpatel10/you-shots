import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../backgrounds/Background";
import { AnimatedBolt } from "../character/AnimatedBolt";
import { Captions } from "../components/Captions";
import { ProgressBar } from "../components/ProgressBar";
import { longLayout, shortLayout } from "../layout";
import { useMouthCurve } from "../lipsync";
import { SCENES } from "../scenes";
import { GuessScene } from "../scenes/GuessScene";
import type { ChannelProps, ScriptProps, Timeline } from "../schema";

export type EpisodeProps = {
  script: ScriptProps;
  channel: ChannelProps;
  timeline: Timeline;
  /** public-relative voice path; empty = silent. */
  voice: string;
  variant: "short" | "long";
  sfx?: { ding: string; pop: string } | undefined;
};

const toFrame = (ms: number, fps: number) => Math.round((ms / 1000) * fps);

/**
 * One scripted episode: background, persistent animated Bolt with lip sync, scene cards,
 * captions and progress. Used vertically by Short and in a landscape layout by LongVideo
 * (Bolt on the left, text on the right — never letterboxed).
 */
export const Episode: React.FC<EpisodeProps> = ({ script, channel, timeline, voice, variant, sfx }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const mouth = useMouthCurve(voice, timeline);
  const ms = (frame / fps) * 1000;
  const sections = timeline.sections;
  const idx = Math.max(
    0,
    sections.findIndex((s, i) => {
      const next = sections[i + 1];
      return ms >= s.startMs && (!next || ms < next.startMs);
    }),
  );
  const current = sections[idx]!;
  const guessWindow = timeline.guess && script.guess ? timeline.guess : null;
  const inGuess = guessWindow !== null && ms >= guessWindow.startMs && ms < guessWindow.endMs;
  const sinceStart = frame - toFrame(current.startMs, fps);
  const hopY = interpolate(sinceStart, [0, 5, 11], [0, -22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glowBase = current.key === "wowFact" ? interpolate(sinceStart, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : current.key === "experiment" ? 0.35 : 0;
  // While the bubbles are up, the antenna blinks slowly as Bolt "thinks".
  const glow = inGuess ? 0.45 + 0.45 * Math.sin((frame / fps) * Math.PI * 2 * 1.3) : glowBase;
  const pose = inGuess ? "think" : current.pose;
  const expression = inGuess ? "thinking" : current.expression;
  const wowStart = sections.find((s) => s.key === "wowFact");
  const answerStart = sections.find((s) => s.key === "answer");
  const speakingNow = sections.some((s) => ms >= s.startMs && ms <= s.endMs);
  const mouthOpen = speakingNow ? mouth(frame) : 0;
  const L = variant === "short" ? shortLayout : longLayout;
  const sceneLayout = variant === "short" ? shortLayout : { card: longLayout.card, badge: longLayout.badge, signoff: { left: longLayout.captions.left, top: longLayout.captions.top, width: longLayout.captions.width } };
  const maxFontSize = variant === "short" ? 84 : 72;

  return (
    <AbsoluteFill>
      <Background category={script.background} width={width} height={height} />
      {voice ? <Audio src={staticFile(voice)} /> : null}
      {sections.map((s, i) => {
        const from = toFrame(s.startMs, fps);
        const next = sections[i + 1];
        const until = s.key === "hook" && guessWindow ? toFrame(guessWindow.startMs, fps) : next ? toFrame(next.startMs, fps) : timeline.totalFrames;
        const Scene = SCENES[s.key];
        return (
          <Sequence key={s.key} from={from} durationInFrames={Math.max(1, until - from)} name={s.key}>
            <Scene section={s} script={script} channel={channel} layout={sceneLayout} durationInFrames={until - from} maxFontSize={maxFontSize} />
          </Sequence>
        );
      })}
      {guessWindow && script.guess ? (
        <Sequence from={toFrame(guessWindow.startMs, fps)} durationInFrames={Math.max(1, toFrame(guessWindow.endMs, fps) - toFrame(guessWindow.startMs, fps))} name="guess">
          <GuessScene section={current} script={script} channel={channel} layout={sceneLayout} durationInFrames={1} maxFontSize={maxFontSize} />
        </Sequence>
      ) : null}
      {sfx && wowStart ? (
        <Sequence from={toFrame(wowStart.startMs, fps)} durationInFrames={30} name="sfx-ding">
          <Audio src={staticFile(sfx.ding)} volume={0.28} />
        </Sequence>
      ) : null}
      {sfx && script.guess && answerStart ? (
        <Sequence from={toFrame(answerStart.startMs, fps)} durationInFrames={10} name="sfx-pop">
          <Audio src={staticFile(sfx.pop)} volume={0.35} />
        </Sequence>
      ) : null}
      <div style={{ position: "absolute", left: L.bolt.centerX - L.bolt.size / 2, top: L.bolt.top + hopY }}>
        <AnimatedBolt pose={pose} expression={expression} mouthOpen={mouthOpen} antennaGlow={glow} size={L.bolt.size} seed={`ep-${script.topicId}`} idPrefix={`bolt-${script.topicId}`} />
      </div>
      <Captions wordGroups={sections.map((s) => s.words)} box={L.captions} fontSize={variant === "short" ? 60 : 52} />
      <ProgressBar sections={sections} box={L.progress} />
    </AbsoluteFill>
  );
};
