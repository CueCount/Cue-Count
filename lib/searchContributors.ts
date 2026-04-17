// ─────────────────────────────────────────────────────────────────────────────
// searchContributors.ts
//
// Pure search function — no React. Queries both the Trends and StoryReferences
// mock tables and returns up to 10 combined results.
//
// SWAP TO POSTGRES:
//   Replace the json imports + filter logic with two parallel ORM queries:
//     prisma.trends.findMany({ where: { name: { contains: query } }, take: 10 })
//     prisma.storyReferences.findMany({ where: { name: { contains: query } }, take: 10 })
// ─────────────────────────────────────────────────────────────────────────────

import trendsJson          from "@/data/mock/trend.json";
import storyRefsJson       from "@/data/mock/storyReference.json";

export type ContributorSearchResult = {
  id:                string;
  name:              string;
  type:              "trend" | "storyReference";
  // Trend-specific
  unit?:             string;
  denomination?:     number;
  source?:           string;
  trendDataId?:      string;
  // StoryReference-specific
  analysisNumber?:   number;
  contributorNumber?: number;
  storyDocId?:       string;
};

export function searchContributors(query: string): ContributorSearchResult[] {
  const q = query.trim().toLowerCase();

  const trendResults: ContributorSearchResult[] = (trendsJson as any[])
    .filter(t => !q || t.name?.toLowerCase().includes(q))
    .map(t => ({
      id:            t.id,
      name:          t.name,
      type:          "trend" as const,
      unit:          t.unit,
      denomination:  t.denomination,
      source:        t.source,
      trendDataId:   t.trendDataId,
    }));

  const storyRefResults: ContributorSearchResult[] = (storyRefsJson as any[])
    .filter(s => !q || s.name?.toLowerCase().includes(q))
    .map(s => ({
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