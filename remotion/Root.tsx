import React from "react";
import { Composition, Folder, Still } from "remotion";
import { BoltShowcase, SHOWCASE_HEIGHT, SHOWCASE_WIDTH } from "./compositions/BoltShowcase";
import { FPS } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Design">
        <Still id="BoltShowcaseStill" component={BoltShowcase} width={SHOWCASE_WIDTH} height={SHOWCASE_HEIGHT} />
        <Composition id="BoltShowcase" component={BoltShowcase} width={SHOWCASE_WIDTH} height={SHOWCASE_HEIGHT} fps={FPS} durationInFrames={FPS * 4} />
      </Folder>
    </>
  );
};
