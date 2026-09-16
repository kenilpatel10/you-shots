import React from "react";
import { AbsoluteFill, type CalculateMetadataFunction } from "remotion";
import { MusicBed } from "../components/MusicBed";
import { useFonts } from "../components/useFonts";
import type { ShortProps } from "../schema";
import { Episode } from "./Episode";

export const calculateShortMetadata: CalculateMetadataFunction<ShortProps> = ({ props }) => ({
  durationInFrames: props.timeline.totalFrames,
  fps: props.timeline.fps,
});

/** 1080×1920 vertical Short: one episode plus a ducked music bed. */
export const Short: React.FC<ShortProps> = ({ script, channel, timeline, audio }) => {
  useFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: "#fff" }}>
      {audio.music ? (
        <MusicBed src={audio.music} timeline={timeline} volume={audio.musicVolume} duckedVolume={audio.duckedVolume} fadeSeconds={audio.fadeSeconds} totalFrames={timeline.totalFrames} />
      ) : null}
      <Episode script={script} channel={channel} timeline={timeline} voice={audio.voice} variant="short" sfx={audio.sfx} />
    </AbsoluteFill>
  );
};
