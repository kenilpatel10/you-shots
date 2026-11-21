import { describe, expect, it } from "vitest";
import { cleanReadme, isSpammy, ownerLooksEstablished, pickRepo, readmeLooksLikeBait, repoToTopic, repoTopicId, type Repo } from "./github";

const repo = (fullName: string, stars: number, description: string | null = "A tool that does something useful for people"): Repo => ({
  fullName,
  stars,
  description,
  language: "Python",
  htmlUrl: `https://github.com/${fullName}`,
  createdAt: "2026-11-18T10:00:00Z",
  license: "MIT",
  topics: ["ai", "llm"],
  forks: Math.max(5, Math.round(stars * 0.05)),
  sizeKb: 2400,
});

describe("github feed", () => {
  it("makes stable, safe topic ids from repository names", () => {
    expect(repoTopicId("Open-AI/Some_Repo.js")).toBe("gh-open-ai-some-repo-js");
    expect(repoTopicId("a/b").length).toBeLessThan(61);
  });

  it("turns a README into plain notes: no html, badges or links, short code blocks kept", () => {
    const md = `# Title\n<p align="center"><img src="x.png"></p>\n[![build](https://img.shields.io/x)](https://ci)\nSee the [docs](https://example.com/docs) for **more**.\n\n\`\`\`bash\npip install thing\nthing run\n# a\n# b\n# c\n# d\n\`\`\`\n`;
    const out = cleanReadme(md);
    expect(out).not.toMatch(/<|shields|https?:/);
    expect(out).toContain("See the docs for more.");
    expect(out).toContain("pip install thing");
    expect(out).not.toContain("# d");
  });

  it("caps the notes length at a word boundary", () => {
    const out = cleanReadme("word ".repeat(1000), 200);
    expect(out.length).toBeLessThanOrEqual(205);
    expect(out.endsWith("…")).toBe(true);
  });

  it("picks the most-starred unused repository with a real description", () => {
    const repos = [repo("a/used", 900), repo("b/nodesc", 800, null), repo("c/small", 20), repo("d/best", 500), repo("e/second", 400)];
    expect(pickRepo(repos, ["gh-a-used"], 100)?.fullName).toBe("d/best");
    expect(pickRepo(repos, ["gh-a-used", "gh-d-best", "gh-e-second"], 100)).toBeNull();
  });

  it("drops star-farmed clones, fork-less repos, tiny trees and unsuitable projects", () => {
    const clones = ["x1/Gemini-Config-Checker-", "x2/Gemini-Config-Checker-", "x3/Gemini-Config-Checker-"].map((n) => repo(n, 470, "Chain region scanner: find proxy configs that get you into Google AI Studio"));
    const legit = repo("acme/fastagent", 300);
    const noForks = { ...repo("foo/bar", 900), forks: 0 };
    const tiny = { ...repo("foo/tiny", 900), sizeKb: 4 };
    const all = [...clones, legit, noForks, tiny];
    expect(pickRepo(all, [], 100)?.fullName).toBe("acme/fastagent");
    expect(all.filter((r) => isSpammy(r, all)).map((r) => r.fullName)).toEqual([...clones.map((c) => c.fullName), "foo/bar", "foo/tiny"]);
  });

  it("recognises download-bait READMEs and throwaway owners", () => {
    expect(readmeLooksLikeBait("Download the archive and unzip. Password: 1234")).toBe(true);
    expect(readmeLooksLikeBait("Grab the latest release from mediafire")).toBe(true);
    expect(readmeLooksLikeBait("Join our community: https://t.me/xyz")).toBe(true);
    expect(readmeLooksLikeBait("# FastAgent\n\npip install fastagent\n\nAgents that run locally.")).toBe(false);
    const now = Date.parse("2026-11-21T00:00:00Z");
    expect(ownerLooksEstablished({ login: "new", createdAt: "2026-11-01T00:00:00Z", followers: 2, publicRepos: 1, type: "User" }, now)).toBe(false);
    expect(ownerLooksEstablished({ login: "old", createdAt: "2021-01-01T00:00:00Z", followers: 2, publicRepos: 1, type: "User" }, now)).toBe(true);
    expect(ownerLooksEstablished({ login: "org", createdAt: "2026-11-01T00:00:00Z", followers: 0, publicRepos: 1, type: "Organization" }, now)).toBe(true);
  });

  it("builds a tech topic whose notes carry the facts and the source", () => {
    const t = repoToTopic(repo("acme/fastagent", 1234), "# FastAgent\nAgents that run locally.\n");
    expect(t.id).toBe("gh-acme-fastagent");
    expect(t.category).toBe("tech");
    expect(t.sourceUrl).toBe("https://github.com/acme/fastagent");
    expect(t.notes).toContain("Stars: about 1234");
    expect(t.notes).toContain("License: MIT");
    expect(t.notes).toContain("Agents that run locally.");
  });
});
