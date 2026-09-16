import { renderPng, renderVideo, outPath } from "../video/render";
import { createLogger } from "../lib/logger";

const log = createLogger("showcase");

async function main() {
  const png = await renderPng({ compositionId: "BoltShowcaseStill", outputPath: outPath("showcase", "bolt-showcase.png") });
  log.info(`Design sheet: ${png}`);
  if (!process.argv.includes("--still-only")) {
    const mp4 = await renderVideo({ compositionId: "BoltShowcase", inputProps: {}, outputPath: outPath("showcase", "bolt-showcase.mp4"), crf: 24 });
    log.info(`Animated sheet: ${mp4.outputPath}`);
  }
}

main().catch((err) => {
  log.error(String(err?.stack ?? err));
  process.exit(1);
});
