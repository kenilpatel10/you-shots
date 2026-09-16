import type { ZodType } from "zod";

export class JsonParseError extends Error {}

/**
 * Defensive JSON extraction: strips markdown fences and leading/trailing prose, then parses the
 * outermost object. Models occasionally wrap JSON even when asked not to.
 */
export function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (fence?.[1]) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    // fall through
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new JsonParseError("No JSON object found in model output");
  const slice = t.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (err) {
    // Common model slip: trailing commas.
    try {
      return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      throw new JsonParseError(`Invalid JSON: ${(err as Error).message}`);
    }
  }
}

export function parseWith<T>(schema: ZodType<T, unknown>, text: string): T {
  const raw = extractJson(text);
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new JsonParseError(`Schema validation failed: ${issues}`);
  }
  return result.data;
}
