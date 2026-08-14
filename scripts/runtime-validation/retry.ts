export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

export interface RetryResult<T> {
  value: T;
  attempts: number;
}

export function isTransientRuntimeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|econnreset|connection refused|net::err|network|503|502|504/i.test(message);
}

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const attempts = Math.max(1, Math.floor(options.attempts ?? 2));
  const sleep = options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return { value: await operation(attempt), attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransientRuntimeError(error)) throw error;
      await sleep(Math.max(0, options.delayMs ?? 250));
    }
  }
  throw lastError;
}
