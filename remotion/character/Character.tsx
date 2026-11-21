import React from "react";
import { AnimatedBolt, type AnimatedBoltProps } from "./AnimatedBolt";
import { AnimatedHost } from "./AnimatedHost";
import { Bolt, type BoltProps } from "./Bolt";
import { Host } from "./Host";
import type { HostLook } from "./hostLook";

type Pick = { host?: Partial<HostLook> | undefined };

/** The channel's presenter: Bolt by default, the human host when the channel config has `host`. */
export const AnimatedCharacter: React.FC<AnimatedBoltProps & Pick> = ({ host, bodyColor, ...props }) =>
  host ? <AnimatedHost look={host} {...props} /> : <AnimatedBolt bodyColor={bodyColor} {...props} />;

export const Character: React.FC<BoltProps & Pick> = ({ host, bodyColor, ...props }) => (host ? <Host look={host} {...props} /> : <Bolt bodyColor={bodyColor} {...props} />);
