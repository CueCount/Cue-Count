// scripts/utils/normalize.ts
// Converts raw { date, value } pairs from any adapter into APIDataRow shape.
// This is the single function that every adapter feeds into before writing to Postgres.

import { randomUUID } from "crypto";
import { RawPair, APIDataRow } from "../types";
import { normalizeTimestamp } from "./normalizeTimestamp";

export function normalizeSeries(
  rawPairs: RawPair[],
  trendDataId: string,   // TrendRow.trendDataId — becomes APIDataRow.dataId
  frequency: string
): APIDataRow[] {
  return rawPairs
    .filter((p) => p.value !== null && p.value !== undefined && !isNaN(p.value as number))
    .map((p) => ({
      id: randomUUID(),
      dataId: trendDataId,
      timestamp: normalizeTimestamp(p.date, frequency),
      value: p.value as number,
    }));
}
