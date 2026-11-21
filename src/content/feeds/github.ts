/**
 * Live topic feed: repositories created in the last N days, ranked by stars, with a README excerpt as
 * the only source material the writer may use. Uses the public GitHub search API (GITHUB_TOKEN when
 * present, for the higher rate limit). Pure helpers are unit-tested; fetchers are thin.
 */
import { env } from "../../lib/env";
import { createLogger } from "../../lib/logger";
import type { Topic } from "../schema";

const log = createLogger("feed");

export type Repo = {
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  htmlUrl: string;
  createdAt: string;
  license: string | null;
  topics: string[];
  forks: number;
  /** Repository size in KB (clone farms are tiny). */
  sizeKb: number;
};

/** Descriptions we never feature: proxy/bypass tooling, key "checkers", cheats, adult content. */
const UNSUITABLE = /\b(proxy|bypass|crack(ed)?|cheat|hack(ing|ed)?|nsfw|adult|porn|unlock|checker|free (api )?keys?|stealer|spam|bot farm|casino|betting)\b/i;

/** README patterns of malware droppers dressed up as tools: archive downloads with passwords, file hosts, Telegram links. */
const README_BAIT = /\b(password|passcode)\b.*\b(archive|zip|rar)\b|\b(archive|zip|rar)\b.*\b(password|passcode)\b|\.(zip|rar|7z|exe|msi|dmg)\b|mediafire|mega\.nz|anonfiles|gofile|t\.me\/|telegram\.me|discord\.gg/i;

export function readmeLooksLikeBait(readme: string): boolean {
  return README_BAIT.test(readme.slice(0, 6000));
}

export type Owner = { login: string; createdAt: string; followers: number; publicRepos: number; type: string };

/** Established owner: an organisation, or an account older than 90 days, or one with a real following. */
export function ownerLooksEstablished(owner: Owner, now = Date.now()): boolean {
  if (owner.type === "Organization") return true;
  const ageDays = (now - Date.parse(owner.createdAt)) / 86_400_000;
  return ageDays >= 90 || owner.followers >= 50;
}

/**
 * Star-farmed clones: the same repository name pushed by many throwaway accounts with bought stars.
 * Signals: a name that appears under several owners, almost no forks for the star count, a tiny tree,
 * or an unsuitable description.
 */
export function isSpammy(repo: Repo, all: Repo[]): boolean {
  const name = (repo.fullName.split("/")[1] ?? "").toLowerCase();
  const sameName = all.filter((r) => (r.fullName.split("/")[1] ?? "").toLowerCase() === name).length;
  if (sameName >= 3) return true;
  if (repo.forks < Math.max(2, Math.floor(repo.stars * 0.01))) return true;
  if (repo.sizeKb < 30) return true;
  if (UNSUITABLE.test(`${repo.description ?? ""} ${name}`)) return true;
  return false;
}

export type FeedConfig = { kind: "github-repos"; topics: string[]; query: string; days: number; minStars: number };

/** Stable topic id for a repository: "gh-owner-name", lowercase, safe characters only. */
export function repoTopicId(fullName: string): string {
  return `gh-${fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`.slice(0, 60);
}

/**
 * README → plain-text notes: drops HTML, badges and images, keeps link text, keeps the first lines of
 * code blocks (install commands are useful), collapses whitespace and trims to `max` characters.
 */
