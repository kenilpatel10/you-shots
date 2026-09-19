import { z } from "zod";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { CONFIG_DIR, ROOT } from "./lib/paths";
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
  /** Appended to every video description (YouTube shows the first three above the title). */
  hashtags: z.array(z.string()).default([]),
  /** One line under the channel name on the banner and in the channel "about" text. */
  tagline: z.string().default(""),
  /** Channel "about" text (npm run branding writes it next to the avatar and banner). */
  about: z.string().default(""),
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

/** Colours and logo a persona (or a client brand kit) can override in the videos. */
export const BrandSchema = z.object({
  /** Character body colour (Bolt is #3C7DFF). */
  primary: z.string().optional(),
  /** Label / accent colour (default #FFB627). */
  accent: z.string().optional(),
  /** Path under public/ of a logo shown in the corner, e.g. "brands/sharma/logo.png". */
  logo: z.string().optional(),
});

export const ChannelConfigSchema = z.object({
  /** Persona id: "bolt-pip" is config/channel.json, others live in config/personas/<id>.json. */
  persona: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .default("bolt-pip"),
  /** kids → made-for-kids upload, grown-up rules, kids word list. general → students/parents/anyone, full ads. */
  audience: z.enum(["kids", "general"]).default("kids"),
  /** Who the character is, for the writer ("a small, friendly, round robot who …"). */
  characterBio: z.string().default("a small, friendly, round robot who is curious, kind, gentle and a little clumsy, never sarcastic"),
  /** How the character speaks. */
  characterVoice: z.string().default("in first person, warmly, like a curious six-year-old who just learned something wonderful"),
  /** Who watches; drives vocabulary and the reviewer's age-fit check. */
  audienceDescription: z.string().default("children aged 5–9"),
  /** What section 4 ("experiment") is on this channel; the on-screen label comes from languages.<lang>.labels.experiment. */
  experimentGuide: z.string().default('one safe thing to try or notice at home. Start with "Try this!"'),
  /** Extra writer rules for this persona (one per line). */
  extraRules: z.array(z.string()).default([]),
  /** Files this persona reads (relative to the repo root). */
  topicsFile: z.string().default("data/topics.json"),
  fallbackDir: z.string().default("data/fallback-scripts"),
  bannedWordsFile: z.string().default("config/banned-words.json"),
  brand: BrandSchema.default({}),
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

export const DEFAULT_PERSONA = "bolt-pip";

/** "persona/lang" pair from CHANNEL, else PERSONA + CHANNEL_LANGUAGE, else defaults. */
export function selectedChannel(): { persona: string; language?: string } {
  const channel = env("CHANNEL");
  if (channel) {
    // "persona/lang", or a bare language for the default persona (CHANNEL_LANGUAGES entries).
    if (!channel.includes("/")) return { persona: DEFAULT_PERSONA, language: channel };
    const [persona, language] = channel.split("/");
    if (!persona) throw new Error(`CHANNEL="${channel}" must look like persona/lang, e.g. bolt-pip/hi`);
    return { persona, language: language || env("CHANNEL_LANGUAGE") };
  }
  return { persona: env("PERSONA") ?? DEFAULT_PERSONA, language: env("CHANNEL_LANGUAGE") };
}

export function personaFile(persona: string): string {
  return persona === DEFAULT_PERSONA ? path.join(CONFIG_DIR, "channel.json") : path.join(CONFIG_DIR, "personas", `${persona}.json`);
}

/** Every persona that has a config file. */
export function listPersonas(): string[] {
  const dir = path.join(CONFIG_DIR, "personas");
  const extra = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(/\.json$/, ""))
    : [];
  return [DEFAULT_PERSONA, ...extra.sort()];
}

export function loadPersonaConfig(persona: string, language?: string): ChannelConfig {
  const file = personaFile(persona);
  if (!existsSync(file)) throw new Error(`No persona "${persona}": expected ${path.relative(ROOT, file)} (see docs/PERSONAS.md)`);
  const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  const cfg = ChannelConfigSchema.parse({ ...raw, persona });
  const lang = language ?? cfg.language;
  if (!cfg.languages[lang]) {
    throw new Error(`Language "${lang}" has no entry in ${path.relative(ROOT, file)} → languages.`);
  }
  return { ...cfg, language: lang };
}

export function loadChannelConfig(): ChannelConfig {
  if (cached) return cached;
  const sel = selectedChannel();
  cached = loadPersonaConfig(sel.persona, sel.language);
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
export function channelIdentity(cfg: ChannelConfig, language: string): { name: string; handle: string; shortTags: string[]; longTags: string[]; label: string; hashtags: string[]; tagline: string; about: string } {
  const lang = languageConfig(cfg, language);
  return {
    name: lang.channelName ?? cfg.name,
    handle: lang.handle ?? cfg.handle,
    shortTags: lang.shortTags ?? cfg.youtube.shortTags,
    longTags: lang.longTags ?? cfg.youtube.longTags,
    label: lang.label,
    hashtags: lang.hashtags,
    tagline: lang.tagline,
    about: lang.about,
  };
}

/** Video description as uploaded: the script's text, then hashtags and the channel name. */
export function finishDescription(description: string, identity: { name: string; hashtags: string[] }): string {
  const tail = [identity.hashtags.join(" "), identity.name].filter(Boolean).join("\n");
  return `${description.trim()}\n\n${tail}`.trim();
}

export function loadBannedWords(cfg = loadChannelConfig()): BannedWords {
  const raw = JSON.parse(readFileSync(path.resolve(ROOT, cfg.bannedWordsFile), "utf8"));
  return BannedWordsSchema.parse(raw);
}

/** "persona/lang": the unit that owns a YouTube channel, a topic history and an upload slot per day. */
export function channelKey(persona: string, language: string): string {
  return `${persona}/${language}`;
}

/** All channels the pipeline runs: CHANNELS='["bolt-pip/en","ncert-science/hi"]' or CHANNEL_LANGUAGES for the default persona. */
export function configuredChannels(): { persona: string; language: string }[] {
  const raw = env("CHANNELS");
  if (raw) {
    const list = raw.trim().startsWith("[")
      ? (JSON.parse(raw) as string[])
      : raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    return list.map((c) => {
      const [persona, language] = c.includes("/") ? c.split("/") : [DEFAULT_PERSONA, c];
      if (!persona || !language) throw new Error(`CHANNELS entry "${c}" must be persona/lang`);
      loadPersonaConfig(persona, language); // validates
      return { persona, language };
    });
  }
  const cfg = loadChannelConfig();
  return configuredLanguages(cfg).map((language) => ({ persona: cfg.persona, language }));
}
