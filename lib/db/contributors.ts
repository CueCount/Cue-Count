// lib/db/contributors.ts
// ─────────────────────────────────────────────────────────────────────────────
// Query functions for Contributors and all their associated time series —
// Weights, Lags, and Relationships (with their Value rows).
//
// RIGHT NOW: reads from local mock JSON files (data/mock/)
// LATER: swap imports for real Postgres queries — callers stay the same.
//
// Load strategy (called from DataState):
//   1. getContributorsByStoryId — flat ContributorRows for a story
//   2. getWeightsByContributorIds — all Weight headers (base + all analyses)
//   3. getWeightValuesByWeightIds — all WeightValue data points
//   4. getLagsByContributorIds — all Lag headers
//   5. getLagValuesByLagIds — all LagValue data points
//   6. getRelationshipHeadersByContributorIds — all Relationship headers
//   7. getRelationshipValuesByRelationshipIds — all RelationshipValue data points
//
// Everything is returned flat. DataState stores it flat and assembles the
// tree in getEffectiveContributors(), filtered by activeAnalysisId.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ContributorRow,
  WeightRow,
  WeightValueRow,
  LagRow,
  LagValueRow,
  RelationshipRow,
  RelationshipValueRow,
} from "@/types/db";

import mockContributors        from "@/data/mock/contributors.json";
import mockWeights             from "@/data/mock/weights.json";
import mockWeightValues        from "@/data/mock/weight_values.json";
import mockLags                from "@/data/mock/lags.json";
import mockLagValues           from "@/data/mock/lag_values.json";
import mockRelationships       from "@/data/mock/relationships.json";
import mockRelationshipValues  from "@/data/mock/relationship_values.json";

const contributors       = mockContributors       as ContributorRow[];
const weights            = mockWeights            as WeightRow[];
const weightValues       = mockWeightValues       as WeightValueRow[];
const lags               = mockLags               as LagRow[];
const lagValues          = mockLagValues          as LagValueRow[];
const relationships      = mockRelationships      as RelationshipRow[];
const relationshipValues = mockRelationshipValues as RelationshipValueRow[];

// ── Contributors ──────────────────────────────────────────────────────────────

export async function getContributorsByStoryId(
  storyId: string
): Promise<ContributorRow[]> {
  return contributors.filter((c) => c.focalStoryId === storyId);
}

// ── Weights ───────────────────────────────────────────────────────────────────

// Returns ALL Weight headers for the given contributor IDs — base and every
// analysis-scoped row. DataState stores them all and filters at assembly time.
export async function getWeightsByContributorIds(
  contributorIds: string[]
): Promise<WeightRow[]> {
  const idSet = new Set(contributorIds);
  return weights.filter((w) => idSet.has(w.contributorId));
}

export async function getWeightValuesByWeightIds(
  weightIds: string[]
): Promise<WeightValueRow[]> {
  const idSet = new Set(weightIds);
  return weightValues
    .filter((v) => idSet.has(v.weightId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ── Lags ──────────────────────────────────────────────────────────────────────

export async function getLagsByContributorIds(
  contributorIds: string[]
): Promise<LagRow[]> {
  const idSet = new Set(contributorIds);
  return lags.filter((l) => idSet.has(l.contributorId));
}

export async function getLagValuesByLagIds(
  lagIds: string[]
): Promise<LagValueRow[]> {
  const idSet = new Set(lagIds);
  return lagValues
    .filter((v) => idSet.has(v.lagId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ── Relationships ─────────────────────────────────────────────────────────────

export async function getRelationshipHeadersByContributorIds(
  contributorIds: string[]
): Promise<RelationshipRow[]> {
  const idSet = new Set(contributorIds);
  return relationships.filter((r) => idSet.has(r.contributorId));
}

export async function getRelationshipValuesByRelationshipIds(
  relationshipIds: string[]
): Promise<RelationshipValueRow[]> {
  const idSet = new Set(relationshipIds);
  return relationshipValues
    .filter((v) => idSet.has(v.relationshipId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}