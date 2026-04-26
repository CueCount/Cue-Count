// scripts/dispatch.ts
// Routes a TrendRow to the correct adapter based on trend.source.
// This is the only file that needs to change when a new adapter is added.
// Returns raw { date, value } pairs — normalization happens in the caller.

import { RawPair, TrendRow } from "./types";
import { fetchFRED } from "./adapters/fred";
import { fetchBLS } from "./adapters/bls";
import { fetchBEA } from "./adapters/bea";
import { fetchEIA } from "./adapters/eia";
import { fetchCensus } from "./adapters/census";
import { fetchWorldBank } from "./adapters/worldBank";
import { fetchIMF } from "./adapters/imf";
import { fetchOECD } from "./adapters/oecd";
import { fetchWHO } from "./adapters/who";
import { fetchOpenAlex } from "./adapters/openAlex";
import { fetchEDGAR } from "./adapters/edgar";

// Maps the trend.source string (as stored in your Trend table) to the adapter function.
// The key must exactly match what is stored in TrendRow.source.
const ADAPTERS: Record<
  string,
  (apiDataId: string, since?: string) => Promise<RawPair[]>
> = {
  // Tier 1 — REST + API key
  "FRED": fetchFRED,
  "BLS": fetchBLS,
  "BEA": fetchBEA,
  "EIA": fetchEIA,
  "Census": fetchCensus,

  // Tier 2 — REST, no key
  "World Bank": fetchWorldBank,
  "IMF": fetchIMF,
  "OECD": fetchOECD,
  "WHO": fetchWHO,
  "OpenAlex": fetchOpenAlex,

  // Tier 3 — Bulk / special
  "SEC EDGAR": fetchEDGAR,

  // Add more here as new adapters are built:
  // "NSF": fetchNSF,
  // "USPTO": fetchUSPTO,
  // "Eurostat": fetchEurostat,
  // "UN Data": fetchUN,
};

export async function dispatch(trend: TrendRow, since?: string): Promise<RawPair[]> {
  if (!trend.apiDataId) {
    throw new Error(
      `Trend "${trend.name}" (${trend.trendDataId}) has no apiDataId — cannot fetch from external source`
    );
  }

  const adapter = ADAPTERS[trend.source];

  if (!adapter) {
    throw new Error(
      `No adapter registered for source "${trend.source}" (trend: "${trend.name}")\n` +
      `Registered sources: ${Object.keys(ADAPTERS).join(", ")}`
    );
  }

  console.log(`[dispatch] ${trend.source} → "${trend.apiDataId}"`);
  return adapter(trend.apiDataId, since);
}
