/**
 * Weekly compilation: the week's approved Shorts re-rendered in a landscape layout with chapter
 * cards, an intro/outro, YouTube chapter timestamps and a thumbnail. Same approval flow as Shorts.
 *
 *   npm run weekly -- --dry-run   # 5 sample scripts → out/weekly-dryrun/{long.mp4,thumbnail.png}
 *   npm run weekly                # real: needs ≥ weeklyMinApproved approved Shorts this week
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { Command } from "commander";
import { chapterList, planLongVideo } from "../../remotion/long/plan";
import { FPS } from "../../remotion/theme";
import type { LongEpisode, LongVideoProps, ShortProps, ThumbnailProps } from "../../remotion/schema";
import { channelIdentity, currentLanguage, finishDescription, loadChannelConfig } from "../config";
import { listFallbackScripts } from "../content/fallback";
import { ScriptRecordSchema } from "../content/schema";
import { ensureMusic } from "../audio/music";
import { envBool } from "../lib/env";
import { ensureDir, exists, readJson, writeJsonAtomic } from "../lib/fs";
import { createLogger } from "../lib/logger";
import { runCli } from "../lib/cli";
import { draftDir, publicDraftDir } from "../lib/paths";
import { addDays, formatYmd, isoWeekKey, parseYmd, todayInZone } from "../lib/time";
import { assembleShort } from "../pipeline/assemble";
import { downloadAsset, releasesConfigured, storeDraft } from "../publish/releases";
import { escapeHtml, notifyFailure, sendMessage, sendPhoto, sendVideo, telegramConfigured, TELEGRAM_UPLOAD_LIMIT_BYTES } from "../publish/telegram";
import { langState, loadState, makeDraftId, saveState, upsertDraft, withLangState, type Draft } from "../state/state";
import { renderPng, renderVideo } from "../video/render";

const log = createLogger("weekly");
const opts = new Command()
  .option("--dry-run", "compile 5 sample scripts locally; no Telegram/release/state", false)
  .option("--voice <engine>", "kokoro | gemini | espeak | placeholder (dry runs)")
  .option("--placeholder-voice", "alias for --voice placeholder", false)
  .option("--skip-render", "stop after props (no MP4)", false)
  .option("--week <key>", "ISO week key like 2026-W37 (default: the week containing today)")
  .parse(process.argv)
  .opts<{
    dryRun: boolean;
    voice?: "kokoro" | "gemini" | "espeak" | "placeholder";
    placeholderVoice: boolean;
    skipRender: boolean;
    week?: string;
  }>();

/** Monday..Sunday (channel timezone) of the ISO week containing `today`. */
function weekRange(today: string): { key: string; start: string; end: string } {
  const ymd = parseYmd(today);
  const dow = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day)).getUTCDay() || 7;
  const start = addDays(ymd, 1 - dow);
  return {
    key: isoWeekKey(ymd),
    start: formatYmd(start),
    end: formatYmd(addDays(start, 6)),
  };
}

function thumbnailWords(title: string): string[] {
  const words = title.replace(/[?!.]/g, "").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 11 && cur) {
      out.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
    if (out.length === 3) break;
  }
  if (cur && out.length < 4) out.push(cur);
  const last = out.length - 1;
  out[last] = out[last]!.toUpperCase() + "?";
  return out.slice(0, 4);
}

/** Episode props from a draft's video.json (locally or downloaded from the release). */
async function loadEpisode(d: Draft): Promise<LongEpisode> {
  const propsFile = path.join(draftDir(d.id), "video.json");
  const voiceFile = path.join(publicDraftDir(d.id), "voice.wav");
  if (!(await exists(propsFile)) || !(await exists(voiceFile))) {
    if (!d.assets.props || !d.assets.audio || !releasesConfigured()) throw new Error(`Draft ${d.id}: no local props/voice and no release assets to download`);
    await downloadAsset(d.assets.props, propsFile);
    await downloadAsset(d.assets.audio, voiceFile);
  }
  const p = (await readJson(propsFile)) as ShortProps;
  return {
    draftId: d.id,
    chapterTitle: p.script.title,
    script: p.script,
    timeline: p.timeline,
    audio: { ...p.audio, voice: `drafts/${d.id}/voice.wav` },
  };
}

