import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { GuessBubbles } from "../components/GuessBubbles";
import { TitleCard } from "../components/TitleCard";
import { REVEAL_FRAMES } from "../schema";
import type { SceneProps } from "./common";

/** Reveals the correct guess bubble for a moment, then the answer card takes over. */
export const AnswerScene: React.FC<SceneProps> = ({ script, layout, maxFontSize }) => {
  const frame = useCurrentFrame();
  const hasGuess = Boolean(script.guess);
  return (
    <>
      {hasGuess && frame < REVEAL_FRAMES ? (
        <Sequence from={0} durationInFrames={REVEAL_FRAMES} name="reveal">
          <GuessBubbles prompt={script.guess!.prompt} options={script.guess!.options} answer={script.guess!.answer} mode="reveal" box={layout.card} compact={(maxFontSize ?? 84) < 84} />
        </Sequence>
      ) : (
        <TitleCard text={script.onScreenText.answer} tag="Here's why" tagColor="#2FA36B" box={layout.card} maxFontSize={maxFontSize} enterFrame={hasGuess ? REVEAL_FRAMES : 0} />
      )}
    </>
  );
};
