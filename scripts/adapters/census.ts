// scripts/adapters/census.ts
// U.S. Census Bureau (ACS, CBP, and other surveys)
// Requires API key — register at: https://api.census.gov/data/key_signup.html
// No hard rate limit but key is required for reliable access
// apiDataId format: "acs/acs1:B01003_001E:*" (dataset:variable:geography)

import { RawPair } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { defaultLimiter } from "../utils/rateLimiter";

const CENSUS_API_KEY = process.env.CENSUS_API_KEY ?? "YOUR_CENSUS_API_KEY_HERE";
const BASE_URL = "https://api.census.gov/data";

export async function fetchCensus(
  apiDataId: string,   // format: "dataset:variable:geography" e.g. "acs/acs1:B01003_001E:us:1"
  since?: string
): Promise<RawPair[]> {
  return defaultLimiter.add(async () => {
    // Census data is released annually by survey year
    // We iterate across years since the Census API is year-scoped
    const [dataset, variable, geography] = apiDataId.split(":");

    const startYear = since
      ? new Date(since).getFullYear()
      : 2010;
    const endYear = new Date().getFullYear() - 1; // current year data not yet published

    const results: RawPair[] = [];

    for (let year = startYear; year <= endYear; year++) {
      try {
        const params = new URLSearchParams({
          get: variable,
          for: geography ?? "us:1",
          key: CENSUS_API_KEY,
        });

        const url = `${BASE_URL}/${year}/${dataset}?${params.toString()}`;
        const res = await fetchWithRetry(url);

        if (!res.ok) {
          // Some years may not have data — skip rather than throw
          console.warn(`Census: no data for year ${year}, dataset "${dataset}" (${res.status})`);
          continue;
        }

        const data = await res.json();
        // Census returns [[header, ...], [value, ...], ...]
        const headers: string[] = data[0];
        const varIndex = headers.indexOf(variable);

        if (varIndex === -1) {
          console.warn(`Census: variable "${variable}" not found in response for year ${year}`);
          continue;
        }

        for (let i = 1; i < data.length; i++) {
          const rawValue = data[i][varIndex];
          results.push({
            date: String(year),
            value: rawValue === null || rawValue === "-1" ? null : parseFloat(rawValue),
          });
        }
      } catch (err) {
        console.warn(`Census: error fetching year ${year}: ${err}`);
      }
    }

    return results;
  });
}
