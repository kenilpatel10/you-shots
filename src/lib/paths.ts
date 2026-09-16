import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Repository root (this file lives in src/lib). */
export const ROOT = path.resolve(here, "..", "..");
export const CONFIG_DIR = path.join(ROOT, "config");
export const DATA_DIR = path.join(ROOT, "data");
export const OUT_DIR = path.join(ROOT, "out");
export const PUBLIC_DIR = path.join(ROOT, "public");
export const CACHE_DIR = path.join(ROOT, ".cache");
export const REMOTION_ENTRY = path.join(ROOT, "remotion", "index.ts");
export const STATE_FILE = path.join(DATA_DIR, "state.json");
export const TOPICS_FILE = path.join(DATA_DIR, "topics.json");
export const FALLBACK_DIR = path.join(DATA_DIR, "fallback-scripts");

export const draftDir = (draftId: string) => path.join(OUT_DIR, draftId);
/** Per-draft assets are copied here so Remotion can load them via staticFile(). */
export const publicDraftDir = (draftId: string) => path.join(PUBLIC_DIR, "drafts", draftId);
