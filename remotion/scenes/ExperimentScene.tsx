import React from "react";
import { SafetyBadge } from "../components/SafetyBadge";
import { TitleCard } from "../components/TitleCard";
import type { SceneProps } from "./common";

export const ExperimentScene: React.FC<SceneProps> = ({ script, section, channel, layout, maxFontSize }) => (
  <>
    <TitleCard text={script.onScreenText.experiment} tag={channel.labels?.experiment ?? "Try this at home"} tagColor="#6C5CE7" box={layout.card} maxFontSize={maxFontSize} />
    {section.grownUp ? <SafetyBadge text={channel.askGrownUp} left={layout.badge.left} top={layout.badge.top} enterFrame={10} /> : null}
  </>
);
