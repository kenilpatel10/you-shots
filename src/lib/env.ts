import "dotenv/config";

/** Read an env var, trimming whitespace; returns undefined for empty values. */
export function env(name: string): string | undefined {
  const v = process.env[name];
  if (v === undefined) return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function requireEnv(name: string, hint?: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing environment variable ${name}${hint ? ` — ${hint}` : ""}`);
  return v;
}

export function envBool(name: string, def = false): boolean {
  const v = env(name);
  if (v === undefined) return def;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export const isCI = () => envBool("GITHUB_ACTIONS") || envBool("CI");
