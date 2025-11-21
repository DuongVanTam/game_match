/**
 * Utility to wrap async operations with a timeout
 * Prevents middleware timeout errors when external services are slow
 */

export class TimeoutError extends Error {
  constructor(
    message: string,
    public timeout: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param errorMessage Optional error message
 * @returns The promise result or throws TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new TimeoutError(
              errorMessage || `Operation timed out after ${timeoutMs}ms`,
              timeoutMs
            )
          ),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Wraps a promise with a timeout, but returns null instead of throwing on timeout
 * Useful for middleware where we want to gracefully degrade
 */
export async function withTimeoutOrNull<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | null> {
  try {
    return await withTimeout(promise, timeoutMs);
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.warn(`Timeout after ${timeoutMs}ms, returning null`);
      return null;
    }
    throw error;
  }
}
