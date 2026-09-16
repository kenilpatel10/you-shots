type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const current: Level = (process.env.LOG_LEVEL as Level) ?? "info";

const SECRET_KEYS = ["GEMINI_API_KEY", "GROQ_API_KEY", "TELEGRAM_BOT_TOKEN", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN", "GITHUB_TOKEN"];

/** Replace any secret values that leak into a log line. Repo is public, logs are public. */
export function redact(text: string): string {
  let out = text;
  for (const key of SECRET_KEYS) {
    const v = process.env[key];
    if (v && v.length >= 8) out = out.split(v).join(`<${key}>`);
  }
  // Telegram bot tokens also appear inside API URLs.
  out = out.replace(/bot\d{6,}:[A-Za-z0-9_-]{20,}/g, "bot<TELEGRAM_BOT_TOKEN>");
  return out;
}

function fmt(level: Level, scope: string, msg: string, extra?: unknown): string {
  const ts = new Date().toISOString();
  const tail = extra === undefined ? "" : " " + redact(typeof extra === "string" ? extra : JSON.stringify(extra));
  return `${ts} ${level.toUpperCase().padEnd(5)} [${scope}] ${redact(msg)}${tail}`;
}

export function createLogger(scope: string) {
  const log = (level: Level, msg: string, extra?: unknown) => {
    if (LEVELS[level] < LEVELS[current]) return;
    const line = fmt(level, scope, msg, extra);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };
  return {
    debug: (m: string, e?: unknown) => log("debug", m, e),
    info: (m: string, e?: unknown) => log("info", m, e),
    warn: (m: string, e?: unknown) => log("warn", m, e),
    error: (m: string, e?: unknown) => log("error", m, e),
  };
}

export type Logger = ReturnType<typeof createLogger>;
