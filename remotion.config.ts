import { Config } from "@remotion/cli/config";

// Remotion CLI configuration (used by `npm run studio` and `npx remotion render`).
// The programmatic renderer in src/video/render.ts sets its own options.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setPublicDir("public");
Config.setEntryPoint("remotion/index.ts");
