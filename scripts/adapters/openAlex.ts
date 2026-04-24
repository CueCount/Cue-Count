// scripts/adapters/openAlex.ts
// OpenAlex — research papers, citations, institutions — no API key required
// Polite pool: include your email as a query param for higher rate limits
// This adapter aggregates publication counts or citation totals by year
// apiDataId format: "works:concept:C41008148" (type:filterField:filterId)
// Browse concepts at: https://explore.openalex.org

import { RawPair } from "../types";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { defaultLimiter } from "../utils/rateLimiter";

// Optional — add your email for polite pool (higher rate limits, no enforcement)
const OPENALEX_EMAIL = process.env.OPENALEX_EMAIL ?? "your-email@example.com";
const BASE_URL = "https://api.openalex.org";

export async function fetchOpenAlex(
  apiDataId: string,   // format: "entity:filterField:filterId" e.g. "works:concepts.id:C41008148"
  since?: string
): Promise<RawPair[]> {
  return defaultLimiter.add(async () => {
    const [entity, filterField, filterId] = apiDataId.split(":");

    const startYear = since ? new Date(since).getFullYear() : 2000;
    const endYear = new Date().getFullYear();

    const results: RawPair[] = [];

    // Group by publication year using OpenAlex group_by
    const params = new URLSearchParams({
      filter: `${filterField}:${filterId},publication_year:${startYear}-${endYear}`,
      group_by: "publication_year",
      mailto: OPENALEX_EMAIL,
      per_page: "200",
    });

    const url = `${BASE_URL}/${entity}?${params.toString()}`;
    const res = await fetchWithRetry(url);

    if (!res.ok) {
      throw new Error(`OpenAlex error ${res.status} for "${apiDataId}"`);
    }

    const data = await res.json();
    const groups = data?.group_by;

    if (!groups) {
      throw new Error(`OpenAlex returned no group_by data for "${apiDataId}"`);
    }

    for (const group of groups) {
      results.push({
        date: String(group.key),        // publication year
        value: group.count as number,   // number of works
      });
    }

    return results.sort((a, b) => a.date.localeCompare(b.date));
  });
}
