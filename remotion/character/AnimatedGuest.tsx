import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Guest, type GuestProps } from "./Guest";

export type AnimatedGuestProps = Omit<GuestProps, "bob"> & {
  /** Frame at which the guest pops in (bounce entrance). */
  enterFrame?: number;
};

/** Guest with a springy entrance, a gentle bob and mouth driven by its own voice. */
export const AnimatedGuest: React.FC<AnimatedGuestProps> = ({ enterFrame = 0, style, ...props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const s = spring({ frame: frame - enterFrame, fps, config: { damping: 9, stiffness: 140 } });
  const scale = interpolate(s, [0, 1], [0.2, 1]);
  const bob = Math.sin(t * Math.PI * 2 * 1.1) * 3;
  return (
    <div style={{ ...style, transform: `${style?.transform ?? ""} scale(${scale})`, transformOrigin: "50% 100%", opacity: frame >= enterFrame ? 1 : 0 }}>
      <Guest {...props} bob={bob} />
    </div>
  );
};
