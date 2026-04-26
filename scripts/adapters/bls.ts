// scripts/adapters/bls.ts
// Bureau of Labor Statistics
// Requires API key (v2) — register at: https://data.bls.gov/registrationEngine
// Rate limit: 2,000 requests/day (registered), 500/day unregistered
// Series ID format: e.g. "LNS14000000" (unemployment), "CUUR0000SA0" (CPI)
// Note: BLS v2 allows up to 50 series per request — batch where possible

import { RawPair } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { blsLimiter } from "../utils/rateLimiter";

const BLS_API_KEY = process.env.BLS_API_KEY;
const BASE_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

type BLSDataPoint = {
  year: string;
  period: string;    // "M01"–"M12" for monthly, "Q01"–"Q04" for quarterly, "A01" annual
  value: string;
  footnotes: { code?: string; text?: string }[];
};

export async function fetchBLS(
  seriesId: string,
  since?: string
): Promise<RawPair[]> {
  return blsLimiter.add(async () => {
    const startYear = since
      ? new Date(since).getFullYear()
      : new Date().getFullYear() - 20; // BLS v2 allows up to 20 years

    const endYear = new Date().getFullYear();

    const body = JSON.stringify({
      seriesid: [seriesId],
      startyear: String(startYear),
      endyear: String(endYear),
      registrationkey: BLS_API_KEY,
    });

    const res = await fetchWithRetry(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok) {
      throw new Error(`BLS error ${res.status} for series "${seriesId}"`);
    }

    const data = await res.json();

    if (data.status !== "REQUEST_SUCCEEDED") {
      throw new Error(`BLS request failed for "${seriesId}": ${data.message?.join(", ")}`);
    }

    const series = data.Results?.series?.[0];
    if (!series?.data?.length) {
      throw new Error(`BLS returned no data for series "${seriesId}"`);
    }

    return (series.data as BLSDataPoint[])
      .map((point) => ({
        date: blsPeriodToDate(point.year, point.period),
        value: point.value === "-" ? null : parseFloat(point.value),
      }))
      .sort((a, b) => a.date.localeCompare(b.date)); // BLS returns newest first
  });
}

// Converts BLS year + period into a normalized date string
// Monthly: year="2024", period="M03" → "2024-03"
// Quarterly: year="2024", period="Q01" → "2024Q1"
// Annual: year="2024", period="A01" → "2024"
function blsPeriodToDate(year: string, period: string): string {
  if (period.startsWith("M")) {
    const month = period.slice(1).padStart(2, "0");
    return `${year}-${month}`;
  }
  if (period.startsWith("Q")) {
    const quarter = period.slice(1);
    return `${year}Q${quarter}`;
  }
  if (period.startsWith("A")) {
    return year;
  }
  return year;
}
