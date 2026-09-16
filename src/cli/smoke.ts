/** CI smoke test: render 3 seconds of the showcase to prove the browser + encoder work. */
import { renderVideo, outPath } from "../video/render";
import { createLogger } from "../lib/logger";
import { FPS } from "../../remotion/theme";

const log = createLogger("smoke");

renderVideo({ compositionId: "BoltShowcase", inputProps: {}, outputPath: outPath("smoke", "smoke.mp4"), frameRange: [0, FPS * 3 - 1], crf: 28, scale: 0.5 })
  .then((r) => log.info(`Smoke render OK: ${r.outputPath}`))
  .catch((err) => {
    log.error(String(err?.stack ?? err));
    process.exit(1);
  });
