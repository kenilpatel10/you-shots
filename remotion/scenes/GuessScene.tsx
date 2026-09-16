import React from "react";
import { GuessBubbles } from "../components/GuessBubbles";
import type { SceneProps } from "./common";

/** Shown between the hook and the answer while Bolt thinks. */
export const GuessScene: React.FC<SceneProps> = ({ script, layout, maxFontSize }) => {
  if (!script.guess) return null;
  return <GuessBubbles prompt={script.guess.prompt} options={script.guess.options} answer={script.guess.answer} mode="ask" box={layout.card} compact={(maxFontSize ?? 84) < 84} />;
};
