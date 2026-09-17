import { en, type PromptContext, type PromptSet } from "./en";
import { hi } from "./hi";
import { currentLanguage, loadBannedWords, loadChannelConfig } from "../../config";

/** Add a language by exporting a PromptSet and registering it here (see docs/HINDI.md). */
const registry: Record<string, PromptSet> = { en, hi };

export function getPrompts(language = loadChannelConfig().language): PromptSet {
  const p = registry[language];
  if (!p) throw new Error(`No prompts for language "${language}". Add src/content/prompts/${language}.ts and register it.`);
  return p;
}

export function promptContext(): PromptContext {
  const cfg = loadChannelConfig();
  const lang = currentLanguage(cfg);
  const banned = loadBannedWords();
  return {
    characterName: cfg.characterName,
    channelName: cfg.name,
    catchphrase: lang.catchphrase,
    askGrownUp: lang.askGrownUp,
    bannedWords: banned.banned.filter((w) => !w.includes(" ")).slice(0, 80),
    hazardWords: banned.bannedInExperiment,
  };
}

export type { PromptContext, PromptSet };
