"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  StoryWithContributors,
  TrendWithValues,
  VariantRow,
  WeightRow,
  RelationshipValueRow,
  LagValueRow,
} from "@/types/db";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// A Trend extended with an optional variantId and baseTrendId.
// When variantId is set, this trend is an override — its values replace
// the base trend (identified by baseTrendId) when that variant is active.
export type TrendWithVariant = TrendWithValues & {
  variantId: string | null;   // null = base/canonical
  baseTrendId: string | null; // null if this IS the base; set if this is an override
};

// A Relationship row as it lives in DataState — this IS the contributor link.
// variantId = null means it belongs to the base state.
export type RelationshipRow = {
  id: string;
  focalStoryId: string;
  contributorStoryId: string;
  variantId: string | null; // null = base
  type: string;
  createdBy: string;
  createdAt: string;
};

// The full DataState shape exposed to consumers via useData()
type DataState = {
  // ── Core story data ───────────────────────────────────────────────────────
  // The root focal story with all its contributors, loaded once on page mount.
  // This is the raw base data — do not read it directly in UI components.
  // Instead, use the selectors below so variant overrides are applied.
  rootStory: StoryWithContributors | null;

  // The root story's ID is surfaced directly so any deeply nested component
  // can stamp it onto new variant rows without traversing the tree.
  rootStoryId: string | null;

  // ── Variants ──────────────────────────────────────────────────────────────
  // All variants belonging to the root story (VARIANT.storyId = rootStoryId).
  variants: VariantRow[];

  // The currently active variant. null = show base state.
  activeVariantId: string | null;
  setActiveVariantId: (id: string | null) => void;

  // ── All relationships (base + all variants) ───────────────────────────────
  // Stored flat. Selectors filter by variantId to get the right slice.
  allRelationships: RelationshipRow[];

  // ── Weight / lag / relationship-value time series ─────────────────────────
  // Each is a flat array of data-point rows keyed by relationshipId.
  // Variant separation is implicit — variant relationship rows have their own
  // IDs, so their weight/lag/value series are naturally isolated.
  allWeights: WeightRow[];
  allLagValues: LagValueRow[];
  allRelationshipValues: RelationshipValueRow[];

  // ── All trends (base + variant overrides) ────────────────────────────────
  // Stored flat. Selectors resolve which one to use at render time.
  allTrends: TrendWithVariant[];

  // ── Setters (called by load functions or mutation handlers) ───────────────
  setRootStory: (story: StoryWithContributors) => void;
  setVariants: (variants: VariantRow[]) => void;
  setAllRelationships: (rels: RelationshipRow[]) => void;
  setAllWeights: (weights: WeightRow[]) => void;
  setAllLagValues: (lags: LagValueRow[]) => void;
  setAllRelationshipValues: (values: RelationshipValueRow[]) => void;
  setAllTrends: (trends: TrendWithVariant[]) => void;

  // ── Variant mutations ─────────────────────────────────────────────────────
  // Creates a new variant scoped to the root story.
  createVariant: (name: string, createdBy: string) => VariantRow;

  // Adds a relationship row for a specific variant (or base if variantId = null).
  // Always stamps rootStoryId onto any created variant — callers don't need to
  // know where in the tree the edit originated.
  addRelationship: (rel: Omit<RelationshipRow, "id" | "createdAt">) => void;

  // ── Weight / lag / relationship-value mutations ────────────────────────────
  // Each pair follows the same pattern: add a new data-point row, or update
  // the value on an existing one by its row ID. Timestamps are owned by the
  // caller (they represent the period the data point belongs to, not wall-clock
  // time of the edit).

  addWeightPoint: (point: Omit<WeightRow, "id">) => void;
  updateWeightPoint: (id: string, value: number) => void;

  addLagValuePoint: (point: Omit<LagValueRow, "id">) => void;
  updateLagValuePoint: (id: string, value: number) => void;

  addRelationshipValuePoint: (point: Omit<RelationshipValueRow, "id">) => void;
  updateRelationshipValuePoint: (id: string, value: number) => void;

  // ── Selectors ─────────────────────────────────────────────────────────────
  // These are the only things UI components should read. They apply the active
  // variant on top of base data automatically.

  // Returns relationships for a given focal story filtered by the active variant.
  // Falls back to base (variantId = null) for any contributor not overridden.
  getEffectiveRelationships: (focalStoryId: string) => RelationshipRow[];

  // Returns the correct trend values for a given base trend ID.
  // If the active variant has an override trend (baseTrendId = trendId), that
  // override's values are returned. Otherwise the base trend values are returned.
  getEffectiveTrend: (baseTrendId: string) => TrendWithValues;
};

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const DataContext = createContext<DataState | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
// Wrap the story page (outside UIProvider) with this.
// Load order: DataProvider loads first → UIProvider sits inside it →
// components read from both.
//
//   <DataProvider>
//     <UIProvider>
//       <StoryPage />
//     </UIProvider>
//   </DataProvider>

