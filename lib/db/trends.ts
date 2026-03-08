// lib/db/trends.ts
// ─────────────────────────────────────────────────────────────────────────────
// Query functions for Trends, TrendValues, Variants and VariantValues.
//
// RIGHT NOW: reads from local mock JSON files (data/mock/)
// LATER: swap imports for real Postgres queries — callers stay the same.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  TrendRow,
  TrendValueRow,
  VariantRow,
  TrendWithValues,
  StoryWithTrends,
} from "@/types/db";
import type { StoryRow } from "@/types/db";

import mockTrends      from "@/data/mock/trends.json";
import mockTrendValues from "@/data/mock/trend_values.json";
import mockVariants    from "@/data/mock/variants.json";

const trends      = mockTrends      as TrendRow[];
const trendValues = mockTrendValues as TrendValueRow[];
const variants    = mockVariants    as VariantRow[];

// ── Trend metadata ────────────────────────────────────────────────────────────

export async function getTrendById(id: string): Promise<TrendRow | null> {
  return trends.find((t) => t.id === id) ?? null;
}

// ── Trend values ──────────────────────────────────────────────────────────────

// Get all data points for a trend, sorted by index (as they'd come from Postgres ORDER BY index)
export async function getTrendValues(trendId: string): Promise<TrendValueRow[]> {
  return trendValues
    .filter((v) => v.trendId === trendId)
    .sort((a, b) => a.index - b.index);
}

// Combine a trend's metadata with its values — this is what the graph needs
export async function getTrendWithValues(trendId: string): Promise<TrendWithValues | null> {
  const trend = await getTrendById(trendId);
  if (!trend) return null;
  const values = await getTrendValues(trendId);
  return { ...trend, values };
}

// ── Variants ──────────────────────────────────────────────────────────────────

// Get all variants for a story
export async function getVariantsByStoryId(storyId: string): Promise<VariantRow[]> {
  return variants.filter((v) => v.storyId === storyId);
}

// ── Composed query — the big one the graph page actually calls ────────────────
//
// This is the equivalent of a SQL JOIN across Story → Trend → TrendValue
// and Story → Variant → Trend → TrendValue.
// Returns everything the graph page needs in one call.

export async function getStoryWithTrends(story: StoryRow): Promise<StoryWithTrends> {
  // 1. Get the focal trend (the bold primary line)
  const focalTrend = await getTrendWithValues(story.focalTrendId);
  if (!focalTrend) throw new Error(`Focal trend not found: ${story.focalTrendId}`);

  // 2. Get all variants (supporting lines) for this story
  const storyVariants = await getVariantsByStoryId(story.id);

  // 3. For each variant, attach its trend + values
  const variantsWithTrends = await Promise.all(
    storyVariants.map(async (variant) => {
      const trend = await getTrendWithValues(variant.trendId);
      if (!trend) throw new Error(`Variant trend not found: ${variant.trendId}`);
      return { ...variant, trend };
    })
  );

  return {
    ...story,
    focalTrend,
    variants: variantsWithTrends,
  };
}
