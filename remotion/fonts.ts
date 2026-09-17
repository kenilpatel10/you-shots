import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

let loading: Promise<void> | null = null;

/** Loads the bundled Fredoka weights (OFL, public/fonts). Idempotent. */
export function ensureFonts(): Promise<void> {
  if (!loading) {
    const jobs: Promise<void>[] = [];
    for (const weight of [400, 600, 700]) {
      jobs.push(loadFont({ family: "Fredoka", url: staticFile(`fonts/fredoka-latin-${weight}-normal.woff2`), weight: String(weight), format: "woff2" }));
      // Baloo 2 carries Devanagari (Hindi) and matches Fredoka's rounded look; the browser falls
      // back to it for any glyph Fredoka lacks.
      for (const subset of ["latin", "devanagari"]) {
        jobs.push(loadFont({ family: "Baloo 2", url: staticFile(`fonts/baloo-2-${subset}-${weight}-normal.woff2`), weight: String(weight), format: "woff2" }));
      }
    }
    loading = Promise.all(jobs).then(() => undefined);
  }
  return loading;
}
