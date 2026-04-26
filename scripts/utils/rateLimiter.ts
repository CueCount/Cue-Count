// scripts/utils/rateLimiter.ts
// Simple queue-based rate limiter.
// BLS is the main concern — 2,000 requests/day registered, so batch carefully.
// Also useful for adding a small delay between rapid sequential requests.

export class RateLimiter {
  private queue: (() => Promise<void>)[] = [];
  private running = false;
  private delayMs: number;

  constructor(delayMs = 500) {
    // delayMs = minimum gap between requests
    // 500ms default = safe for most sources
    // Use 1000ms for BLS to stay well under daily caps
    this.delayMs = delayMs;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        }
      });
      this.run();
    });
  }

  private async run() {
    if (this.running) return;
    this.running = true;

    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) await next();
      if (this.queue.length > 0) {
        await sleep(this.delayMs);
      }
    }

    this.running = false;
  }
}

// Pre-configured limiters for sources with known rate limits
export const blsLimiter = new RateLimiter(1000);   // conservative for 2k/day cap
export const fredLimiter = new RateLimiter(500);    // 120/min = fine at 500ms gaps
export const defaultLimiter = new RateLimiter(250); // everything else

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
