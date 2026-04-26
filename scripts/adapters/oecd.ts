// scripts/adapters/oecd.ts
// OECD — no API key required
// Uses OECD SDMX-JSON REST API
// apiDataId format: "dataset:filter" e.g. "QNA:USA.B1_GE.VOBARSA.Q"
// Filter syntax: country.subject.measure.frequency

import { RawPair } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { defaultLimiter } from "../utils/rateLimiter";

const BASE_URL = "https://stats.oecd.org/SDMX-JSON/data";

export async function fetchOECD(
  apiDataId: string,   // format: "dataset:filter" e.g. "QNA:USA.B1_GE.VOBARSA.Q"
  since?: string
): Promise<RawPair[]> {
  return defaultLimiter.add(async () => {
    const [dataset, filter] = apiDataId.split(":");

    const params = new URLSearchParams({
      contentType: "csv", // CSV is easier to parse than SDMX-JSON
    });

    if (since) {
      params.set("startTime", since.slice(0, 7)); // YYYY-MM or YYYY-Q
    }

    const url = `${BASE_URL}/${dataset}/${filter}/all?${params.toString()}`;
    const res = await fetchWithRetry(url);

    if (!res.ok) {
      throw new Error(`OECD error ${res.status} for "${apiDataId}"`);
    }

    const text = await res.text();
    return parseOECDCsv(text);
  });
}

// Parses the OECD CSV response
// Columns include TIME_PERIOD and Value (among others)
function parseOECDCsv(csv: string): RawPair[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const timeIndex = headers.findIndex((h) => h === "TIME_PERIOD");
  const valueIndex = headers.findIndex((h) => h === "Value" || h === "OBS_VALUE");

  if (timeIndex === -1 || valueIndex === -1) {
    throw new Error("OECD CSV missing expected TIME_PERIOD or Value columns");
  }

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      return {
        date: cols[timeIndex],
        value: cols[valueIndex] === "" ? null : parseFloat(cols[valueIndex]),
      };
    })
    .filter((p) => p.date);
}
