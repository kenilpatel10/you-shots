import { en, type PromptContext, type PromptSet } from "./en";
import { hi } from "./hi";
import { enTech } from "./enTech";
import { channelIdentity, currentLanguage, loadBannedWords, loadChannelConfig } from "../../config";
import { totalWordsFor, wordLimitsFor } from "../validate";

/** Add a language by exporting a PromptSet and registering it here (see docs/HINDI.md). */
const registry: Record<string, PromptSet> = { en, hi, "en:tech": enTech };

export function getPrompts(language = loadChannelConfig().language, promptSet = loadChannelConfig().promptSet): PromptSet {
  const p = promptSet === "explainer" ? registry[language] : registry[`${language}:${promptSet}`];
  if (!p) throw new Error(`No "${promptSet}" prompts for language "${language}". Add src/content/prompts/<file>.ts and register it as "${language}:${promptSet}".`);
  return p;
}

export function promptContext(): PromptContext {
  const cfg = loadChannelConfig();
  const lang = currentLanguage(cfg);
  const banned = loadBannedWords();
  const identity = channelIdentity(cfg, cfg.language);
  return {
    characterName: cfg.characterName,
    channelName: identity.name,
    characterBio: cfg.characterBio,
    characterVoice: cfg.characterVoice,
    audience: cfg.audience,
    audienceDescription: cfg.audienceDescription,
    experimentGuide: cfg.experimentGuide,
    experimentLabel: lang.labels.experiment ?? "Try this",
    extraRules: cfg.extraRules,
    language: cfg.language,
    gags: cfg.gags,
    catchphrase: lang.catchphrase,
    askGrownUp: lang.askGrownUp,
    bannedWords: banned.banned.filter((w) => !w.includes(" ")).slice(0, 80),
    hazardWords: banned.bannedInExperiment,
    wordLimits: wordLimitsFor(lang.voice.wordsPerSecond),
    totalWords: totalWordsFor(lang.voice.wordsPerSecond),
  };
}

export type { PromptContext, PromptSet };
