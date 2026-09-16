import path from "node:path";
import { existsSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, renderStill, selectComposition, type ChromeMode, type RenderMediaOnProgress } from "@remotion/renderer";
import { OUT_DIR, PUBLIC_DIR, REMOTION_ENTRY, ROOT } from "../lib/paths";
import { createLogger } from "../lib/logger";
import { env } from "../lib/env";
import { ensureDir } from "../lib/fs";

const log = createLogger("render");

let bundlePromise: Promise<string> | null = null;

/** Bundle the Remotion project once per process (webpack build, ~10–20s). */
export function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const outDir = path.join(ROOT, "remotion-bundle");
      log.info("Bundling Remotion project…");
      const serveUrl = await bundle({
        entryPoint: REMOTION_ENTRY,
        publicDir: PUBLIC_DIR,
        outDir,
        onProgress: (p) => {
          if (p === 100) log.debug("Bundle complete");
        },
      });
      return serveUrl;
    })();
  }
  return bundlePromise;
}

const CANDIDATE_BROWSERS = [
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

/**
 * Prefer REMOTION_BROWSER_EXECUTABLE, then a system Chrome, else let Remotion download
 * its headless shell (cached in node_modules/.remotion).
 */
export type BrowserChoice = { browserExecutable: string | undefined; chromeMode: ChromeMode };

/** Full Chrome builds no longer support the old headless mode; only a *headless shell* binary does. */
function modeFor(executable: string): ChromeMode {
  return /headless[-_]shell/i.test(executable) ? "headless-shell" : "chrome-for-testing";
}

let browserChoice: Promise<BrowserChoice> | null = null;

export function resolveBrowser(): Promise<BrowserChoice> {
  if (!browserChoice) {
    browserChoice = (async () => {
      const fromEnv = env("REMOTION_BROWSER_EXECUTABLE");
      if (fromEnv) {
        if (!existsSync(fromEnv)) throw new Error(`REMOTION_BROWSER_EXECUTABLE=${fromEnv} does not exist`);
        return { browserExecutable: fromEnv, chromeMode: modeFor(fromEnv) };
      }
      if (env("REMOTION_PREFER_DOWNLOADED_BROWSER") !== "1") {
        for (const c of CANDIDATE_BROWSERS) if (existsSync(c)) return { browserExecutable: c, chromeMode: modeFor(c) };
      }
      await ensureBrowser({ logLevel: "warn" });
      return { browserExecutable: undefined, chromeMode: "headless-shell" };
    })();
  }
  return browserChoice;
}

/** REMOTION_CONCURRENCY may be a number of workers ("4") or a percentage ("50%"). */
export function parseConcurrency(raw: string | undefined): number | string | null {
  if (!raw) return null;
  if (/^\d+%$/.test(raw)) return raw;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export type RenderVideoOptions = {
  compositionId: string;
  inputProps: Record<string, unknown>;
  outputPath: string;
  /** 0–1 scale for lightweight previews. */
  scale?: number;
  crf?: number;
  frameRange?: [number, number];
  onProgress?: RenderMediaOnProgress;
};

export async function renderVideo(opts: RenderVideoOptions): Promise<{ outputPath: string; durationInFrames: number; fps: number; width: number; height: number }> {
  const serveUrl = await getBundle();
  const { browserExecutable, chromeMode } = await resolveBrowser();
  const composition = await selectComposition({ serveUrl, id: opts.compositionId, inputProps: opts.inputProps, browserExecutable, chromeMode, logLevel: "warn" });
  await ensureDir(path.dirname(opts.outputPath));
  log.info(`Rendering ${opts.compositionId} → ${path.relative(ROOT, opts.outputPath)} (${composition.width}x${composition.height}, ${composition.durationInFrames} frames)`);
  let lastPct = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: opts.outputPath,
    inputProps: opts.inputProps,
    browserExecutable,
    chromeMode,
    crf: opts.crf ?? 20,
    scale: opts.scale ?? 1,
    frameRange: opts.frameRange,
    concurrency: parseConcurrency(env("REMOTION_CONCURRENCY")),
    logLevel: "warn",
    chromiumOptions: { gl: "swangle" },
    onProgress: (p) => {
      const pct = Math.floor(p.progress * 10) * 10;
      if (pct !== lastPct) {
        lastPct = pct;
        log.info(`  ${pct}%`);
      }
      opts.onProgress?.(p);
    },
  });
  return { outputPath: opts.outputPath, durationInFrames: composition.durationInFrames, fps: composition.fps, width: composition.width, height: composition.height };
}

export async function renderPng(opts: { compositionId: string; inputProps?: Record<string, unknown>; outputPath: string; frame?: number }): Promise<string> {
  const serveUrl = await getBundle();
  const { browserExecutable, chromeMode } = await resolveBrowser();
  const composition = await selectComposition({ serveUrl, id: opts.compositionId, inputProps: opts.inputProps ?? {}, browserExecutable, chromeMode, logLevel: "warn" });
  await ensureDir(path.dirname(opts.outputPath));
  await renderStill({
    serveUrl,
    composition,
    output: opts.outputPath,
    inputProps: opts.inputProps ?? {},
    frame: opts.frame ?? 0,
    imageFormat: "png",
    browserExecutable,
    chromeMode,
    logLevel: "warn",
    chromiumOptions: { gl: "swangle" },
  });
  return opts.outputPath;
}

export const outPath = (...segments: string[]) => path.join(OUT_DIR, ...segments);
