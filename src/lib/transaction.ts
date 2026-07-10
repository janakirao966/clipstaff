/**
 * A simple sequential Mutex lock to serialize asynchronous database write operations.
 */
export class Mutex {
  private queue: Promise<any> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = this.queue;
    this.queue = current.then(() => pending).catch(() => pending);
    await current;
    return () => {
      release();
    };
  }
}

export const dbWriteMutex = new Mutex();

/**
 * Retries a database operation with exponential backoff on transient errors.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  backoffMs = 100
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err: any) {
      attempt++;
      // Determine if error is transient (e.g. timeout, inactive transaction, abort)
      const isTransient = err && (
        err.name === 'TransactionInactiveError' ||
        err.name === 'ReadOnlyError' ||
        err.name === 'UnknownError' ||
        err.name === 'AbortError' ||
        err.message?.includes('timeout') ||
        err.message?.includes('locked') ||
        err.message?.includes('transient')
      );
      
      if (attempt >= maxRetries || !isTransient) {
        throw err;
      }
      
      const delay = backoffMs * Math.pow(2, attempt - 1);
      console.warn(`[ClipStaff DB Retry] Attempt ${attempt} failed with: ${err.name || err.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
