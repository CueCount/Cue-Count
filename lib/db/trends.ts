// lib/db/trends.ts
// ─────────────────────────────────────────────────────────────────────────────
// Query functions for Trends, TrendValues, Relationships, Weights,
// RelationshipValues, and LagValues.
//
// RIGHT NOW: reads from local mock JSON files (data/mock/)
// LATER: swap imports for real Postgres queries — callers stay the same.
//
// Key structural changes from previous version:
//   - StoryContributor table is gone. Relationship IS the contributor link.
//     getWeightsByContributorId → getWeightsByRelationshipId
//     getRelationshipsByContributorId → removed (type is on the row directly)
//   - RelationshipRow now has focalStoryId, contributorStoryId, variantId, type
//   - Weights reference relationshipId (not storyContributorId)
//   - LagValues added — parallel to RelationshipValues for lagged relationships
//   - Trends have variantId + baseTrendId for override trends
//   - collectContributors walks relationships directly, no story_contributors join
//   - getStoryWithTrends loads BASE relationships only (variantId = null)
//     Variant overrides are loaded separately via getVariantRelationships
//     and getVariantTrends, then resolved in DataState
// ─────────────────────────────────────────────────────────────────────────────

import type {
  TrendRow,
  TrendValueRow,
  WeightRow,
  RelationshipRow,
  RelationshipValueRow,
  TrendWithValues,
  StoryWithTrend,
  ContributorWithDetail,    // CHANGED: was StoryContributorWithDetail
  StoryWithContributors,
} from "@/types/db";

import type { StoryRow } from "@/types/db";

import mockTrends             from "@/data/mock/trends.json";
import mockTrendValues        from "@/data/mock/trend_values.json";
import mockWeights            from "@/data/mock/weights.json";
import mockRelationships      from "@/data/mock/relationships.json";
import mockRelationshipValues from "@/data/mock/relationship_values.json";
import mockLagValues          from "@/data/mock/lag_values.json";     // ADDED
import mockStories            from "@/data/mock/stories.json";

const trends             = mockTrends             as TrendRow[];
const trendValues        = mockTrendValues        as TrendValueRow[];
const weights            = mockWeights            as WeightRow[];
const relationships      = mockRelationships      as RelationshipRow[];
const relationshipValues = mockRelationshipValues as RelationshipValueRow[];
const lagValues          = mockLagValues          as RelationshipValueRow[]; // ADDED: same shape
const stories            = mockStories            as StoryRow[];

// ── Trend metadata ────────────────────────────────────────────────────────────

export async function getTrendById(id: string): Promise<TrendRow | null> {
  return trends.find((t) => t.id === id) ?? null;
}

// ── Trend values ──────────────────────────────────────────────────────────────

