"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  StoryWithContributors,
  ContributorRow,
  ContributorWithDetail,
  TrendWithValues,
  AnalysisRow,
  WeightRow,
  WeightValueRow,
  LagRow,
  LagValueRow,
  RelationshipRow,
  RelationshipValueRow,
} from "@/types/db";
import { getTrendWithValues }    from "@/lib/db/trends";
import { getAnalysesByStoryId, getStoryById } from "@/lib/db/stories";
import {
  getContributorsByStoryId,
  getWeightsByContributorIds,
  getWeightValuesByWeightIds,
  getLagsByContributorIds,
  getLagValuesByLagIds,
  getRelationshipHeadersByContributorIds,
  getRelationshipValuesByRelationshipIds,
} from "@/lib/db/contributors";

// ─────────────────────────────────────────────────────────────────────────────
// DataState shape
// ─────────────────────────────────────────────────────────────────────────────
//
// Everything is stored flat. The assembled tree (ContributorWithDetail[] with
// weights/lags/relationships filtered by the active analysis) is produced on
// demand by getEffectiveContributors(). Switching analyses never re-fetches —
// it just re-assembles from the flat slices already in memory.

type DataState = {
  // ── Core ──────────────────────────────────────────────────────────────────
  // rootStory holds the story + focal trend + base contributors (assembled at
  // load time with analysisId = null data). Use getEffectiveContributors() for
  // the analysis-aware version.
  rootStory: StoryWithContributors | null;
  rootStoryId: string | null;

  // ── Analyses ──────────────────────────────────────────────────────────────
  analyses: AnalysisRow[];
  activeAnalysisId: string | null;
  setActiveAnalysisId: (id: string | null) => void;

  // ── Flat contributor rows ─────────────────────────────────────────────────
  allContributors: ContributorRow[];

  // ── Flat time series headers (base + all analyses) ────────────────────────
  allWeights: WeightRow[];
  allWeightValues: WeightValueRow[];
  allLags: LagRow[];
  allLagValues: LagValueRow[];
  allRelationships: RelationshipRow[];
  allRelationshipValues: RelationshipValueRow[];

  // ── Setters ───────────────────────────────────────────────────────────────
  setRootStory: (story: StoryWithContributors) => void;
  setAnalyses: (analyses: AnalysisRow[]) => void;
  setAllContributors: (contributors: ContributorRow[]) => void;
  setAllWeights: (weights: WeightRow[]) => void;
  setAllWeightValues: (values: WeightValueRow[]) => void;
  setAllLags: (lags: LagRow[]) => void;
  setAllLagValues: (values: LagValueRow[]) => void;
  setAllRelationships: (relationships: RelationshipRow[]) => void;
  setAllRelationshipValues: (values: RelationshipValueRow[]) => void;

  // ── Selector ──────────────────────────────────────────────────────────────
  // Returns ContributorWithDetail[] filtered by the active analysis.
  // For each series (weights/lags/relationships), prefers analysis-scoped rows
  // where analysisId = activeAnalysisId; falls back to base (null) if no
  // analysis-specific row exists for that contributor.
  getEffectiveContributors: () => ContributorWithDetail[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const DataContext = createContext<DataState | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function DataProvider({ storyId, children }: { storyId: string; children: ReactNode }) {
  const [rootStory,             setRootStory]             = useState<StoryWithContributors | null>(null);
  const [analyses,              setAnalyses]              = useState<AnalysisRow[]>([]);
  const [activeAnalysisId,      setActiveAnalysisId]      = useState<string | null>(null);
  const [allContributors,       setAllContributors]       = useState<ContributorRow[]>([]);
  const [allWeights,            setAllWeights]            = useState<WeightRow[]>([]);
  const [allWeightValues,       setAllWeightValues]       = useState<WeightValueRow[]>([]);
  const [allLags,               setAllLags]               = useState<LagRow[]>([]);
  const [allLagValues,          setAllLagValues]          = useState<LagValueRow[]>([]);
  const [allRelationships,      setAllRelationships]      = useState<RelationshipRow[]>([]);
  const [allRelationshipValues, setAllRelationshipValues] = useState<RelationshipValueRow[]>([]);

  const rootStoryId = rootStory?.id ?? null;

  // ── Data loading ──────────────────────────────────────────────────────────
  //
  //   Step 1 — getStoryById
  //   Step 2 — getTrendWithValues (focal trend)
  //   Step 3+4 — parallel: getContributorsByStoryId, getAnalysesByStoryId
  //   Step 5 — parallel: getTrendWithValues for each contributor
  //   Step 6 — parallel: all time series headers by contributor IDs
  //   Step 7 — parallel: all value rows by header IDs
  //
  // All flat slices committed to state in one shot at the end.
  useEffect(() => {
    if (!storyId) return;
    let cancelled = false;

    async function load() {
      console.log(`[DataState] ▶ load() — storyId: ${storyId}`);

      const storyRow = await getStoryById(storyId);
      if (cancelled || !storyRow) {
        console.warn(`[DataState] ✗ getStoryById — no result for ${storyId}`);
        return;
      }
      console.log(`[DataState] ✓ story: "${storyRow.name}"`);

      const focalTrend = await getTrendWithValues(storyRow.focalTrendId);
      if (cancelled || !focalTrend) {
        console.warn(`[DataState] ✗ getTrendWithValues — no result for ${storyRow.focalTrendId}`);
        return;
      }
      console.log(`[DataState] ✓ focalTrend: "${focalTrend.name}" (${focalTrend.values.length} pts)`);

      const [contributorRows, analysisData]: [ContributorRow[], AnalysisRow[]] = await Promise.all([
        getContributorsByStoryId(storyId),
        getAnalysesByStoryId(storyId),
        ]);
      if (cancelled) return;
      console.log(`[DataState] ✓ contributors: ${contributorRows.length}, analyses: ${analysisData.length}`);

      const contributorIds = contributorRows.map((c) => c.id);

      const [contributorTrends, weightHeaders, lagHeaders, relationshipHeaders] = await Promise.all([
        Promise.all(contributorRows.map((c) => getTrendWithValues(c.trendId))),
        getWeightsByContributorIds(contributorIds),
        getLagsByContributorIds(contributorIds),
        getRelationshipHeadersByContributorIds(contributorIds),
      ]);
      if (cancelled) return;
      console.log(`[DataState] ✓ contributor trends, weight headers: ${weightHeaders.length}, lag headers: ${lagHeaders.length}, relationship headers: ${relationshipHeaders.length}`);

      const [weightVals, lagVals, relationshipVals] = await Promise.all([
        getWeightValuesByWeightIds(weightHeaders.map((w) => w.id)),
        getLagValuesByLagIds(lagHeaders.map((l) => l.id)),
        getRelationshipValuesByRelationshipIds(relationshipHeaders.map((r) => r.id)),
      ]);
      if (cancelled) return;
      console.log(`[DataState] ✓ values — weight: ${weightVals.length}, lag: ${lagVals.length}, relationship: ${relationshipVals.length}`);

      // Assemble base ContributorWithDetail (analysisId = null only) for rootStory.
      // getEffectiveContributors() handles analysis-filtered assembly later.
      const baseContributors: ContributorWithDetail[] = contributorRows.map((c, i) => {
        const trend = contributorTrends[i];
        if (!trend) throw new Error(`Trend not found for contributor "${c.name}" (trendId: ${c.trendId})`);

        const baseWeights = weightHeaders
          .filter((w) => w.contributorId === c.id && w.analysisId === null)
          .map((w) => ({ ...w, values: weightVals.filter((v) => v.weightId === w.id) }));

        const baseLags = lagHeaders
          .filter((l) => l.contributorId === c.id && l.analysisId === null)
          .map((l) => ({ ...l, values: lagVals.filter((v) => v.lagId === l.id) }));

        const baseRelationships = relationshipHeaders
          .filter((r) => r.contributorId === c.id && r.analysisId === null)
          .map((r) => ({ ...r, values: relationshipVals.filter((v) => v.relationshipId === r.id) }));

        console.log(`[DataState]   • "${c.name}" — trend: "${trend.name}", weights: ${baseWeights.length}, lags: ${baseLags.length}, relationships: ${baseRelationships.length}`);

        return { ...c, trend, weights: baseWeights, lags: baseLags, relationships: baseRelationships };
      });

      const defaultAnalysis = analysisData.find((a) => a.isDefault);
      if (defaultAnalysis) {
        setActiveAnalysisId(defaultAnalysis.id);
        console.log(`[DataState] ✓ activeAnalysisId seeded to default: "${defaultAnalysis.name}" (${defaultAnalysis.id})`);
      } else {
        console.warn(`[DataState] ✗ No default analysis found for story "${storyId}" — activeAnalysisId remains null`);
      }

      setRootStory({ ...storyRow, focalTrend, contributors: baseContributors });
      setAnalyses(analysisData);
      setAllContributors(contributorRows);
      setAllWeights(weightHeaders);
      setAllWeightValues(weightVals);
      setAllLags(lagHeaders);
      setAllLagValues(lagVals);
      setAllRelationships(relationshipHeaders);
      setAllRelationshipValues(relationshipVals);

      console.log(`[DataState] ✓ State committed`);
    }

    load();
    return () => { cancelled = true; };
  }, [storyId]);

  // ── getEffectiveContributors ───────────────────────────────────────────────
  // Assembles ContributorWithDetail[] for the currently active analysis.
  // For each series header type, prefers analysis-specific rows and falls
  // back to base for any contributor not covered by the active analysis.
  const getEffectiveContributors = useCallback((): ContributorWithDetail[] => {
    if (!rootStory) return [];

    const resolveHeaders = <T extends { contributorId: string; analysisId: string | null }>(
      headers: T[],
      contributorId: string
    ): T[] => {
      const forContributor = headers.filter((h) => h.contributorId === contributorId);
      if (!activeAnalysisId) return forContributor.filter((h) => h.analysisId === null);
      const analysisSpecific = forContributor.filter((h) => h.analysisId === activeAnalysisId);
      return analysisSpecific.length > 0
        ? analysisSpecific
        : forContributor.filter((h) => h.analysisId === null);
    };

    return allContributors.map((c) => {
      const baseDetail = rootStory.contributors.find((rc) => rc.id === c.id);
      if (!baseDetail) return null;

      const effectiveWeights = resolveHeaders(allWeights, c.id).map((w) => ({
        ...w,
        values: allWeightValues.filter((v) => v.weightId === w.id),
      }));

      const effectiveLags = resolveHeaders(allLags, c.id).map((l) => ({
        ...l,
        values: allLagValues.filter((v) => v.lagId === l.id),
      }));

      const effectiveRelationships = resolveHeaders(allRelationships, c.id).map((r) => ({
        ...r,
        values: allRelationshipValues.filter((v) => v.relationshipId === r.id),
      }));

      return {
        ...baseDetail,
        weights:       effectiveWeights,
        lags:          effectiveLags,
        relationships: effectiveRelationships,
      };
    }).filter(Boolean) as ContributorWithDetail[];
  }, [
    rootStory,
    allContributors,
    allWeights,
    allWeightValues,
    allLags,
    allLagValues,
    allRelationships,
    allRelationshipValues,
    activeAnalysisId,
  ]);

  // ── Context value ──────────────────────────────────────────────────────────
  const value = useMemo<DataState>(
    () => ({
      rootStory,
      rootStoryId,
      analyses,
      activeAnalysisId,
      setActiveAnalysisId,
      allContributors,
      allWeights,
      allWeightValues,
      allLags,
      allLagValues,
      allRelationships,
      allRelationshipValues,
      setRootStory,
      setAnalyses,
      setAllContributors,
      setAllWeights,
      setAllWeightValues,
      setAllLags,
      setAllLagValues,
      setAllRelationships,
      setAllRelationshipValues,
      getEffectiveContributors,
    }),
    [
      rootStory,
      rootStoryId,
      analyses,
      activeAnalysisId,
      allContributors,
      allWeights,
      allWeightValues,
      allLags,
      allLagValues,
      allRelationships,
      allRelationshipValues,
      getEffectiveContributors,
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