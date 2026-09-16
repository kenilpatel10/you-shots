import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

let loading: Promise<void> | null = null;

/** Loads the bundled Fredoka weights (OFL, public/fonts). Idempotent. */
export function ensureFonts(): Promise<void> {
  if (!loading) {
    loading = Promise.all(
      [400, 600, 700].map((weight) =>
        loadFont({
          family: "Fredoka",
          url: staticFile(`fonts/fredoka-latin-${weight}-normal.woff2`),
          weight: String(weight),
          format: "woff2",
        }),
      ),
    ).then(() => undefined);
  }
  return loading;
}
