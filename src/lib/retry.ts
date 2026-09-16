export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Return true if the error is worth retrying (default: HTTP 429/5xx or network errors). */
  shouldRetry?: (err: unknown) => boolean;
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
};

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function getStatus(err: unknown): number | undefined {
  if (err instanceof HttpError) return err.status;
  if (typeof err === "object" && err !== null) {
    const e = err as { status?: unknown; code?: unknown; response?: { status?: unknown } };
    if (typeof e.status === "number") return e.status;
    if (typeof e.response?.status === "number") return e.response.status;
    if (typeof e.code === "number") return e.code;
  }
  return undefined;
}

export function isRetryable(err: unknown): boolean {
  const status = getStatus(err);
  if (status !== undefined) return status === 429 || status === 408 || (status >= 500 && status < 600);
  const msg = err instanceof Error ? err.message : String(err);
  return /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|fetch failed|socket hang up|network/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function retry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const base = opts.baseDelayMs ?? 1500;
  const max = opts.maxDelayMs ?? 30_000;
  const shouldRetry = opts.shouldRetry ?? isRetryable;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !shouldRetry(err)) throw err;
      const jitter = Math.random() * 0.3 + 0.85;
      const delay = Math.min(max, base * 2 ** attempt * jitter);
      opts.onRetry?.(err, attempt + 1, delay);
      await sleep(delay);
    }
  }
  throw lastErr;
}
