// ─────────────────────────────────────────────────────────────────────────────
// searchContributors.ts
//
// Queries both Trends and StoryReferences from Postgres via the DataConnect
// generated SDK. Returns combined results for the AddContributor modal.
// ─────────────────────────────────────────────────────────────────────────────

import { searchTrends, searchStoryReferences } from "@/src/dataconnect-generated";

export type ContributorSearchResult = {
  id:                 string;
  name:               string;
  type:               "trend" | "storyReference";
  // Trend-specific
  trendId?:           string;
  unit?:              string;
  denomination?:      number;
  source?:            string;
  trendDataId?:       string;
  // StoryReference-specific
  analysisNumber?:    number;
  contributorNumber?: number;
  storyDocId?:        string;
};

export async function searchContributors(query: string): Promise<ContributorSearchResult[]> {
  const q = query.trim() || "";

  const [trendsResult, storyRefsResult] = await Promise.all([
    searchTrends({ query: q }),
    searchStoryReferences({ query: q }),
  ]);

  const trends = trendsResult?.data?.trends ?? [];
  const storyRefs = storyRefsResult?.data?.storyReferences ?? [];

  const trendResults: ContributorSearchResult[] = trends.map((t: any) => ({
    id:           t.id,
    name:         t.name,
    trendId:      t.trendId,
    type:         "trend" as const,
    unit:         t.unit,
    denomination: t.denomination,
    source:       t.source,
    trendDataId:  t.trendDataId,
  }));

  const storyRefResults: ContributorSearchResult[] = (storyRefsResult?.data?.storyReferences ?? []).map((s: any) => ({
    id:                s.id,
    name:              s.name,
    type:              "storyReference" as const,
    analysisNumber:    s.analysisNumber,
    contributorNumber: s.contributorNumber,
    storyDocId:        s.storyDocId,
  }));

  // Interleave results and cap at 10
  const combined: ContributorSearchResult[] = [];
  const maxLen = Math.max(trendResults.length, storyRefResults.length);
  for (let i = 0; i < maxLen && combined.length < 10; i++) {
    if (i < trendResults.length)    combined.push(trendResults[i]);
    if (combined.length < 10 && i < storyRefResults.length) combined.push(storyRefResults[i]);
  }

  return combined;
}