export function DataProvider({ children }: { children: ReactNode }) {
  const [rootStory, setRootStory]               = useState<StoryWithContributors | null>(null);
  const [variants, setVariants]                 = useState<VariantRow[]>([]);
  const [activeVariantId, setActiveVariantId]   = useState<string | null>(null);
  const [allRelationships, setAllRelationships] = useState<RelationshipRow[]>([]);
  const [allWeights, setAllWeights]             = useState<WeightRow[]>([]);
  const [allLagValues, setAllLagValues]         = useState<LagValueRow[]>([]);
  const [allRelationshipValues, setAllRelationshipValues] = useState<RelationshipValueRow[]>([]);
  const [allTrends, setAllTrends]               = useState<TrendWithVariant[]>([]);

  const rootStoryId = rootStory?.id ?? null;

  // ── createVariant ─────────────────────────────────────────────────────────
  // Always scoped to the root story. Returns the new variant so the caller
  // can immediately set it as active or start adding relationship rows to it.
  const createVariant = useCallback(
    (name: string, createdBy: string): VariantRow => {
      if (!rootStoryId) throw new Error("Cannot create variant before root story is loaded");
      const variant: VariantRow = {
        id: crypto.randomUUID(),
        storyId: rootStoryId, // always the root — never a contributor story
        name,
        createdBy,
        createdAt: new Date().toISOString(),
      };
      setVariants((prev) => [...prev, variant]);
      return variant;
    },
    [rootStoryId]
  );

  // ── addRelationship ───────────────────────────────────────────────────────
  // Adds one relationship row. If variantId is provided it must reference a
  // variant that belongs to rootStoryId — enforced here so callers deep in
  // the contributor tree can't accidentally stamp the wrong story.
  const addRelationship = useCallback(
    (rel: Omit<RelationshipRow, "id" | "createdAt">) => {
      if (rel.variantId) {
        const variant = variants.find((v) => v.id === rel.variantId);
        if (!variant) throw new Error(`Variant ${rel.variantId} not found`);
        if (variant.storyId !== rootStoryId) {
          throw new Error("Variant does not belong to the root story");
        }
      }
      const full: RelationshipRow = {
        ...rel,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setAllRelationships((prev) => [...prev, full]);
    },
    [variants, rootStoryId]
  );

  // ── addWeightPoint ────────────────────────────────────────────────────────
  // Appends one data point to the weight time series for a relationship.
  // The relationshipId on the point naturally scopes it to base or variant —
  // variant relationship rows have their own IDs, so no extra filtering needed.
  const addWeightPoint = useCallback(
    (point: Omit<WeightRow, "id">) => {
      const full: WeightRow = { ...point, id: crypto.randomUUID() };
      setAllWeights((prev) => [...prev, full]);
    },
    []
  );

  // Updates the numeric value of an existing weight data point by its row ID.
  // Does not touch relationshipId or timestamp — only the value changes.
  const updateWeightPoint = useCallback(
    (id: string, value: number) => {
      setAllWeights((prev) =>
        prev.map((w) => (w.id === id ? { ...w, value } : w))
      );
    },
    []
  );

  // ── addLagValuePoint ──────────────────────────────────────────────────────
  // Appends one data point to the lag time series for a relationship.
  const addLagValuePoint = useCallback(
    (point: Omit<LagValueRow, "id">) => {
      const full: LagValueRow = { ...point, id: crypto.randomUUID() };
      setAllLagValues((prev) => [...prev, full]);
    },
    []
  );

  // Updates the numeric value of an existing lag data point by its row ID.
  const updateLagValuePoint = useCallback(
    (id: string, value: number) => {
      setAllLagValues((prev) =>
        prev.map((l) => (l.id === id ? { ...l, value } : l))
      );
    },
    []
  );

  // ── addRelationshipValuePoint ─────────────────────────────────────────────
  // Appends one data point to the relationship-value time series.
  const addRelationshipValuePoint = useCallback(
    (point: Omit<RelationshipValueRow, "id">) => {
      const full: RelationshipValueRow = { ...point, id: crypto.randomUUID() };
      setAllRelationshipValues((prev) => [...prev, full]);
    },
    []
  );

  // Updates the numeric value of an existing relationship-value data point by its row ID.
  const updateRelationshipValuePoint = useCallback(
    (id: string, value: number) => {
      setAllRelationshipValues((prev) =>
        prev.map((v) => (v.id === id ? { ...v, value } : v))
      );
    },
    []
  );

  // ── addTrendOverride ──────────────────────────────────────────────────────
  // Adds a trend whose values will replace the base trend when the variant
  // is active. baseTrendId must point to an existing base trend.
  const addTrendOverride = useCallback(
    (trend: Omit<TrendWithVariant, "id" | "createdAt">) => {
      const full: TrendWithVariant = {
        ...trend,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setAllTrends((prev) => [...prev, full]);
    },
    []
  );

  // ── getEffectiveRelationships ─────────────────────────────────────────────
  // For a given focal story, returns the right set of relationship rows for
  // the current variant. Logic:
  //   1. If a variant is active, prefer rows where variantId = activeVariantId
  //   2. For contributors NOT overridden in the variant, fall back to base rows
  //      (variantId = null) so the tree stays complete
  //   3. If no variant is active, return only base rows
  const getEffectiveRelationships = useCallback(
    (focalStoryId: string): RelationshipRow[] => {
      const base = allRelationships.filter(
        (r) => r.focalStoryId === focalStoryId && r.variantId === null
      );

      if (!activeVariantId) return base;

      const variantRows = allRelationships.filter(
        (r) => r.focalStoryId === focalStoryId && r.variantId === activeVariantId
      );

      // Which contributor stories have a variant-specific override?
      const overriddenContributorIds = new Set(
        variantRows.map((r) => r.contributorStoryId)
      );

      // Base rows for contributors not touched by this variant
      const basePassthrough = base.filter(
        (r) => !overriddenContributorIds.has(r.contributorStoryId)
      );

      return [...variantRows, ...basePassthrough];
    },
    [allRelationships, activeVariantId]
  );

  // ── getEffectiveTrend ─────────────────────────────────────────────────────
  // For a given base trend ID, returns the trend + values to actually render.
  // If the active variant has an override (baseTrendId = trendId), that
  // override is returned. Otherwise the base trend is returned unchanged.
  const getEffectiveTrend = useCallback(
    (baseTrendId: string): TrendWithValues => {
      // Try to find a variant override first
      if (activeVariantId) {
        const override = allTrends.find(
          (t) => t.baseTrendId === baseTrendId && t.variantId === activeVariantId
        );
        if (override) return override;
      }

      // Fall back to the base trend
      const base = allTrends.find(
        (t) => t.id === baseTrendId && t.variantId === null
      );
      if (!base) throw new Error(`Base trend ${baseTrendId} not found in DataState`);
      return base;
    },
    [allTrends, activeVariantId]
  );

  // ── Context value ─────────────────────────────────────────────────────────
  // Memoised so consumers only re-render when the specific slice they read changes.
  const value = useMemo<DataState>(
    () => ({
      rootStory,
      rootStoryId,
      variants,
      activeVariantId,
      setActiveVariantId,
      allRelationships,
      allWeights,
      allLagValues,
      allRelationshipValues,
      allTrends,
      setRootStory,
      setVariants,
      setAllRelationships,
      setAllWeights,
      setAllLagValues,
      setAllRelationshipValues,
      setAllTrends,
      createVariant,
      addRelationship,
      addWeightPoint,
      updateWeightPoint,
      addLagValuePoint,
      updateLagValuePoint,
      addRelationshipValuePoint,
      updateRelationshipValuePoint,
      addTrendOverride,
      getEffectiveRelationships,
      getEffectiveTrend,
    }),
    [
      rootStory,
      rootStoryId,
      variants,
      activeVariantId,
      allRelationships,
      allWeights,
      allLagValues,
      allRelationshipValues,
      allTrends,
      createVariant,
      addRelationship,
      addWeightPoint,
      updateWeightPoint,
      addLagValuePoint,
      updateLagValuePoint,
      addRelationshipValuePoint,
      updateRelationshipValuePoint,
      addTrendOverride,
      getEffectiveRelationships,
      getEffectiveTrend,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a <DataProvider>");
  return ctx;
}