export async function getTrendValues(trendId: string): Promise<TrendValueRow[]> {
  return trendValues
    .filter((v) => v.trendId === trendId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function getTrendWithValues(trendId: string): Promise<TrendWithValues | null> {
  const trend = await getTrendById(trendId);
  if (!trend) return null;
  const values = await getTrendValues(trendId);
  return { ...trend, values };
}

// ADDED: loads the variant override trend for a given base trend + variant.
// Returns null if no override exists — caller falls back to base trend.
// DataState's getEffectiveTrend() uses this pattern internally; this function
// is exposed for cases where you need the override trend row directly.
export async function getOverrideTrend(
  baseTrendId: string,
  variantId: string
): Promise<TrendWithValues | null> {
  const override = trends.find(
    (t) => t.baseTrendId === baseTrendId && t.variantId === variantId
  );
  if (!override) return null;
  const values = await getTrendValues(override.id);
  return { ...override, values };
}

// ── Weights ───────────────────────────────────────────────────────────────────

// CHANGED: was getWeightsByContributorId(storyContributorId).
// Weights now reference relationshipId directly — the StoryContributor
// table no longer exists, so the old join through that table is gone.
export async function getWeightsByRelationshipId(relationshipId: string): Promise<WeightRow[]> {
  return weights
    .filter((w) => w.relationshipId === relationshipId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ── Relationship values ───────────────────────────────────────────────────────

// CHANGED: was getRelationshipsByContributorId which returned the full
// RelationshipRow array. That function assembled the type + values for a
// storyContributor. Now type lives directly on the RelationshipRow itself,
// so this function only needs to return the modifier value time series.
export async function getRelationshipValuesByRelationshipId(
  relationshipId: string
): Promise<RelationshipValueRow[]> {
  return relationshipValues
    .filter((rv) => rv.relationshipId === relationshipId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ADDED: lag values — the days-offset time series for "lagged" relationships.
// Parallel to getRelationshipValuesByRelationshipId but semantically distinct.
export async function getLagValuesByRelationshipId(
  relationshipId: string
): Promise<RelationshipValueRow[]> {
  return lagValues
    .filter((lv) => lv.relationshipId === relationshipId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ── Variant relationship fetch ────────────────────────────────────────────────

// ADDED: loads all relationship rows for a specific variant.
// Used by DataState when a variant is selected — these rows are merged
// on top of base relationships via getEffectiveRelationships().
export async function getRelationshipsByVariantId(
  variantId: string
): Promise<ContributorWithDetail[]> {
  const variantRels = relationships.filter((r) => r.variantId === variantId);

  return Promise.all(
    variantRels.map(async (rel) => {
      const contributorStoryRow = stories.find((s) => s.id === rel.contributorStoryId);
      if (!contributorStoryRow) throw new Error(`Contributor story not found: ${rel.contributorStoryId}`);

      const focalTrend = await getTrendWithValues(contributorStoryRow.focalTrendId);
      if (!focalTrend) throw new Error(`Focal trend not found: ${contributorStoryRow.focalTrendId}`);

      const contributorStory: StoryWithTrend = { ...contributorStoryRow, focalTrend };
      const relWeights          = await getWeightsByRelationshipId(rel.id);
      const relValues           = await getRelationshipValuesByRelationshipId(rel.id);
      const relLagValues        = await getLagValuesByRelationshipId(rel.id);

      return {
        ...rel,
        contributorStory,
        weights: relWeights,
        relationshipValues: relValues,  // CHANGED: was "relationships" array
        lagValues: relLagValues,        // ADDED
      } as ContributorWithDetail;
    })
  );
}

// ── Flat recursive contributor fetch ─────────────────────────────────────────
//
// Walks the entire BASE contributor tree (variantId = null relationships only)
// starting from a focal story, collecting every ContributorWithDetail into a
// single flat array. The sidebar builds the tree UI by filtering on focalStoryId.
//
// CHANGED: was walking storyContributors table then joining to relationships.
// Now walks the relationships table directly — focalStoryId + contributorStoryId
// live on the relationship row itself. variantId = null filter ensures we only
// load base data here; variant overrides are loaded separately.
//
// visited guards against cycles in the data.

async function collectContributors(
  focalStoryId: string,
  visited: Set<string>,
  acc: ContributorWithDetail[]
): Promise<void> {
  if (visited.has(focalStoryId)) return;
  visited.add(focalStoryId);

  // CHANGED: filter relationships directly by focalStoryId + variantId null
  // Previously: filter storyContributors by focalStoryId, then join relationships
  const directRels = relationships.filter(
    (r) => r.focalStoryId === focalStoryId && r.variantId === null
  );

  await Promise.all(
    directRels.map(async (rel) => {
      const contributorStoryRow = stories.find((s) => s.id === rel.contributorStoryId);
      if (!contributorStoryRow) throw new Error(`Contributor story not found: ${rel.contributorStoryId}`);

      const focalTrend = await getTrendWithValues(contributorStoryRow.focalTrendId);
      if (!focalTrend) throw new Error(`Focal trend not found: ${contributorStoryRow.focalTrendId}`);

      const contributorStory: StoryWithTrend = { ...contributorStoryRow, focalTrend };

      // CHANGED: getWeightsByRelationshipId(rel.id) — was getWeightsByContributorId(sc.id)
      const relWeights   = await getWeightsByRelationshipId(rel.id);
      // CHANGED: single values array per relationship — was an array of full RelationshipRows
      const relValues    = await getRelationshipValuesByRelationshipId(rel.id);
      // ADDED: lag values alongside relationship values
      const relLagValues = await getLagValuesByRelationshipId(rel.id);

      acc.push({
        ...rel,                          // spread gives us focalStoryId, contributorStoryId,
                                         // variantId, type, createdBy, createdAt, id
        contributorStory,
        weights: relWeights,
        relationshipValues: relValues,   // CHANGED: was "relationships: rels" (array of RelationshipRows)
        lagValues: relLagValues,         // ADDED
      });

      // Recurse into this contributor's own contributors
      await collectContributors(rel.contributorStoryId, visited, acc);
    })
  );
}

// ── Composed query — what the story page calls on load ────────────────────────
//
// Returns the focal story with a FLAT list of every BASE contributor in the tree.
// Variant relationships and override trends are NOT included here — they are
// loaded separately and resolved in DataState when a variant is selected.
//
// CHANGED: contributors are now ContributorWithDetail[] (relationship rows with
// nested data) rather than StoryContributorWithDetail[] (the old joined type).

export async function getStoryWithTrends(story: StoryRow): Promise<StoryWithContributors> {
  const focalTrend = await getTrendWithValues(story.focalTrendId);
  if (!focalTrend) throw new Error(`Focal trend not found: ${story.focalTrendId}`);

  const allContributors: ContributorWithDetail[] = [];
  await collectContributors(story.id, new Set(), allContributors);

  return {
    ...story,
    focalTrend,
    contributors: allContributors,
  };
}