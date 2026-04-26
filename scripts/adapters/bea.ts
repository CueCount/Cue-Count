// scripts/adapters/bea.ts
// Bureau of Economic Analysis
// Requires API key — register at: https://apps.bea.gov/API/signup/index.cfm
// No stated hard rate limit — be reasonable, use default limiter
// apiDataId format: "NIPA:T10101:A" (dataset:tableName:frequency)
// Common datasets: NIPA (GDP), Regional, International

import { RawPair } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { defaultLimiter } from "../utils/rateLimiter";

const BEA_API_KEY = process.env.BEA_API_KEY ?? "YOUR_BEA_API_KEY_HERE";
const BASE_URL = "https://apps.bea.gov/api/data/";

export async function fetchBEA(
  apiDataId: string,   // format: "NIPA:TableName:Frequency:LineNumber"
  since?: string
): Promise<RawPair[]> {
  return defaultLimiter.add(async () => {
    // Parse the composite apiDataId
    // Example: "NIPA:T10101:Q:1" → dataset=NIPA, table=T10101, freq=Q, line=1
    const [datasetName, tableName, frequency, lineNumber] = apiDataId.split(":");

    const startYear = since
      ? new Date(since).getFullYear()
      : 1990;

    const params = new URLSearchParams({
      UserID: BEA_API_KEY,
      method: "GetData",
      DataSetName: datasetName,
      TableName: tableName,
      Frequency: frequency,
      Year: `${startYear},${new Date().getFullYear()}`,
      ResultFormat: "JSON",
    });

    const url = `${BASE_URL}?${params.toString()}`;
    const res = await fetchWithRetry(url);

    if (!res.ok) {
      throw new Error(`BEA error ${res.status} for "${apiDataId}"`);
    }

    const data = await res.json();
    const results = data?.BEAAPI?.Results?.Data;

    if (!results) {
      throw new Error(`BEA returned no data for "${apiDataId}": ${JSON.stringify(data?.BEAAPI?.Results)}`);
    }

    // Filter to the requested line number if specified
    const filtered = lineNumber
      ? results.filter((row: { LineNumber: string }) => row.LineNumber === lineNumber)
      : results;

    return filtered.map((row: { TimePeriod: string; DataValue: string }) => ({
      date: row.TimePeriod,   // e.g. "2024Q1" or "2024"
      value: row.DataValue === "" ? null : parseFloat(row.DataValue.replace(/,/g, "")),
    }));
  });
}
