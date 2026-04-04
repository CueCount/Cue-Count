// lib/db/trends.ts
// ─────────────────────────────────────────────────────────────────────────────
// Query functions for Trends, TrendValues, Weights, RelationshipValues,
// and LagValues.
//
// RIGHT NOW: reads from local mock JSON files (data/mock/)
// LATER: swap imports for real Postgres queries — callers stay the same.
//
// CHANGED from previous version:
//   - getStoryWithTrends() removed — the story page load is now composed in
//     DataState directly: getStoryById + getTrendWithValues + getRelationshipsByStoryId
//   - collectContributors() removed — contributors are fetched via
//     getRelationshipsByStoryId() in relationships.ts, which now owns the full
//     contributor detail fetch since RelationshipRow.trendId replaces contributorStoryId
//   - getRelationshipsByVariantId() removed — variant resolution lives in DataState
//   - All remaining functions are pure data-fetch utilities
// ─────────────────────────────────────────────────────────────────────────────

import type {
  TrendRow,
  TrendValueRow,
  WeightRow,
  RelationshipValueRow,
  TrendWithValues,
} from "@/types/db";

import mockTrends             from "@/data/mock/trends.json";
import mockTrendValues        from "@/data/mock/trend_values.json";
import mockWeights            from "@/data/mock/weights.json";
import mockRelationshipValues from "@/data/mock/relationship_values.json";
import mockLagValues          from "@/data/mock/lag_values.json";

const trends             = mockTrends             as TrendRow[];
const trendValues        = mockTrendValues        as TrendValueRow[];
const weights            = mockWeights            as WeightRow[];
const relationshipValues = mockRelationshipValues as RelationshipValueRow[];
const lagValues          = mockLagValues          as RelationshipValueRow[];

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

// Returns the variant override trend for a given base trend + variant.
// Returns null if no override exists — caller falls back to base trend.
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

export async function getWeightsByRelationshipId(relationshipId: string): Promise<WeightRow[]> {
  return weights
    .filter((w) => w.relationshipId === relationshipId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ── Relationship values ───────────────────────────────────────────────────────

export async function getRelationshipValuesByRelationshipId(
  relationshipId: string
): Promise<RelationshipValueRow[]> {
  return relationshipValues
    .filter((rv) => rv.relationshipId === relationshipId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ── Lag values ────────────────────────────────────────────────────────────────

export async function getLagValuesByRelationshipId(
  relationshipId: string
): Promise<RelationshipValueRow[]> {
  return lagValues
    .filter((lv) => lv.relationshipId === relationshipId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}