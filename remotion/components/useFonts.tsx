import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { ensureFonts } from "../fonts";

/** Blocks rendering until the bundled fonts are ready so no frame uses a fallback face. */
export function useFonts(): boolean {
  const [handle] = useState(() => delayRender("Loading Fredoka"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    ensureFonts()
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setReady(true);
        continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);
  return ready;
}
