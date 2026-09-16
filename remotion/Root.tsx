import React from "react";
import { Composition, Folder, Still } from "remotion";
import { BoltShowcase, SHOWCASE_HEIGHT, SHOWCASE_WIDTH } from "./compositions/BoltShowcase";
import { Short, calculateShortMetadata } from "./compositions/Short";
import { sampleShortProps } from "./sample/sampleProps";
import { ShortPropsZ } from "./schema";
import { FPS, SHORT_HEIGHT, SHORT_WIDTH } from "./theme";

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
      </Folder>
      <Folder name="Design">
        <Still id="BoltShowcaseStill" component={BoltShowcase} width={SHOWCASE_WIDTH} height={SHOWCASE_HEIGHT} />
        <Composition id="BoltShowcase" component={BoltShowcase} width={SHOWCASE_WIDTH} height={SHOWCASE_HEIGHT} fps={FPS} durationInFrames={FPS * 4} />
      </Folder>
    </>
  );
};
