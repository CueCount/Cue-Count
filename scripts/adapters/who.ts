// scripts/adapters/who.ts
// World Health Organization GHO (Global Health Observatory) — no API key required
// Uses the GHO OData API
// apiDataId format: "WHOSIS_000001:GLOBAL" (indicator:spatialDim)
// Browse indicators at: https://www.who.int/data/gho/data/indicators

import { RawPair } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { defaultLimiter } from "../utils/rateLimiter";

const BASE_URL = "https://ghoapi.azureedge.net/api";

export async function fetchWHO(
  apiDataId: string,   // format: "indicatorCode:spatialDim" e.g. "WHOSIS_000001:GLOBAL"
  since?: string
): Promise<RawPair[]> {
  return defaultLimiter.add(async () => {
    const [indicatorCode, spatialDim] = apiDataId.split(":");

    const filters: string[] = [];
    if (spatialDim) filters.push(`SpatialDim eq '${spatialDim}'`);
    if (since) {
      const sinceYear = new Date(since).getFullYear();
      filters.push(`TimeDim ge ${sinceYear}`);
    }

    const params = new URLSearchParams();
    if (filters.length > 0) {
      params.set("$filter", filters.join(" and "));
    }
    params.set("$select", "TimeDim,NumericValue");
    params.set("$orderby", "TimeDim asc");

    const url = `${BASE_URL}/${indicatorCode}?${params.toString()}`;
    const res = await fetchWithRetry(url);

    if (!res.ok) {
      throw new Error(`WHO error ${res.status} for "${apiDataId}"`);
    }

    const data = await res.json();

    if (!data.value) {
      throw new Error(`WHO returned no data for "${apiDataId}"`);
    }

    return data.value.map((row: { TimeDim: number; NumericValue: number | null }) => ({
      date: String(row.TimeDim),   // year as integer
      value: row.NumericValue,
    }));
  });
}
