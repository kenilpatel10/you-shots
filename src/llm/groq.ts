import Groq from "groq-sdk";
import type { LlmProvider, LlmRequest, LlmResponse } from "./types";
import { HttpError } from "../lib/retry";

/**
 * Groq (free tier). JSON mode via response_format json_object; the schema is described in the
 * prompt because json_schema mode is only supported by some models.
 */
export function createGroq(apiKey: string, model: string): LlmProvider {
  const client = new Groq({ apiKey, maxRetries: 0 });
  return {
    name: "groq",
    model,
    async complete(req: LlmRequest): Promise<LlmResponse> {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
          response_format: { type: "json_object" },
          temperature: req.temperature ?? 0.8,
          max_completion_tokens: req.maxOutputTokens ?? 4096,
        });
        const text = completion.choices[0]?.message?.content;
        if (!text) throw new Error("Groq returned an empty response");
        return { text, provider: "groq", model };
      } catch (err) {
        const e = err as { status?: number; message?: string };
        if (typeof e.status === "number") throw new HttpError(e.status, `Groq ${e.status}: ${e.message ?? ""}`);
        throw err;
      }
    },
  };
}
