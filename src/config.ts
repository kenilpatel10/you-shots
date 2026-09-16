import { z } from "zod";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONFIG_DIR } from "./lib/paths";
import { env } from "./lib/env";

const LanguageConfig = z.object({
  label: z.string(),
  catchphrase: z.string().min(3),
  voice: z.object({
    engine: z.literal("kokoro"),
    voiceId: z.string(),
    speed: z.number().min(0.7).max(1.4),
  }),
  whisper: z.object({
    model: z.enum(["tiny", "tiny.en", "base", "base.en", "small", "small.en", "medium", "medium.en", "large-v3-turbo"]),
    language: z.string(),
  }),
  askGrownUp: z.string(),
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
  requiredWhenHandling: z.object({
    triggers: z.array(z.string()),
    required: z.array(z.string()),
  }),
  kitchenAllowList: z.array(z.string()),
});
export type BannedWords = z.infer<typeof BannedWordsSchema>;

let cached: ChannelConfig | null = null;

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

export function loadBannedWords(): BannedWords {
  const raw = JSON.parse(readFileSync(path.join(CONFIG_DIR, "banned-words.json"), "utf8"));
  return BannedWordsSchema.parse(raw);
}
