import { GoogleGenAI } from "@google/genai";
import type { LlmProvider, LlmRequest, LlmResponse } from "./types";
import { HttpError } from "../lib/retry";

/**
 * Gemini Developer API (free tier from Google AI Studio). Structured JSON output is requested with
 * responseMimeType + responseJsonSchema (verified against @google/genai 2.x typings).
 */
export function createGemini(apiKey: string, model: string): LlmProvider {
  const ai = new GoogleGenAI({ apiKey });
  return {
    name: "gemini",
    model,
    async complete(req: LlmRequest): Promise<LlmResponse> {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: req.user,
          config: {
            systemInstruction: req.system,
            responseMimeType: "application/json",
            ...(req.jsonSchema ? { responseJsonSchema: req.jsonSchema } : {}),
            temperature: req.temperature ?? 0.8,
            maxOutputTokens: req.maxOutputTokens ?? 4096,
          },
        });
        const text = response.text;
        if (!text) throw new Error("Gemini returned an empty response (possibly blocked by safety filters)");
        return { text, provider: "gemini", model };
      } catch (err) {
        const e = err as { status?: number; message?: string };
        if (typeof e.status === "number") throw new HttpError(e.status, `Gemini ${e.status}: ${e.message ?? ""}`);
        throw err;
      }
    },
  };
}
