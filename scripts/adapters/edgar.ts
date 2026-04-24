// scripts/adapters/edgar.ts
// SEC EDGAR — bulk file download, no API key required
// Register a User-Agent string (your email) — SEC requires this in request headers
// This adapter downloads the company facts JSON for a specific CIK (company ID)
// and extracts a named financial metric as a time series
// apiDataId format: "CIK0000320193:us-gaap:Revenues:USD:annual"
//                    (cik:taxonomy:concept:unit:period)
// Look up CIK numbers at: https://www.sec.gov/cgi-bin/browse-edgar

import { RawPair } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { defaultLimiter } from "../utils/rateLimiter";

// Required by SEC — use your actual email or company name
const EDGAR_USER_AGENT = process.env.EDGAR_USER_AGENT ?? "YourAppName your-email@example.com";
const BASE_URL = "https://data.sec.gov/api/xbrl/companyfacts";

export async function fetchEDGAR(
  apiDataId: string,   // format: "CIK:taxonomy:concept:unit:period"
  // e.g. "CIK0000320193:us-gaap:Revenues:USD:annual"
  since?: string
): Promise<RawPair[]> {
  return defaultLimiter.add(async () => {
    const [cik, taxonomy, concept, unit, period] = apiDataId.split(":");

    const url = `${BASE_URL}/${cik}.json`;
    const res = await fetchWithRetry(url, {
      headers: {
        "User-Agent": EDGAR_USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`EDGAR error ${res.status} for CIK "${cik}"`);
    }

    const data = await res.json();
    const facts = data?.facts?.[taxonomy]?.[concept]?.units?.[unit];

    if (!facts) {
      throw new Error(
        `EDGAR: no data found for ${taxonomy}:${concept}:${unit} in CIK ${cik}`
      );
    }

    const sinceDate = since ?? "1990-01-01";

    return (facts as EDGARFact[])
      .filter((f) => {
        // Filter by period type (annual = 10-K, quarterly = 10-Q)
        if (period === "annual" && f.form !== "10-K") return false;
        if (period === "quarterly" && f.form !== "10-Q") return false;
        // Filter by date
        if (f.end < sinceDate) return false;
        return true;
      })
      .map((f) => ({
        date: f.end,   // YYYY-MM-DD end date of the reporting period
        value: f.val,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  });
}

type EDGARFact = {
  end: string;     // "2024-09-28"
  val: number;     // the actual value
  form: string;    // "10-K", "10-Q", etc.
  filed: string;   // filing date
  accn: string;    // accession number
};
