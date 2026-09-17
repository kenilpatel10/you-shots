// Copies the bundled fonts from their npm packages into public/fonts and writes the tiny
// silence.wav the lip-sync hook uses, so the repo needs no committed binaries.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const fontsDir = path.join(root, "public", "fonts");
mkdirSync(fontsDir, { recursive: true });

const sources = [
  ["@fontsource/fredoka", "fredoka-latin-{w}-normal.woff2"],
  ["@fontsource/baloo-2", "baloo-2-latin-{w}-normal.woff2"],
  ["@fontsource/baloo-2", "baloo-2-devanagari-{w}-normal.woff2"],
];
let copied = 0;
for (const [pkg, pattern] of sources) {
  let dir;
  try {
    dir = path.dirname(require.resolve(`${pkg}/package.json`));
  } catch {
    continue;
  }
  for (const w of [400, 600, 700]) {
    const name = pattern.replace("{w}", String(w));
    const src = path.join(dir, "files", name);
    const dst = path.join(fontsDir, name);
    if (existsSync(src) && !existsSync(dst)) {
      copyFileSync(src, dst);
      copied++;
    }
  }
  const lic = path.join(dir, "LICENSE");
  const licDst = path.join(fontsDir, `${pkg.split("/")[1].toUpperCase()}-LICENSE.txt`);
  if (existsSync(lic) && !existsSync(licDst)) copyFileSync(lic, licDst);
}

const silence = path.join(root, "public", "silence.wav");
if (!existsSync(silence)) {
  const sr = 24000;
  const n = 2400;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  writeFileSync(silence, b);
}
console.log(`postinstall: ${copied} font file(s) copied, silence.wav ready`);
