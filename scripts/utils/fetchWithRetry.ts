// scripts/utils/fetchWithRetry.ts
// Wraps fetch with exponential backoff and retry logic.
// Used by all adapters to handle transient failures and rate limit responses.

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = DEFAULT_MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Rate limited — wait 60s then retry
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
        console.warn(`[fetchWithRetry] Rate limited. Waiting ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }

      // Server error — retry with backoff
      if (response.status >= 500 && attempt < maxRetries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[fetchWithRetry] Server error ${response.status}. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[fetchWithRetry] Network error on attempt ${attempt + 1}. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error(`Failed after ${maxRetries} retries: ${url}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
