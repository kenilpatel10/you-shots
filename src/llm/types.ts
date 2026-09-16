export type LlmRequest = {
  system: string;
  user: string;
  /** JSON Schema describing the expected object (sent to providers that support it). */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
};

export type LlmResponse = { text: string; provider: string; model: string };

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  complete(req: LlmRequest): Promise<LlmResponse>;
}

export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    public readonly causes: { provider: string; error: string }[] = [],
  ) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}
