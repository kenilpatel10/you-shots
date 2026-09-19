import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../backgrounds/Background";
import { AnimatedBolt } from "../character/AnimatedBolt";
import { AnimatedPip } from "../character/AnimatedPip";
import type { PipMood } from "../character/Pip";
import { FeelingChip } from "../components/FeelingChip";
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
  sfx?: { ding: string; pop: string; jingle?: string | undefined } | undefined;
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
  const L = variant === "short" ? shortLayout : longLayout;
  const wowStart = sections.find((s) => s.key === "wowFact");
  const answerStart = sections.find((s) => s.key === "answer");
  // Clumsy gag: when the antenna lights up on the wow fact, Bolt wobbles for half a second ("oops!").
  const wobble = current.key === "wowFact" && sinceStart < 16 ? Math.sin((sinceStart / 16) * Math.PI * 3) * 6 * (1 - sinceStart / 16) : 0;
  const revealing = current.key === "answer" && sinceStart < 42 && Boolean(script.guess);
  const pipMood: PipMood = inGuess ? "cheeky" : revealing || current.key === "wowFact" ? "surprised" : current.key === "hook" ? "curious" : current.key === "signOff" ? "happy" : "happy";
  const pipExcited = revealing || current.key === "signOff" ? 1 : current.key === "experiment" ? 0.4 : 0;
  const pipTalking = inGuess && sinceStart % 40 < 12;
  const pipSize = variant === "short" ? 150 : 130;
  const pipPos = variant === "short" ? { left: L.bolt.centerX + L.bolt.size * 0.36, top: L.bolt.top + L.bolt.size * 0.98 } : { left: L.bolt.centerX + L.bolt.size * 0.4, top: L.bolt.top + L.bolt.size * 0.9 };
  const feeling = channel.feelings?.[expression];
  const speakingNow = sections.some((s) => ms >= s.startMs && ms <= s.endMs);
  const mouthOpen = speakingNow ? mouth(frame) : 0;
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
      {sfx?.jingle ? (
        <Sequence from={0} durationInFrames={45} name="sfx-jingle">
          <Audio src={staticFile(sfx.jingle)} volume={0.32} />
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
      <div style={{ position: "absolute", left: L.bolt.centerX - L.bolt.size / 2, top: L.bolt.top + hopY, transform: `rotate(${wobble}deg)`, transformOrigin: "50% 90%" }}>
        <AnimatedBolt pose={pose} expression={expression} mouthOpen={mouthOpen} antennaGlow={glow} size={L.bolt.size} seed={`ep-${script.topicId}`} idPrefix={`bolt-${script.topicId}`} bodyColor={channel.brand?.primary} />
      </div>
      <div style={{ position: "absolute", left: pipPos.left, top: pipPos.top }}>
        <AnimatedPip mood={pipMood} excitement={pipExcited} talking={pipTalking} size={pipSize} idPrefix={`pip-${script.topicId}`} />
      </div>
      {feeling && sinceStart < 50 && !inGuess && !revealing ? <FeelingChip text={feeling} left={L.bolt.centerX - L.bolt.size / 2 - 10} top={L.bolt.top + 20} enterFrame={0} frame={sinceStart} /> : null}
      <Captions wordGroups={sections.map((s) => s.words)} box={L.captions} fontSize={variant === "short" ? 60 : 52} />
      <ProgressBar sections={sections} box={L.progress} color={channel.brand?.accent} />
      {channel.brand?.logo ? <Img src={staticFile(channel.brand.logo)} style={{ position: "absolute", right: L.progress.left, top: L.progress.top - 96, height: 72, opacity: 0.92 }} /> : null}
    </AbsoluteFill>
  );
};