export function cleanReadme(md: string, max = 2200): string {
  let s = md.replace(/\r/g, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/\[!\[[^\]]*]\([^)]*\)]\([^)]*\)/g, ""); // badge inside a link
  s = s.replace(/!\[[^\]]*]\([^)]*\)/g, ""); // images
  s = s.replace(/\[\s*]\([^)]*\)/g, ""); // empty links
  s = s.replace(/\[([^\]]+)]\([^)]*\)/g, "$1"); // links → their text
  s = s.replace(/```[^\n]*\n([\s\S]*?)```/g, (_m, body: string) =>
    body
      .split("\n")
      .filter((l) => l.trim())
      .slice(0, 4)
      .map((l) => `  ${l.trim()}`)
      .join("\n"),
  );
  s = s.replace(/^#{1,6}\s*/gm, "");
  s = s.replace(/[*_`>|]/g, "");
  s = s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (s.length > max) s = `${s.slice(0, max).replace(/\s+\S*$/, "")} …`;
  return s;
}

/** Highest-starred repository not used yet that has a description and enough stars. */
export function pickRepo(repos: Repo[], usedTopicIds: Iterable<string>, minStars: number): Repo | null {
  const used = new Set(usedTopicIds);
  return (
    [...repos]
      .filter((r) => r.description && r.description.trim().length >= 20 && r.stars >= minStars && !used.has(repoTopicId(r.fullName)) && !isSpammy(r, repos))
      .sort((a, b) => b.stars - a.stars)[0] ?? null
  );
}

export function repoToTopic(repo: Repo, readme: string): Topic {
  const name = repo.fullName.split("/")[1] ?? repo.fullName;
  const created = repo.createdAt.slice(0, 10);
  const header = [`Repository: ${repo.fullName}`, `Stars: about ${repo.stars} (created ${created})`, repo.language ? `Main language: ${repo.language}` : null, `License: ${repo.license ?? "not stated"}`, repo.topics.length ? `Topics: ${repo.topics.slice(0, 8).join(", ")}` : null, `Description: ${repo.description ?? ""}`]
    .filter(Boolean)
    .join("\n");
  return {
    id: repoTopicId(repo.fullName),
    question: `What is ${name} and why is everyone starring it?`,
    category: "tech",
    difficulty: 1,
    notes: `${header}\n\nREADME excerpt:\n${cleanReadme(readme)}`,
    sourceUrl: repo.htmlUrl,
    sourceName: repo.fullName,
  };
}

function headers(): Record<string, string> {
  const token = env("GITHUB_TOKEN") ?? env("GH_TOKEN");
  return { accept: "application/vnd.github+json", "user-agent": "bolt-shorts", ...(token ? { authorization: `Bearer ${token}` } : {}) };
}

type SearchItem = {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
  created_at: string;
  license: { spdx_id?: string | null; name?: string } | null;
  topics?: string[];
  forks_count?: number;
  size?: number;
};

async function searchRepos(q: string): Promise<SearchItem[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`;
  let res = await fetch(url, { headers: headers() });
  // A token that is not valid for api.github.com (some CI proxies) must not take the feed down.
  if (res.status === 401 && headers().authorization) res = await fetch(url, { headers: { ...headers(), authorization: "" } });
  if (!res.ok) throw new Error(`GitHub search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { items?: SearchItem[] };
  return json.items ?? [];
}

/** One search per topic (GitHub cannot OR qualifiers), merged and de-duplicated. */
export async function fetchRecentRepos(feed: FeedConfig): Promise<Repo[]> {
  const since = new Date(Date.now() - feed.days * 86_400_000).toISOString().slice(0, 10);
  const byName = new Map<string, SearchItem>();
  for (const topic of feed.topics) {
    const q = `created:>=${since} stars:>=${feed.minStars} topic:${topic} ${feed.query}`.trim();
    try {
      for (const item of await searchRepos(q)) byName.set(item.full_name, item);
    } catch (err) {
      // Unauthenticated search allows 10 calls/min: keep what we have rather than fail the day.
      if (byName.size > 0 && /403|429/.test((err as Error).message)) {
        log.warn(`feed: rate limited after topic "${topic}"; continuing with ${byName.size} repositories`);
        break;
      }
      throw err;
    }
  }
  return [...byName.values()].map((i) => ({
    fullName: i.full_name,
    description: i.description,
    stars: i.stargazers_count,
    language: i.language,
    htmlUrl: i.html_url,
    createdAt: i.created_at,
    license: i.license?.spdx_id && i.license.spdx_id !== "NOASSERTION" ? i.license.spdx_id : (i.license?.name ?? null),
    topics: i.topics ?? [],
    forks: i.forks_count ?? 0,
    sizeKb: i.size ?? 0,
  }));
}

export async function fetchOwner(login: string): Promise<Owner | null> {
  const h = headers();
  let res = await fetch(`https://api.github.com/users/${login}`, { headers: h });
  if (res.status === 401 && h.authorization) res = await fetch(`https://api.github.com/users/${login}`, { headers: { ...h, authorization: "" } });
  if (!res.ok) return null;
  const j = (await res.json()) as { login: string; created_at: string; followers: number; public_repos: number; type: string };
  return { login: j.login, createdAt: j.created_at, followers: j.followers, publicRepos: j.public_repos, type: j.type };
}

export async function fetchReadme(fullName: string): Promise<string> {
  const h: Record<string, string> = { ...headers(), accept: "application/vnd.github.raw+json" };
  let res = await fetch(`https://api.github.com/repos/${fullName}/readme`, { headers: h });
  if (res.status === 401 && h.authorization) res = await fetch(`https://api.github.com/repos/${fullName}/readme`, { headers: { ...h, authorization: "" } });
  if (!res.ok) return "";
  return res.text();
}

/** The next unused feed topic, or null when the feed is empty/unreachable (the caller falls back to topicsFile). */
export async function nextFeedTopic(feed: FeedConfig, usedTopicIds: string[]): Promise<Topic | null> {
  try {
    const repos = await fetchRecentRepos(feed);
    const skipped: string[] = [...usedTopicIds];
    // Check up to five candidates in star order: an established owner and a README that is not download bait.
    for (let i = 0; i < 5; i++) {
      const repo = pickRepo(repos, skipped, feed.minStars);
      if (!repo) break;
      skipped.push(repoTopicId(repo.fullName));
      const owner = await fetchOwner(repo.fullName.split("/")[0]!);
      if (!owner || !ownerLooksEstablished(owner)) {
        log.warn(`feed: skipping ${repo.fullName} (${repo.stars} stars): owner ${owner ? `created ${owner.createdAt.slice(0, 10)}, ${owner.followers} followers` : "lookup failed"}`);
        continue;
      }
      const readme = await fetchReadme(repo.fullName);
      if (readme.length < 400 || readmeLooksLikeBait(readme)) {
        log.warn(`feed: skipping ${repo.fullName}: README ${readme.length < 400 ? "too short" : "looks like download bait"}`);
        continue;
      }
      log.info(`feed: ${repo.fullName} (${repo.stars} stars, ${repo.language ?? "?"}, owner since ${owner.createdAt.slice(0, 10)}, README ${readme.length} chars)`);
      return repoToTopic(repo, readme);
    }
    log.warn(`feed: ${repos.length} repositories in the last ${feed.days} days, no trustworthy unused one with ≥ ${feed.minStars} stars`);
    return null;
  } catch (err) {
    log.warn(`feed unavailable (${(err as Error).message.split("\n")[0]}); using the topics file`);
    return null;
  }
}
