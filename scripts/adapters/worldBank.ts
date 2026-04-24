// scripts/adapters/worldBank.ts
// World Bank Open Data — no API key required
// Paginated REST API, returns annual data for most indicators
// apiDataId format: "NY.GDP.MKTP.CD:US" (indicator:countryCode)
// Country code "WLD" = global aggregate

import { RawPair } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { defaultLimiter } from "../utils/rateLimiter";

const BASE_URL = "https://api.worldbank.org/v2";
const PER_PAGE = 500;

export async function fetchWorldBank(
  apiDataId: string,   // format: "indicator:countryCode" e.g. "NY.GDP.MKTP.CD:US"
  since?: string
): Promise<RawPair[]> {
  return defaultLimiter.add(async () => {
    const [indicator, countryCode] = apiDataId.split(":");
    const country = countryCode ?? "WLD";

    const startDate = since ? new Date(since).getFullYear() : 1960;
    const endDate = new Date().getFullYear();

    let page = 1;
    const results: RawPair[] = [];

    while (true) {
      const params = new URLSearchParams({
        format: "json",
        per_page: String(PER_PAGE),
        page: String(page),
        date: `${startDate}:${endDate}`,
      });

      const url = `${BASE_URL}/country/${country}/indicator/${indicator}?${params.toString()}`;
      const res = await fetchWithRetry(url);

      if (!res.ok) {
        throw new Error(`World Bank error ${res.status} for "${apiDataId}"`);
      }

      const json = await res.json();
      // World Bank returns [metadata, data[]] as a two-element array
      const [meta, data] = json;

      if (!data || !Array.isArray(data)) {
        throw new Error(`World Bank returned unexpected shape for "${apiDataId}"`);
      }

      for (const row of data) {
        results.push({
          date: String(row.date),   // e.g. "2024"
          value: row.value,          // already a number or null
        });
      }

      if (page >= meta.pages) break;
      page++;
    }

    // Sort ascending by date
    return results.sort((a, b) => a.date.localeCompare(b.date));
  });
}
