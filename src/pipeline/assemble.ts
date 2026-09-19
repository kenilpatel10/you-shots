/**
 * Turns a reviewed script into a finished Short: voice (Kokoro) → normalised track → word
 * timings (whisper.cpp or estimate) → timeline → Remotion props → MP4.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { FPS } from "../../remotion/theme";
import { GUESS_PAUSE_MS, SIGNOFF_TAIL_FRAMES, type ShortProps, type Timeline } from "../../remotion/schema";
import { channelIdentity, currentLanguage, loadChannelConfig } from "../config";
import { SECTION_ORDER } from "../audio/estimateTimings";
import { mixSections } from "../audio/mix";
import { ensureMusic } from "../audio/music";
import { ensureSfx } from "../audio/sfx";
import { placeholderVoice } from "../audio/placeholder";
import { synthesizeEspeak } from "../audio/espeak";
import { currentGeminiTtsModel, synthesizeGemini } from "../audio/geminiTts";
import { timeSection } from "../audio/timings";
import { synthesizeSection } from "../audio/tts";
import { concat, encodeWav, silence, type PcmAudio } from "../audio/wav";
import { buildTimeline, type SectionInput } from "../content/timeline";
import { sectionSpokenText, type ScriptRecord } from "../content/schema";
import { guestFor, guestName } from "../../remotion/guests";
import { needsGrownUp } from "../content/validate";
import { envBool } from "../lib/env";
import { ensureDir, writeJsonAtomic } from "../lib/fs";
import { createLogger } from "../lib/logger";
import { draftDir, publicDraftDir } from "../lib/paths";
import { renderVideo } from "../video/render";

const log = createLogger("assemble");

export const HARD_MAX_SECONDS = 59;

export type VoiceMode = "kokoro" | "gemini" | "espeak" | "placeholder" | "auto";
export type VoiceSource = "kokoro" | "gemini" | "espeak" | "placeholder";

export type AssembleResult = {
  draftId: string;
  dir: string;
  videoPath: string;
  propsPath: string;
  voicePath: string;
  durationSeconds: number;
  timeline: Timeline;
  voiceSource: VoiceSource;
  timingSource: Timeline["timingSource"];
};

export type AssembleOptions = {
  draftId: string;
  script: ScriptRecord;
  voiceMode?: VoiceMode;
  /** Skip rendering (audio + props only). */
  skipRender?: boolean;
  onProgress?: (stage: string) => void;
};

let warnedFallback = false;

type VoiceOverride = { guest?: boolean };

/** Second voice for the guest character, per engine, unless the config names one. */
function guestVoice(lang: ReturnType<typeof currentLanguage>, engine: string): string {
  if (lang.voice.guestVoiceId) return lang.voice.guestVoiceId;
  if (engine === "kokoro") return "am_puck";
  if (engine === "gemini") return "Puck";
  return lang.voice.espeakVoice.replace(/\+.*$/, "") + "+m3";
}

async function makeVoice(text: string, mode: VoiceMode, seed: number, override: VoiceOverride = {}): Promise<{ audio: PcmAudio; source: VoiceSource }> {
  const lang = currentLanguage();
  if (mode === "placeholder") return { audio: placeholderVoice(text, seed), source: "placeholder" };
  const engine = mode === "auto" ? lang.voice.engine : mode;
  const voiceId = override.guest ? guestVoice(lang, engine) : lang.voice.voiceId;
  const espeak = {
    voice: override.guest ? guestVoice(lang, "espeak") : lang.voice.espeakVoice,
    wpm: Math.round(150 * lang.voice.speed),
  }; // eSpeak words/min; ~155 keeps 58 s scripts under the 59 s cap
  if (engine === "espeak") return { audio: await synthesizeEspeak(text, espeak), source: "espeak" };
  try {
    if (engine === "gemini") {
      const audio = await synthesizeGemini(text, {
        voice: voiceId,
        style: override.guest ? (lang.voice.guestStyle ?? "as a playful, squeaky cartoon character, quick and cheeky") : lang.voice.style,
        languageName: lang.label,
      });
      return { audio, source: "gemini" };
    }
    const audio = await synthesizeSection(text, {
      voiceId,
      speed: override.guest ? lang.voice.speed * 1.08 : lang.voice.speed,
    });
    return { audio, source: "kokoro" };
  } catch (err) {
    if (mode === "auto" && (envBool("ALLOW_FALLBACK_VOICE") || envBool("ALLOW_PLACEHOLDER_VOICE"))) {
      // Offline machines: eSpeak ships inside node_modules, so speech stays real and intelligible.
      if (!warnedFallback) log.warn(`${engine} voice unavailable (${(err as Error).message.split("\n")[0]}). Using the bundled eSpeak voice — dry runs only.`);
      warnedFallback = true;
      return { audio: await synthesizeEspeak(text, espeak), source: "espeak" };
    }
    throw new Error(`Text-to-speech failed: ${(err as Error).message}. Set ALLOW_FALLBACK_VOICE=1 for an offline test render with the bundled eSpeak voice.`);
  }
}

