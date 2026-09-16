/**
 * Draft storage on GitHub Releases (free, works with the repo's own GITHUB_TOKEN in Actions).
 * Each daily draft lives on a prerelease tagged draft-<date>; publish.yml downloads the asset
 * later when the reviewer approves.
 */
import { promises as fs, openAsBlob } from "node:fs";
import path from "node:path";
import { env, requireEnv } from "../lib/env";
import { createLogger } from "../lib/logger";
import { HttpError, retry } from "../lib/retry";
import { ensureDir } from "../lib/fs";

const log = createLogger("releases");

export function releasesConfigured(): boolean {
  return Boolean(env("GITHUB_TOKEN") && env("GITHUB_REPOSITORY"));
}

function repo(): string {
  return requireEnv("GITHUB_REPOSITORY", "owner/repo of this repository");
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    authorization: `Bearer ${requireEnv("GITHUB_TOKEN", "needed to store drafts as release assets")}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "bolt-shorts",
    ...extra,
  };
}

async function gh<T>(url: string, init: RequestInit = {}): Promise<T> {
  return retry(
    async () => {
      const res = await fetch(url, { ...init, headers: { ...headers(), ...(init.headers as Record<string, string>) } });
      if (!res.ok) throw new HttpError(res.status, `GitHub ${init.method ?? "GET"} ${url}: ${res.status} ${(await res.text()).slice(0, 300)}`);
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    },
    { retries: 3, shouldRetry: (e) => (e instanceof HttpError ? e.status === 429 || e.status >= 500 : true) },
  );
}

export type Release = { id: number; tag_name: string; upload_url: string; html_url: string; assets: Asset[] };
export type Asset = { id: number; name: string; url: string; browser_download_url: string; size: number };

export async function getOrCreateRelease(tag: string, name: string, body: string): Promise<Release> {
  try {
    return await gh<Release>(`https://api.github.com/repos/${repo()}/releases/tags/${encodeURIComponent(tag)}`);
  } catch (err) {
    if (!(err instanceof HttpError) || err.status !== 404) throw err;
  }
  log.info(`Creating release ${tag}`);
  return gh<Release>(`https://api.github.com/repos/${repo()}/releases`, {
    method: "POST",
    body: JSON.stringify({ tag_name: tag, name, body, draft: false, prerelease: true }),
  });
}

export async function uploadAsset(release: Release, file: string, contentType: string, name = path.basename(file)): Promise<Asset> {
  const existing = release.assets.find((a) => a.name === name);
  if (existing) {
    log.info(`Replacing existing asset ${name}`);
    await gh(`https://api.github.com/repos/${repo()}/releases/assets/${existing.id}`, { method: "DELETE" });
  }
  const size = (await fs.stat(file)).size;
  const uploadUrl = release.upload_url.replace(/\{[^}]*\}$/, "") + `?name=${encodeURIComponent(name)}`;
  log.info(`Uploading ${name} (${(size / 1e6).toFixed(1)} MB)`);
  const asset = await gh<Asset>(uploadUrl, {
    method: "POST",
    headers: { "content-type": contentType, "content-length": String(size) },
    body: await openAsBlob(file),
    // @ts-expect-error Node fetch needs duplex for streaming bodies
    duplex: "half",
  });
  release.assets = [...release.assets.filter((a) => a.name !== name), asset];
  return asset;
}

/** Download a release asset by its API url (works for private repos too). */
export async function downloadAsset(assetApiUrl: string, to: string): Promise<string> {
  await ensureDir(path.dirname(to));
  const res = await retry(async () => {
    const r = await fetch(assetApiUrl, { headers: headers({ accept: "application/octet-stream" }), redirect: "follow" });
    if (!r.ok) throw new HttpError(r.status, `GitHub asset download failed: ${r.status}`);
    return r;
  });
  await fs.writeFile(to, Buffer.from(await res.arrayBuffer()));
  return to;
}

export type StoredDraftAssets = { video: Asset; script: Asset; audio?: Asset; thumbnail?: Asset; props?: Asset; release: Release };

export async function storeDraft(opts: { tag: string; title: string; notes: string; video: string; script: string; audio?: string; thumbnail?: string; props?: string }): Promise<StoredDraftAssets> {
  const release = await getOrCreateRelease(opts.tag, opts.title, opts.notes);
  const video = await uploadAsset(release, opts.video, "video/mp4");
  const script = await uploadAsset(release, opts.script, "application/json");
  const audio = opts.audio ? await uploadAsset(release, opts.audio, "audio/wav") : undefined;
  const thumbnail = opts.thumbnail ? await uploadAsset(release, opts.thumbnail, "image/png") : undefined;
  const props = opts.props ? await uploadAsset(release, opts.props, "application/json") : undefined;
  return { video, script, audio, thumbnail, props, release };
}
