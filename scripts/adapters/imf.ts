// scripts/adapters/imf.ts
// International Monetary Fund — no API key required
// Uses the IMF JSON RESTful Web Service (RJSTAT format)
// apiDataId format: "IFS:PCPI_IX:US" (database:indicator:countryCode)
// Common databases: IFS (International Financial Statistics), WEO (World Economic Outlook)

import { RawPair } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { defaultLimiter } from "../utils/rateLimiter";

const BASE_URL = "https://www.imf.org/external/datamapper/api/v1";

export async function fetchIMF(
  apiDataId: string,   // format: "indicator:countryCode" e.g. "NGDP_RPCH:US"
  since?: string
): Promise<RawPair[]> {
  return defaultLimiter.add(async () => {
    // IMF DataMapper API — simpler endpoint for WEO-style indicators
    const [indicator, countryCode] = apiDataId.split(":");
    const country = countryCode ?? "USA";

    const url = `${BASE_URL}/${indicator}/${country}`;
    const res = await fetchWithRetry(url);

    if (!res.ok) {
      throw new Error(`IMF error ${res.status} for "${apiDataId}"`);
    }

    const data = await res.json();
    const values = data?.values?.[indicator]?.[country];

    if (!values) {
      throw new Error(`IMF returned no values for "${apiDataId}"`);
    }

    // IMF DataMapper returns { "2020": 2.3, "2021": 5.9, ... }
    const sinceYear = since ? new Date(since).getFullYear() : 0;

    return Object.entries(values)
      .filter(([year]) => parseInt(year, 10) >= sinceYear)
      .map(([year, value]) => ({
        date: year,
        value: value as number | null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  });
}
