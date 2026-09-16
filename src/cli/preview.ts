/**
 * Render the Short composition from a props file (out/<draft>/video.json) or the built-in sample.
 *   npm run preview -- [--props out/<id>/video.json] [--stills 0,4,20,45] [--out out/preview]
 * --stills renders PNG frames at the given seconds instead of a video (handy for visual QA).
 */
import path from "node:path";
import { readJson } from "../lib/fs";
import { createLogger } from "../lib/logger";
import { outPath, renderPng, renderVideo } from "../video/render";
import { ShortPropsZ, LongVideoPropsZ } from "../../remotion/schema";
import { sampleShortProps } from "../../remotion/sample/sampleProps";

const log = createLogger("preview");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const propsFile = arg("--props");
  const compositionId = arg("--composition") ?? "Short";
  const raw = propsFile ? await readJson(propsFile) : sampleShortProps;
  const props = compositionId === "LongVideo" ? LongVideoPropsZ.parse(raw) : ShortPropsZ.parse(raw);
  const outDir = arg("--out") ?? outPath("preview");
  const stills = arg("--stills");
  const fps = "timeline" in props ? props.timeline.fps : 30;
  if (stills) {
    for (const sec of stills.split(",").map(Number)) {
      const frame = Math.round(sec * fps);
      const file = path.join(outDir, `${compositionId}-${String(sec).padStart(3, "0")}s.png`);
      await renderPng({ compositionId, inputProps: props, outputPath: file, frame });
      log.info(`Still ${sec}s → ${file}`);
    }
    return;
  }
  const r = await renderVideo({ compositionId, inputProps: props, outputPath: path.join(outDir, `${compositionId}.mp4`), crf: 22 });
  log.info(`Rendered ${r.outputPath} (${(r.durationInFrames / r.fps).toFixed(1)}s)`);
}

main().catch((err) => {
  log.error(String(err?.stack ?? err));
  process.exit(1);
});