export async function assembleShort(opts: AssembleOptions): Promise<AssembleResult> {
  const cfg = loadChannelConfig();
  const lang = currentLanguage(cfg);
  const identity = channelIdentity(cfg, cfg.language);
  const mode = opts.voiceMode ?? "auto";
  const dir = draftDir(opts.draftId);
  const audioDir = path.join(dir, "audio");
  await ensureDir(audioDir);
  await writeJsonAtomic(path.join(dir, "script.json"), opts.script);

  // 1. Voice per section
  opts.onProgress?.("voice");
  let clips: PcmAudio[] = [];
  let gagOffsetMs: number | undefined;
  let voiceSource: VoiceSource = lang.voice.engine;
  const spoken = Object.fromEntries(SECTION_ORDER.map((k) => [k, sectionSpokenText(opts.script, k)])) as Record<(typeof SECTION_ORDER)[number], string>;
  // One voice per video: if the Gemini engine had to switch model mid-way (quota), start over so
  // every section is spoken by the same model. Bounded by the number of models in the chain.
  for (let pass = 0; pass < 4; pass++) {
    clips = [];
    let modelAtStart: string | null = null;
    let restart = false;
    for (const [i, key] of SECTION_ORDER.entries()) {
      const narrated = await makeVoice(key === "wowFact" && opts.script.gag ? opts.script.wowFact : spoken[key], mode, i + 1);
      const source = narrated.source;
      let audio = narrated.audio;
      if (key === "wowFact" && opts.script.gag) {
        // Comedy beat: the guest's line in a second voice, after a short beat of silence.
        const guest = await makeVoice(opts.script.gag.line, mode, 99, { guest: true });
        const gapMs = 300;
        gagOffsetMs = Math.round((audio.samples.length / audio.sampleRate) * 1000) + gapMs;
        audio = { sampleRate: audio.sampleRate, samples: concat([audio.samples, silence(gapMs, audio.sampleRate), guest.audio.samples]) };
      }
      voiceSource = source;
      const model = source === "gemini" ? currentGeminiTtsModel() : null;
      if (i === 0) modelAtStart = model;
      else if (model !== modelAtStart) {
        log.warn(`Voice model changed from ${modelAtStart} to ${model} at "${key}"; re-voicing all sections with ${model}`);
        restart = true;
        break;
      }
      clips.push(audio);
      await fs.writeFile(path.join(audioDir, `${key}.wav`), encodeWav(audio));
      log.info(`  ${key}: ${(audio.samples.length / audio.sampleRate).toFixed(1)}s`);
    }
    if (!restart) break;
  }
  if (clips.length !== SECTION_ORDER.length) throw new Error("Text-to-speech could not keep one voice for the whole video (model kept changing)");

  // 2. Normalise + concatenate (extra silence after the hook when there is a guess beat)
  const guessPause = opts.script.guess ? GUESS_PAUSE_MS : 0;
  const mixed = mixSections(clips, undefined, undefined, [guessPause]);
  const voicePath = path.join(audioDir, "voice.wav");
  await fs.writeFile(voicePath, encodeWav(mixed.track));

  // 3. Word timings per section (whisper.cpp or estimate)
  opts.onProgress?.("timings");
  const sections: SectionInput[] = [];
  let timingSource: Timeline["timingSource"] = "whisper";
  for (const [i, key] of SECTION_ORDER.entries()) {
    const clip = clips[i]!;
    const durationMs = Math.round((clip.samples.length / clip.sampleRate) * 1000);
    const t =
      voiceSource === "placeholder"
        ? { words: undefined, source: "estimated" as const }
        : await timeSection({
            text: spoken[key],
            audio: clip,
            model: lang.whisper.model,
            language: lang.whisper.language,
            workDir: audioDir,
            key,
          });
    if (t.source === "estimated") timingSource = "estimated";
    sections.push({ key, text: spoken[key], durationMs, words: t.words, ...(key === "wowFact" && gagOffsetMs !== undefined ? { gagOffsetMs } : {}) });
  }

  // Sections are positioned by the mixer's actual starts (lead-in + gaps + normalised lengths).
  const timeline = buildTimeline({
    fps: FPS,
    sections,
    expressionCues: opts.script.expressionCues,
    grownUp: cfg.audience === "kids" && needsGrownUp(opts.script.experiment),
    timingSource,
    gapMs: 0,
  });
  // Shift to absolute positions from the mixer.
  timeline.sections.forEach((s, i) => {
    const offset = mixed.starts[i]! - s.startMs;
    s.startMs += offset;
    s.endMs += offset;
    for (const w of s.words) {
      w.startMs += offset;
      w.endMs += offset;
    }
    if (s.gag) {
      s.gag.startMs += offset;
      s.gag.endMs += offset;
    }
  });
  const lastEnd = timeline.sections[timeline.sections.length - 1]!.endMs;
  timeline.totalFrames = Math.ceil((lastEnd / 1000) * FPS) + SIGNOFF_TAIL_FRAMES;
  if (guessPause) {
    const hook = timeline.sections[0]!;
    const answer = timeline.sections[1]!;
    timeline.guess = { startMs: hook.endMs + 150, endMs: answer.startMs };
  }
  const durationSeconds = timeline.totalFrames / FPS;
  if (durationSeconds > HARD_MAX_SECONDS) {
    throw new Error(`Rendered length would be ${durationSeconds.toFixed(1)}s, above the ${HARD_MAX_SECONDS}s hard maximum. The script is too long.`);
  }

  // 4. Stage assets for Remotion (public/drafts/<id>/) and build props
  const pub = publicDraftDir(opts.draftId);
  await ensureDir(pub);
  await fs.copyFile(voicePath, path.join(pub, "voice.wav"));
  const music = await ensureMusic(cfg.music.file, cfg.music.enabled);
  const sfx = await ensureSfx();
  const feelingLabels = lang.feelings;
  const props: ShortProps = {
    script: {
      topicId: opts.script.topicId,
      title: opts.script.title,
      hook: opts.script.hook,
      answer: opts.script.answer,
      wowFact: opts.script.wowFact,
      experiment: opts.script.experiment,
      signOff: opts.script.signOff,
      onScreenText: opts.script.onScreenText,
      background: opts.script.background,
      guess: opts.script.guess,
      ...(opts.script.gag ? { gag: { line: opts.script.gag.line, reaction: opts.script.gag.reaction, guest: guestFor(opts.script.background).kind, guestName: guestName(opts.script.background, cfg.language) } } : {}),
    },
    channel: {
      name: identity.name,
      handle: identity.handle,
      brand: cfg.brand,
      characterName: cfg.characterName,
      catchphrase: lang.catchphrase,
      askGrownUp: lang.askGrownUp,
      language: cfg.language,
      feelings: feelingLabels,
      sidekickName: lang.sidekickName,
      labels: lang.labels,
    },
    timeline,
    audio: {
      voice: `drafts/${opts.draftId}/voice.wav`,
      music,
      musicVolume: cfg.music.volume,
      duckedVolume: cfg.music.duckedVolume,
      fadeSeconds: cfg.music.fadeSeconds,
      sfx,
    },
  };
  const propsPath = path.join(dir, "video.json");
  await writeJsonAtomic(propsPath, props);
  await writeJsonAtomic(path.join(dir, "timings.json"), {
    timingSource,
    voiceSource,
    sections: timeline.sections,
  });

  // 5. Render
  const videoPath = path.join(dir, "short.mp4");
  if (!opts.skipRender) {
    opts.onProgress?.("render");
    await renderVideo({
      compositionId: "Short",
      inputProps: props,
      outputPath: videoPath,
    });
  }
  log.info(`Short assembled: ${durationSeconds.toFixed(1)}s, voice=${voiceSource}, timings=${timingSource}`);
  return {
    draftId: opts.draftId,
    dir,
    videoPath,
    propsPath,
    voicePath,
    durationSeconds,
    timeline,
    voiceSource,
    timingSource,
  };
}