async function main() {
  const cfg = loadChannelConfig();
  const lang = currentLanguage(cfg);
  const state = await loadState();
  const today = todayInZone(cfg.timezone);
  const week = opts.week ? { key: opts.week, start: "", end: "" } : weekRange(today);
  const identity = channelIdentity(cfg, cfg.language);
  const channel = {
    name: identity.name,
    handle: identity.handle,
    characterName: cfg.characterName,
    catchphrase: lang.catchphrase,
    askGrownUp: lang.askGrownUp,
    language: cfg.language,
    feelings: lang.feelings,
    sidekickName: lang.sidekickName,
    labels: lang.labels,
  };

  let episodes: LongEpisode[];
  let includes: string[] = [];
  const draftId = opts.dryRun ? "weekly-dryrun" : makeDraftId("weekly", week.key, "", cfg.language);
  if (opts.dryRun) {
    const samples = (await listFallbackScripts(cfg.language)).slice(0, 5);
    episodes = [];
    for (const [i, s] of samples.entries()) {
      const id = `weekly-sample-${i + 1}`;
      const record = ScriptRecordSchema.parse({
        ...s.script,
        language: cfg.language,
        source: "fallback",
        createdAt: new Date().toISOString(),
      });
      const r = await assembleShort({
        draftId: id,
        script: record,
        voiceMode: opts.placeholderVoice ? "placeholder" : (opts.voice ?? "auto"),
        skipRender: true,
      });
      const p = (await readJson(r.propsPath)) as ShortProps;
      episodes.push({
        draftId: id,
        chapterTitle: p.script.title,
        script: p.script,
        timeline: p.timeline,
        audio: p.audio,
      });
    }
  } else {
    if (langState(state, cfg.language).weeklyCompiled.includes(week.key)) {
      log.info(`Week ${week.key} (${cfg.language}) already compiled. Nothing to do.`);
      return;
    }
    const inWeek = state.drafts.filter((d) => d.kind === "short" && d.language === cfg.language && (d.status === "approved" || d.status === "uploaded") && (!week.start || (d.date >= week.start && d.date <= week.end)));
    if (inWeek.length < cfg.weeklyMinApproved) {
      log.info(`Only ${inWeek.length} approved ${cfg.language} Shorts in ${week.key} (need ${cfg.weeklyMinApproved}). Skipping.`);
      return;
    }
    inWeek.sort((a, b) => a.date.localeCompare(b.date));
    episodes = [];
    for (const d of inWeek) episodes.push(await loadEpisode(d));
    includes = inWeek.map((d) => d.id);
  }

  const music = await ensureMusic(cfg.music.file, cfg.music.enabled);
  const props: LongVideoProps = {
    channel,
    weekTitle: lang.weeklyTitle,
    outro: lang.weeklyOutro,
    episodes,
    music,
    musicVolume: cfg.music.volume * 0.85,
    duckedVolume: cfg.music.duckedVolume,
  };
  const plan = planLongVideo(props);
  const chapters = chapterList(props, FPS);
  const durationSeconds = plan.totalFrames / FPS;
  const dir = draftDir(draftId);
  await ensureDir(dir);
  await writeJsonAtomic(path.join(dir, "long.json"), props);
  const title = `${lang.weeklyTitle}: ${episodes
    .map((e) => e.chapterTitle.replace(/\?$/, ""))
    .slice(0, 2)
    .join(" · ")}${episodes.length > 2 ? " and more" : ""}`.slice(0, 100);
  const description = finishDescription(`${cfg.characterName} answers ${episodes.length} big questions this week.\n\n${chapters}\n\n${episodes.map((e) => `• ${e.chapterTitle}`).join("\n")}`, identity);
  await writeJsonAtomic(path.join(dir, "meta.json"), {
    title,
    description,
    chapters,
    durationSeconds,
    includes,
  });
  log.info(`Compilation: ${episodes.length} episodes, ${durationSeconds.toFixed(0)}s\n${chapters}`);

  const thumbProps: ThumbnailProps = {
    channel,
    words: thumbnailWords(episodes[0]!.chapterTitle),
    background: episodes[0]!.script.background,
  };
  const thumbnail = await renderPng({
    compositionId: "Thumbnail",
    inputProps: thumbProps,
    outputPath: path.join(dir, "thumbnail.png"),
  });
  const video = path.join(dir, "long.mp4");
  if (!opts.skipRender)
    await renderVideo({
      compositionId: "LongVideo",
      inputProps: props,
      outputPath: video,
      crf: 21,
    });

  if (opts.dryRun) {
    log.info(`Dry run complete → ${path.relative(process.cwd(), dir)} (thumbnail.png, long.json${opts.skipRender ? "" : ", long.mp4"})`);
    return;
  }
  if (!telegramConfigured()) throw new Error("Telegram is not configured");
  const now = new Date().toISOString();
  let draft: Draft = {
    id: draftId,
    kind: "weekly",
    topicId: week.key,
    date: today,
    language: cfg.language,
    title,
    status: "drafted",
    source: "llm",
    createdAt: now,
    updatedAt: now,
    durationSeconds,
    assets: {},
    reviewerIssues: [],
    includes,
    description,
    tags: identity.longTags,
  };
  if (releasesConfigured()) {
    const stored = await storeDraft({
      tag: `weekly-${week.key}-${cfg.language}`,
      title,
      notes: description,
      video,
      script: path.join(dir, "meta.json"),
      thumbnail,
      props: path.join(dir, "long.json"),
    });
    draft = {
      ...draft,
      releaseTag: stored.release.tag_name,
      releaseUrl: stored.release.html_url,
      assets: {
        video: stored.video.url,
        videoPublic: stored.video.browser_download_url,
        script: stored.script.url,
        thumbnail: stored.thumbnail?.url,
        props: stored.props?.url,
      },
    };
  }
  let preview = video;
  if ((await fs.stat(video)).size > TELEGRAM_UPLOAD_LIMIT_BYTES - 2 * 1024 * 1024) {
    preview = path.join(dir, "preview.mp4");
    log.info("Rendering a smaller preview for Telegram");
    await renderVideo({
      compositionId: "LongVideo",
      inputProps: props,
      outputPath: preview,
      scale: 0.5,
      crf: 32,
    });
  }
  await sendPhoto(thumbnail, `Thumbnail for ${title}`);
  await sendVideo(preview, `${title}\nDraft ${draftId} · ${Math.round(durationSeconds / 60)} min`);
  await sendMessage(
    `📺 <b>Weekly compilation draft</b> — ${escapeHtml(week.key)} · ${escapeHtml(identity.name)} (${escapeHtml(identity.label)})\n<b>${escapeHtml(title)}</b>\nDraft ID: <code>${escapeHtml(draftId)}</code>\n\n<b>Chapters</b>\n${escapeHtml(chapters)}${draft.assets.videoPublic ? `\n\nFull-quality file: ${escapeHtml(draft.assets.videoPublic)}` : ""}\n\nReply <code>/approve ${escapeHtml(draftId)}</code> or <code>/reject ${escapeHtml(draftId)} reason</code>`,
    { html: true },
  );
  let next = upsertDraft(state, draft);
  next = withLangState(next, cfg.language, {
    weeklyCompiled: [...langState(next, cfg.language).weeklyCompiled, week.key],
  });
  next = { ...next, lastRuns: { ...next.lastRuns, weekly: now } };
  await saveState(next);
  log.info(`Weekly draft ${draftId} sent for review.`);
}

runCli("weekly", main, async (err) => {
  if (!opts.dryRun && !envBool("SKIP_FAILURE_ALERT")) await notifyFailure("weekly", err);
});
