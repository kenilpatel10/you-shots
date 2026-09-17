/**
 * Daily generate job: pick a topic → write + review + validate a script → voice, captions, render
 * → store the draft on a GitHub Release → send it to Telegram for approval.
 *
 *   npm run generate -- --dry-run            # full pipeline locally, out/ only, no Telegram/upload
 *   npm run generate -- --topic animals-003  # force a topic
 *   npm run generate -- --dry-run --placeholder-voice --skip-render   # fastest offline smoke test
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { Command } from "commander";
import { currentLanguage, loadChannelConfig } from "../config";
import { fallbackTopic, pickFallbackScript } from "../content/fallback";
import { produceScript } from "../content/produceScript";
import { ScriptRecordSchema, TopicsFileSchema, type ScriptRecord, type Topic } from "../content/schema";
import { pickTopic } from "../content/topicPicker";
import { hasLlm } from "../llm";
import { LlmUnavailableError } from "../llm/types";
import { envBool } from "../lib/env";
import { readJson } from "../lib/fs";
import { createLogger } from "../lib/logger";
import { TOPICS_FILE } from "../lib/paths";
import { todayInZone } from "../lib/time";
import { assembleShort, type AssembleResult } from "../pipeline/assemble";
import { releasesConfigured, storeDraft } from "../publish/releases";
import { formatDraftMessage, notifyFailure, sendMessage, sendVideo, telegramConfigured, TELEGRAM_UPLOAD_LIMIT_BYTES } from "../publish/telegram";
import { draftForDate, loadState, makeDraftId, saveState, upsertDraft, type Draft, type State } from "../state/state";
import { renderVideo } from "../video/render";

const log = createLogger("generate");

const program = new Command()
  .option("--dry-run", "run everything locally; no Telegram, no release upload, no state change", false)
  .option("--topic <id>", "force a topic id from data/topics.json")
  .option("--voice <engine>", "kokoro | espeak (bundled, offline) | placeholder (babble, tests only); default: config engine")
  .option("--placeholder-voice", "alias for --voice placeholder (dry runs only)", false)
  .option("--skip-render", "stop after audio + props (no MP4)", false)
  .option("--force", "generate even if today already has a draft", false)
  .option("--fallback", "skip the LLM and use a hand-written fallback script", false)
  .parse(process.argv);

type Opts = { dryRun: boolean; topic?: string; voice?: "kokoro" | "espeak" | "placeholder"; placeholderVoice: boolean; skipRender: boolean; force: boolean; fallback: boolean };
const opts = program.opts<Opts>();

async function loadTopics(): Promise<Topic[]> {
  return TopicsFileSchema.parse(await readJson(TOPICS_FILE));
}

type Produced = { record: ScriptRecord; topic: Topic; fallbackFile?: string };

async function produce(state: State, topics: Topic[], language: string): Promise<Produced> {
  const useFallback = opts.fallback || !hasLlm();
  const forced = opts.topic ? topics.find((t) => t.id === opts.topic) : undefined;
  if (opts.topic && !forced) throw new Error(`Unknown topic id ${opts.topic}`);

  if (!useFallback) {
    const excluded = [...state.usedTopicIds];
    for (let i = 0; i < 3; i++) {
      const topic = forced ?? pickTopic({ topics, usedTopicIds: excluded, redoTopicIds: state.redoTopicIds });
      if (!topic) throw new Error("No unused topics left in data/topics.json");
      try {
        const out = await produceScript(topic, language);
        if (out.ok) return { record: out.record, topic };
        log.warn(`Topic "${topic.question}" failed review/validation twice: ${out.reasons.slice(-3).join("; ")}`);
      } catch (err) {
        if (err instanceof LlmUnavailableError) {
          log.warn(`LLM unavailable: ${err.message} ${JSON.stringify(err.causes)}`);
          break;
        }
        throw err;
      }
      if (forced) throw new Error(`Forced topic ${forced.id} did not pass review`);
      excluded.push(topic.id);
    }
  }

  const fb = await pickFallbackScript(state.usedFallbackScripts, state.usedTopicIds, opts.topic, language);
  if (!fb) throw new Error("No LLM available and all fallback scripts have been used. Add API keys (docs/SETUP_AI_KEYS.md) or more scripts to data/fallback-scripts/.");
  log.warn(`Using fallback script ${fb.file}`);
  const record = ScriptRecordSchema.parse({ ...fb.script, language, source: "fallback", reviewerNotes: ["Hand-checked fallback script (no LLM available)"], createdAt: new Date().toISOString() });
  return { record, topic: fallbackTopic(fb.script, topics), fallbackFile: fb.file };
}

async function main() {
  const cfg = loadChannelConfig();
  const state = await loadState();
  const today = todayInZone(cfg.timezone);
  const topics = await loadTopics();

  if (!opts.dryRun && !opts.force) {
    const existing = draftForDate(state, today);
    if (existing) {
      log.info(`A draft already exists for ${today} (${existing.id}, ${existing.status}). Nothing to do.`);
      return;
    }
  }
  const voiceMode = opts.placeholderVoice ? "placeholder" : (opts.voice ?? "auto");
  if (voiceMode === "placeholder" && !opts.dryRun) throw new Error("--placeholder-voice is only allowed with --dry-run");

  const { record, topic, fallbackFile } = await produce(state, topics, cfg.language);
  const draftId = opts.dryRun ? `dryrun-${cfg.language}-${today}-${topic.id}` : makeDraftId("short", today, topic.id);
  log.info(`Draft ${draftId}: "${record.title}" (${record.source}${record.model ? `, ${record.model}` : ""})`);

  const result: AssembleResult = await assembleShort({
    draftId,
    script: record,
    voiceMode,
    skipRender: opts.skipRender,
    onProgress: (stage) => log.info(`→ ${stage}`),
  });

  if (opts.dryRun) {
    log.info(`Dry run complete. Output in ${path.relative(process.cwd(), result.dir)}${opts.skipRender ? " (render skipped)" : ""}.`);
    log.info(`  duration ${result.durationSeconds.toFixed(1)}s · voice ${result.voiceSource} · captions ${result.timingSource}`);
    return;
  }
  const engine = currentLanguage(cfg).voice.engine;
  if (result.voiceSource !== engine) throw new Error(`Refusing to publish: voice was ${result.voiceSource}, config engine is ${engine}`);
  if (!telegramConfigured()) throw new Error("Telegram is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID); use --dry-run for local runs");

  const now = new Date().toISOString();
  let draft: Draft = {
    id: draftId,
    kind: "short",
    topicId: topic.id,
    date: today,
    language: cfg.language,
    title: record.title,
    status: "drafted",
    source: record.source,
    createdAt: now,
    updatedAt: now,
    durationSeconds: result.durationSeconds,
    assets: {},
    reviewerIssues: record.reviewerNotes,
    includes: [],
    description: record.description,
    tags: record.tags,
  };

  if (releasesConfigured()) {
    const stored = await storeDraft({
      tag: `draft-${today}`,
      title: `Draft ${today}: ${record.title}`,
      notes: `Automated draft for review. Topic: ${topic.question}\n\nApprove or reject via Telegram.`,
      video: result.videoPath,
      script: path.join(result.dir, "script.json"),
      audio: result.voicePath,
      props: result.propsPath,
    });
    draft = {
      ...draft,
      releaseTag: stored.release.tag_name,
      releaseUrl: stored.release.html_url,
      assets: { video: stored.video.url, videoPublic: stored.video.browser_download_url, script: stored.script.url, audio: stored.audio?.url, props: stored.props?.url },
    };
  } else {
    log.warn("GITHUB_TOKEN/GITHUB_REPOSITORY not set: the draft is kept locally only (out/). publish.ts needs out/ on the same machine.");
  }

  // Telegram: the video (compressed preview if the file is too large) then the script.
  let preview = result.videoPath;
  if ((await fs.stat(preview)).size > TELEGRAM_UPLOAD_LIMIT_BYTES - 2 * 1024 * 1024) {
    preview = path.join(result.dir, "preview.mp4");
    log.info("Rendering a smaller preview for Telegram");
    const props = await readJson<Record<string, unknown>>(result.propsPath);
    await renderVideo({ compositionId: "Short", inputProps: props, outputPath: preview, scale: 0.5, crf: 30 });
  }
  await sendVideo(preview, `${record.title}\nDraft ${draftId} · ${result.durationSeconds.toFixed(0)}s`);
  const messageId = await sendMessage(
    formatDraftMessage(draft, record, {
      reviewerNotes: record.reviewerNotes,
      source: record.source,
      model: record.model,
      durationSeconds: result.durationSeconds,
      timingSource: result.timingSource,
      assetUrl: draft.assets.videoPublic,
    }),
    { html: true },
  );
  draft.telegramMessageId = messageId;

  let next = upsertDraft(state, draft);
  next = {
    ...next,
    usedTopicIds: next.usedTopicIds.includes(topic.id) ? next.usedTopicIds : [...next.usedTopicIds, topic.id],
    redoTopicIds: next.redoTopicIds.filter((id) => id !== topic.id),
    usedFallbackScripts: fallbackFile ? [...next.usedFallbackScripts, fallbackFile] : next.usedFallbackScripts,
    lastRuns: { ...next.lastRuns, generate: now },
  };
  await saveState(next);
  log.info(`Draft ${draftId} sent for review.`);
}

main().catch(async (err) => {
  log.error(String(err?.stack ?? err));
  if (!opts.dryRun && !envBool("SKIP_FAILURE_ALERT")) await notifyFailure("generate", err);
  process.exit(1);
});
