import type React from "react";
import type { SectionKey } from "../schema";
import { HookScene } from "./HookScene";
import { AnswerScene } from "./AnswerScene";
import { FactScene } from "./FactScene";
import { ExperimentScene } from "./ExperimentScene";
import { SignOffScene } from "./SignOffScene";
import type { SceneProps } from "./common";

export const SCENES: Record<SectionKey, React.FC<SceneProps>> = {
  hook: HookScene,
  answer: AnswerScene,
  wowFact: FactScene,
  experiment: ExperimentScene,
  signOff: SignOffScene,
};
