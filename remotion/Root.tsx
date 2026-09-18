import React from "react";
import { Composition, Folder, Still } from "remotion";
import { BoltShowcase, SHOWCASE_HEIGHT, SHOWCASE_WIDTH } from "./compositions/BoltShowcase";
import { Short, calculateShortMetadata } from "./compositions/Short";
import { LongVideo, calculateLongMetadata } from "./compositions/LongVideo";
import { Thumbnail, THUMB_HEIGHT, THUMB_WIDTH } from "./compositions/Thumbnail";
import { Avatar, AVATAR_SIZE, Banner, BANNER_HEIGHT, BANNER_WIDTH, BrandingPropsZ } from "./compositions/Branding";
import { sampleLongProps, sampleThumbnailProps } from "./sample/sampleLong";
import { planLongVideo } from "./long/plan";
import { sampleShortProps } from "./sample/sampleProps";
import { LongVideoPropsZ, ShortPropsZ, ThumbnailPropsZ } from "./schema";
import { FPS, LONG_HEIGHT, LONG_WIDTH, SHORT_HEIGHT, SHORT_WIDTH } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Videos">
        <Composition
          id="Short"
          component={Short}
          schema={ShortPropsZ}
          defaultProps={sampleShortProps}
          calculateMetadata={calculateShortMetadata}
          width={SHORT_WIDTH}
          height={SHORT_HEIGHT}
          fps={FPS}
          durationInFrames={sampleShortProps.timeline.totalFrames}
        />
        <Composition
          id="LongVideo"
          component={LongVideo}
          schema={LongVideoPropsZ}
          defaultProps={sampleLongProps}
          calculateMetadata={calculateLongMetadata}
          width={LONG_WIDTH}
          height={LONG_HEIGHT}
          fps={FPS}
          durationInFrames={planLongVideo(sampleLongProps).totalFrames}
        />
        <Still id="Thumbnail" component={Thumbnail} schema={ThumbnailPropsZ} defaultProps={sampleThumbnailProps} width={THUMB_WIDTH} height={THUMB_HEIGHT} />
      </Folder>
      <Folder name="Design">
        <Still id="BoltShowcaseStill" component={BoltShowcase} width={SHOWCASE_WIDTH} height={SHOWCASE_HEIGHT} />
        <Still id="Avatar" component={Avatar} schema={BrandingPropsZ} defaultProps={{ channel: sampleThumbnailProps.channel, tagline: "Short, safe science answers for curious kids" }} width={AVATAR_SIZE} height={AVATAR_SIZE} />
        <Still id="Banner" component={Banner} schema={BrandingPropsZ} defaultProps={{ channel: sampleThumbnailProps.channel, tagline: "Short, safe science answers for curious kids" }} width={BANNER_WIDTH} height={BANNER_HEIGHT} />
        <Composition id="BoltShowcase" component={BoltShowcase} width={SHOWCASE_WIDTH} height={SHOWCASE_HEIGHT} fps={FPS} durationInFrames={FPS * 4} />
      </Folder>
    </>
  );
};
