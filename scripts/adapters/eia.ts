// scripts/adapters/eia.ts
// U.S. Energy Information Administration
// Requires API key — register at: https://www.eia.gov/opendata/register.php
// No stated hard rate limit
// apiDataId format: "route:seriesId:frequency" e.g. "petroleum/pri/spt:RWTC:M"

import { RawPair } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { defaultLimiter } from "../utils/rateLimiter";

const EIA_API_KEY = process.env.EIA_API_KEY ?? "YOUR_EIA_API_KEY_HERE";
const BASE_URL = "https://api.eia.gov/v2";

export async function fetchEIA(
  apiDataId: string,
  since?: string
): Promise<RawPair[]> {
  return defaultLimiter.add(async () => {
    const [route, seriesId, frequency] = apiDataId.split(":");

    // EIA v2 uses bracket notation in query params which can't be expressed
    // as a plain object — build them individually with .append()
    const params = new URLSearchParams();
    params.set("api_key", EIA_API_KEY);
    params.set("frequency", eiaFrequency(frequency));
    params.append("data[]", "value");
    params.append(`facets[series][]`, seriesId);
    params.append("sort[0][column]", "period");
    params.append("sort[0][direction]", "asc");
    params.set("length", "5000");

    if (since) {
      params.set("start", since.slice(0, 7)); // YYYY-MM
    }

    const url = `${BASE_URL}/${route}/data/?${params.toString()}`;
    const res = await fetchWithRetry(url);

    if (!res.ok) {
      throw new Error(`EIA error ${res.status} for "${apiDataId}"`);
    }

    const json = await res.json();
    const rows = json?.response?.data;

    if (!rows) {
      throw new Error(`EIA returned no data for "${apiDataId}"`);
    }

    return rows.map((row: { period: string; value: string | number }) => ({
      date: String(row.period),
      value: row.value === null ? null : Number(row.value),
    }));
  });
}

function eiaFrequency(code: string): string {
  const map: Record<string, string> = {
    M: "monthly", Q: "quarterly", A: "annual", W: "weekly", D: "daily",
  };
  return map[code?.toUpperCase()] ?? "monthly";
}