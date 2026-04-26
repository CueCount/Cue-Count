// scripts/adapters/fred.ts
// Federal Reserve Economic Data (FRED)
// Requires API key — register at: https://fred.stlouisfed.org (My Account → API Keys)
// Rate limit: 120 requests/minute
// Series ID format: e.g. "GDP", "UNRATE", "FEDFUNDS"

import { RawPair } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { fredLimiter } from "../utils/rateLimiter";

const FRED_API_KEY = process.env.FRED_API_KEY ?? "YOUR_FRED_API_KEY_HERE";
const BASE_URL = "https://api.stlouisfed.org/fred/series/observations";

export async function fetchFRED(
  seriesId: string,
  since?: string   // ISO date string — only fetch observations after this date
): Promise<RawPair[]> {
  return fredLimiter.add(async () => {
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: FRED_API_KEY,
      file_type: "json",
      sort_order: "asc",
    });

    if (since) {
      params.set("observation_start", since.slice(0, 10)); // YYYY-MM-DD
    }

    const url = `${BASE_URL}?${params.toString()}`;
    const res = await fetchWithRetry(url);

    if (!res.ok) {
      throw new Error(`FRED error ${res.status} for series "${seriesId}"`);
    }

    const data = await res.json();

    if (!data.observations) {
      throw new Error(`FRED returned no observations for series "${seriesId}": ${JSON.stringify(data)}`);
    }

    return data.observations.map((o: { date: string; value: string }) => ({
      date: o.date,
      value: o.value === "." ? null : parseFloat(o.value),
      // FRED uses "." to represent missing values
    }));
  });
}
