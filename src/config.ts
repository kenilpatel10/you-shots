import { z } from "zod";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONFIG_DIR } from "./lib/paths";
import { env } from "./lib/env";

const LanguageConfig = z.object({
  label: z.string(),
  catchphrase: z.string().min(3),
  voice: z.object({
    /** kokoro (local neural, English) · gemini (Gemini API TTS, any language) · espeak (bundled, offline). */
    engine: z.enum(["kokoro", "gemini", "espeak"]),
    /** Kokoro voice id (af_heart …) or Gemini prebuilt voice name (Leda, Kore, Aoede …). */
    voiceId: z.string(),
    speed: z.number().min(0.7).max(1.4),
    /** eSpeak voice used when engine is espeak or as the offline fallback (e.g. "en-us+f3", "hi+f3"). */
    espeakVoice: z.string().default("en-us"),
    /** Delivery instructions for the gemini engine. */
    style: z.string().optional(),
    /** Measured speaking rate of this voice; scales the writer's word budget and the validator's length estimate. */
    wordsPerSecond: z.number().min(1).max(5).default(2.7),
  }),
  /** Per-language YouTube identity; defaults to the top-level name/handle/tags. */
  channelName: z.string().optional(),
  handle: z.string().optional(),
  shortTags: z.array(z.string()).optional(),
  longTags: z.array(z.string()).optional(),
  whisper: z.object({
    model: z.enum(["tiny", "tiny.en", "base", "base.en", "small", "small.en", "medium", "medium.en", "large-v3-turbo"]),
    language: z.string(),
  }),
  askGrownUp: z.string(),
  /** Labels for the feeling chip shown when Bolt's expression changes. */
  feelings: z.record(z.string(), z.string()).default({}),
  sidekickName: z.string().default("Pip"),
  /** On-screen UI labels (section tags, reveal, chapter word). */
  labels: z.record(z.string(), z.string()).default({}),
  weeklyTitle: z.string(),
  weeklyOutro: z.string(),
  font: z.string(),
});

export const ChannelConfigSchema = z.object({
  name: z.string().min(1),
  handle: z.string(),
  characterName: z.string(),
  language: z.string().min(2),
  timezone: z.string(),
  uploadTime: z.string().regex(/^\d{1,2}:\d{2}$/),
  maxShortsPerDay: z.literal(1),
  reminderAfterHours: z.number().positive(),
  weeklyMinApproved: z.number().int().positive(),
  youtube: z.object({
    categoryId: z.string(),
    containsSyntheticMedia: z.boolean(),
    notifySubscribers: z.boolean(),
    shortTags: z.array(z.string()),
    longTags: z.array(z.string()),
  }),
  languages: z.record(z.string(), LanguageConfig),
  music: z.object({
    enabled: z.boolean(),
    file: z.string(),
    volume: z.number().min(0).max(1),
    duckedVolume: z.number().min(0).max(1),
    fadeSeconds: z.number().min(0),
  }),
  colors: z.object({
    primary: z.string(),
    accent: z.string(),
    highlight: z.string(),
    ink: z.string(),
    paper: z.string(),
  }),
});

export type ChannelConfig = z.infer<typeof ChannelConfigSchema>;
export type LanguageConfig = z.infer<typeof LanguageConfig>;

export const BannedWordsSchema = z.object({
  banned: z.array(z.string()),
  bannedInExperiment: z.array(z.string()).default([]),
  requiredWhenHandling: z.object({
    triggers: z.array(z.string()),
    required: z.array(z.string()),
  }),
  kitchenAllowList: z.array(z.string()),
});
export type BannedWords = z.infer<typeof BannedWordsSchema>;

let cached: ChannelConfig | null = null;

/** The language written in config/channel.json (ignores CHANNEL_LANGUAGE): owns the un-suffixed secrets. */
export function defaultLanguage(): string {
  const raw = JSON.parse(readFileSync(path.join(CONFIG_DIR, "channel.json"), "utf8")) as { language?: string };
  return raw.language ?? "en";
}

export function loadChannelConfig(): ChannelConfig {
  if (cached) return cached;
  const raw = JSON.parse(readFileSync(path.join(CONFIG_DIR, "channel.json"), "utf8"));
  const cfg = ChannelConfigSchema.parse(raw);
  const lang = env("CHANNEL_LANGUAGE") ?? cfg.language;
  if (!cfg.languages[lang]) {
    throw new Error(`CHANNEL_LANGUAGE="${lang}" has no entry in config/channel.json → languages. See docs/HINDI.md for adding one.`);
  }
  cached = { ...cfg, language: lang };
  return cached;
}

export function currentLanguage(cfg = loadChannelConfig()): LanguageConfig {
  return cfg.languages[cfg.language]!;
}

export function languageConfig(cfg: ChannelConfig, language: string): LanguageConfig {
  const lang = cfg.languages[language];
  if (!lang) throw new Error(`Language "${language}" has no entry in config/channel.json → languages`);
  return lang;
}

/** All languages the pipeline runs (CHANNEL_LANGUAGES='["en","hi"]' or a comma list); default: the current one. */
export function configuredLanguages(cfg = loadChannelConfig()): string[] {
  const raw = env("CHANNEL_LANGUAGES");
  if (!raw) return [cfg.language];
  const list = raw.trim().startsWith("[")
    ? (JSON.parse(raw) as string[])
    : raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  for (const l of list) languageConfig(cfg, l);
  return list;
}

/** YouTube identity for a language: its own channel name/handle/tags, or the top-level defaults. */
export function channelIdentity(
  cfg: ChannelConfig,
  language: string,
): {
  name: string;
  handle: string;
  shortTags: string[];
  longTags: string[];
  label: string;
} {
  const lang = languageConfig(cfg, language);
  return {
    name: lang.channelName ?? cfg.name,
    handle: lang.handle ?? cfg.handle,
    shortTags: lang.shortTags ?? cfg.youtube.shortTags,
    longTags: lang.longTags ?? cfg.youtube.longTags,
    label: lang.label,
  };
}

export function loadBannedWords(): BannedWords {
  const raw = JSON.parse(readFileSync(path.join(CONFIG_DIR, "banned-words.json"), "utf8"));
  return BannedWordsSchema.parse(raw);
}
