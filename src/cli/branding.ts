/**
 * Render channel branding for every configured language: avatar (800×800), banner (2048×1152)
 * and the "about" text, ready to upload in YouTube Studio → Customisation.
 *   npm run branding            # out/branding/<lang>/{avatar.png,banner.png,about.txt}
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { channelIdentity, configuredLanguages, languageConfig, loadChannelConfig } from "../config";
import { ensureDir } from "../lib/fs";
import { createLogger } from "../lib/logger";
import { runCli } from "../lib/cli";
import { OUT_DIR } from "../lib/paths";
import { renderPng } from "../video/render";

const log = createLogger("branding");

async function main() {
  const cfg = loadChannelConfig();
  for (const language of configuredLanguages(cfg)) {
    const lang = languageConfig(cfg, language);
    const id = channelIdentity(cfg, language);
    const channel = { name: id.name, handle: id.handle, characterName: cfg.characterName, catchphrase: lang.catchphrase, askGrownUp: lang.askGrownUp, language, feelings: lang.feelings, sidekickName: lang.sidekickName, labels: lang.labels };
    const dir = path.join(OUT_DIR, "branding", language);
    await ensureDir(dir);
    const props = { channel, tagline: id.tagline };
    await renderPng({ compositionId: "Avatar", inputProps: props, outputPath: path.join(dir, "avatar.png") });
    await renderPng({ compositionId: "Banner", inputProps: props, outputPath: path.join(dir, "banner.png") });
    await fs.writeFile(path.join(dir, "about.txt"), `${id.name}\n${id.tagline}\n\n${id.about}\n`);
    log.info(`${language}: ${path.relative(process.cwd(), dir)}/avatar.png, banner.png, about.txt`);
  }
}

runCli("branding", main, () => {});
