import React from "react";
import { TitleCard } from "../components/TitleCard";
import type { SceneProps } from "./common";

export const AnswerScene: React.FC<SceneProps> = ({ script, layout, maxFontSize }) => (
  <TitleCard text={script.onScreenText.answer} tag="Here's why" tagColor="#2FA36B" box={layout.card} maxFontSize={maxFontSize} />
);
