import React from "react";
import { TitleCard } from "../components/TitleCard";
import { colors } from "../theme";
import type { SceneProps } from "./common";

export const HookScene: React.FC<SceneProps> = ({ script, channel, layout, maxFontSize }) => (
  <TitleCard text={script.onScreenText.hook} tag={channel.labels?.hook ?? "Big question"} tagColor={channel.brand?.primary ?? colors.primary} box={layout.card} maxFontSize={maxFontSize} />
);
