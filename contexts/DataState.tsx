"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateStoryValues } from "@/lib/storyCalculation";
import type {
  PerspectiveDocument,
  StoryDocument,
  TrendRow,
  TrendDataRow,
  DataRow,
  WeightRow,
  LagRow,
  RelationshipRow,
  RelationshipTypeRow,
  AssembledContributor,
  AssembledAnalysis,
  AssembledStory,
  MergedDataPoint, 
} from "@/types/db";

// ─────────────────────────────────────────────────────────────────────────────
// Mock data imports
// SWAP TO POSTGRES: replace each import+filter with your ORM query.
// ─────────────────────────────────────────────────────────────────────────────
//
// trends.json       — Trends table: metadata per TrendId (shared, multi-user)
//                     Fields: id, name, unit, denomination, source, frequency,
//                             trendDataId, apiDataId, createdBy, createdAt, updatedAt
//
// trendData.json    — TrendData table: time-series values keyed by trendDataId
//                     Shared across all users. An error here affects everyone
//                     who uses that trend — kept separate from user Data for
//                     exactly this reason.
//
// data.json         — Data table: user-specific time-series values keyed by dataId
//                     An error here affects only the one user who owns that dataId.
//
// weight/lag/relationship/relationshipType — all user-specific, keyed by dataId.
//
import trendsJson           from "@/data/mock/trend.json";
import trendDataJson        from "@/data/mock/trendData.json";
import dataJson             from "@/data/mock/data.json";
import weightDataJson       from "@/data/mock/weight.json";
import lagDataJson          from "@/data/mock/lag.json";
import relationshipDataJson from "@/data/mock/relationship.json";
import relTypeDataJson      from "@/data/mock/relationshipType.json";

// ─────────────────────────────────────────────────────────────────────────────
// DataState shape
// ─────────────────────────────────────────────────────────────────────────────
//
// Three layers:
//
//   1. Flat slices — the editable source of truth in memory. These mirror
//      exactly what was fetched from the database. Edits write here via
//      targeted setters. Nothing touches the database until save() is called.
//
//   2. Trend meta + TrendData — read-only shared data resolved from TrendIds.
//      Fetched in Step 2.5 of initStory. Never edited by the user.
//
//   3. assembledStory — a useMemo derived view. Built from all flat slices,
//      allTrendMeta, allTrendDataValues, activeStoryDoc, and activeAnalysisId.
//      Rebuilds automatically on any change. Components read from here.
//
// ─────────────────────────────────────────────────────────────────────────────

type DataState = {
  // ── Perspectives ──────────────────────────────────────────────────────────
  perspectives: PerspectiveDocument[];
  perspectivesLoading: boolean;
  fetchPerspectives: (uid: string) => Promise<void>;

  // ── Stories ───────────────────────────────────────────────────────────────
  stories: StoryDocument[];
  storiesLoading: boolean;
  fetchStories: (perspectiveId: string) => Promise<void>;

  // ── Active story document ─────────────────────────────────────────────────
  activeStoryDoc: StoryDocument | null;
  activeStoryLoading: boolean;

  // ── Analyses ──────────────────────────────────────────────────────────────
  activeAnalysisId: string;
  setActiveAnalysisId: (id: string) => void;

  // ── Trend metadata + TrendData values (shared, read-only) ─────────────────
  // Resolved in Step 2.5 from TrendIds on the story doc + contributors.
  // allTrendMeta: one record per TrendId — carries name, unit, denomination,
  //               source, frequency, trendDataId, apiDataId.
  // allTrendDataValues: time-series rows from the TrendData table, keyed by
  //               trendDataId. Shared across all users of that trend.
  allTrendMeta:       TrendRow[];
  allTrendDataValues: TrendDataRow[];

  // ── Flat slices — user-specific, source of truth for edits ───────────────
  // Keyed by dataId. Edited via setters below. Saved via save().
  allDataValues:             DataRow[];
  allWeightValues:           WeightRow[];
  allLagValues:              LagRow[];
  allRelationshipValues:     RelationshipRow[];
  allRelationshipTypeValues: RelationshipTypeRow[];

  // ── Flat slice setters ────────────────────────────────────────────────────
  setAllDataValues:             (rows: DataRow[] | ((prev: DataRow[]) => DataRow[])) => void;
  setAllWeightValues:           (rows: WeightRow[] | ((prev: WeightRow[]) => WeightRow[])) => void;
  setAllLagValues:              (rows: LagRow[] | ((prev: LagRow[]) => LagRow[])) => void;
  setAllRelationshipValues:     (rows: RelationshipRow[] | ((prev: RelationshipRow[]) => RelationshipRow[])) => void;
  setAllRelationshipTypeValues: (rows: RelationshipTypeRow[] | ((prev: RelationshipTypeRow[]) => RelationshipTypeRow[])) => void;

  // ── Derived view — read only ──────────────────────────────────────────────
  assembledStory: AssembledStory | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  initStory: (
    storyId: string,
    storyDocumentData?: StoryDocument | null,
    analysisId?: string
  ) => Promise<void>;

  addContributor: (
    contributorId: string,
    name: string,
    trendId: string,
    dataId: string
  ) => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const DataContext = createContext<DataState | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {

  // ── Perspectives ──────────────────────────────────────────────────────────
  const [perspectives,        setPerspectives]        = useState<PerspectiveDocument[]>([]);
  const [perspectivesLoading, setPerspectivesLoading] = useState(false);

  // ── Stories ───────────────────────────────────────────────────────────────
  const [stories,        setStories]        = useState<StoryDocument[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  // ── Active story ──────────────────────────────────────────────────────────
  const [activeStoryDoc,     setActiveStoryDoc]     = useState<StoryDocument | null>(null);
  const [activeStoryLoading, setActiveStoryLoading] = useState(false);

  // ── Analyses ──────────────────────────────────────────────────────────────
  const [activeAnalysisId, setActiveAnalysisId] = useState<string>("RootAnalysis");

  // ── Trend metadata + TrendData values ─────────────────────────────────────
  const [allTrendMeta,       setAllTrendMeta]       = useState<TrendRow[]>([]);
  const [allTrendDataValues, setAllTrendDataValues] = useState<TrendDataRow[]>([]);

  // ── User flat slices ──────────────────────────────────────────────────────
  const [allDataValues,             setAllDataValues]             = useState<DataRow[]>([]);
  const [allWeightValues,           setAllWeightValues]           = useState<WeightRow[]>([]);
  const [allLagValues,              setAllLagValues]              = useState<LagRow[]>([]);
  const [allRelationshipValues,     setAllRelationshipValues]     = useState<RelationshipRow[]>([]);
  const [allRelationshipTypeValues, setAllRelationshipTypeValues] = useState<RelationshipTypeRow[]>([]);

  // ── fetchPerspectives ─────────────────────────────────────────────────────
  // SWAP TO POSTGRES: replace getDocs with your ORM query filtered by uid.
  const fetchPerspectives = useCallback(async (uid: string) => {
    console.log(`[DataState] ▶ fetchPerspectives() — uid: ${uid}`);
    setPerspectivesLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, "perspectives"),
        where("Permissions.Admin", "==", uid)
      ));
      setPerspectives(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PerspectiveDocument[]);
      console.log(`[DataState] ✓ fetchPerspectives — ${snap.docs.length} found`);
    } catch (err) {
      console.error("[DataState] ✗ fetchPerspectives failed:", err);
    } finally {
      setPerspectivesLoading(false);
    }
  }, []);

  // ── fetchStories ──────────────────────────────────────────────────────────
  // SWAP TO POSTGRES: replace getDocs with your ORM query filtered by perspectiveId.
  const fetchStories = useCallback(async (perspectiveId: string) => {
    console.log(`[DataState] ▶ fetchStories() — perspectiveId: ${perspectiveId}`);
    setStoriesLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, "stories"),
        where("perspectiveId", "==", perspectiveId)
      ));
      setStories(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as StoryDocument[]);
      console.log(`[DataState] ✓ fetchStories — ${snap.docs.length} found`);
    } catch (err) {
      console.error("[DataState] ✗ fetchStories failed:", err);
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  // ── initStory ─────────────────────────────────────────────────────────────
  //
  // Step 1 — Resolve the story document.
  //           Uses storyDocumentData if already in stories[] state. Otherwise
  //           fetches fresh from Firebase by storyId.
  //           SWAP TO POSTGRES: story structure fetch stays Firebase.
  //
  // Step 2 — Set activeAnalysisId.
  //
  // Step 2.5 — Resolve TrendIds → Trend metadata + TrendData values.
  //           Collect all TrendIds from:
  //             • storyDoc.trendId                          (story focal trend)
  //             • storyDoc.contributors[cId].trendId        (each contributor)
  //           Fetch Trend records by those TrendIds → allTrendMeta.
  //           Extract trendDataIds from the resolved Trend records.
  //           Fetch TrendData rows by trendDataIds → allTrendDataValues.
  //           SWAP TO POSTGRES:
  //             prisma.trends.findMany({ where: { id: { in: allTrendIds } } })
  //             prisma.trendData.findMany({ where: { trendDataId: { in: trendDataIds } } })
  //
  // Step 3 — Collect DataIds from story.analysis[analysisId].
  //           story.analysis[id].story.dataId               → focal trend DataId
  //           story.analysis[id].contributors[cId].dataId   → per-contributor DataId
  //
  // Step 4 — Fetch all user value rows from Data + modifier tables in parallel.
  //           SWAP TO POSTGRES:
  //             prisma.data.findMany({ where: { dataId: { in: allDataIds } } })
  //             prisma.weightData.findMany(...)  etc.
  //
  // Step 5 — Commit all slices to state. assembledStory rebuilds automatically.
  //
  const initStory = useCallback(async (
    storyId: string,
    storyDocumentData?: StoryDocument | null,
    analysisId: string = "RootAnalysis",
  ) => {
    console.log(`[DataState] ▶ initStory() — storyId: ${storyId}, analysisId: ${analysisId}`);
    setActiveStoryLoading(true);

    try {
      // ── Step 1 — resolve story document ───────────────────────────────────
      let storyDoc = storyDocumentData ?? null;
      if (!storyDoc) {
        const snap = await getDoc(doc(db, "stories", storyId));
        if (!snap.exists()) {
          console.warn(`[DataState] ✗ initStory — story not found: ${storyId}`);
          return;
        }
        storyDoc = { id: snap.id, ...snap.data() } as StoryDocument;
      }
      console.log(`[DataState] ✓ story document resolved: "${storyDoc.name}"`);

      // ── Step 2 — set active analysis ──────────────────────────────────────
      setActiveAnalysisId(analysisId);

      // ── Step 2.5 — resolve TrendIds → metadata + TrendData values ─────────
      //
      // Collect TrendIds from:
      //   • storyDoc.trendId            — the story's focal trend
      //   • storyDoc.contributors[*].trendId — every contributor on the story
      //
      // Note: we use the root contributors map here (not the analysis entry)
      // because TrendId lives on the contributor definition, not the analysis.
      // All analyses share the same contributors; what varies per-analysis is
      // the DataId and modifier values, not which trend a contributor represents.
      //
      const storyTrendId = storyDoc.trendId;
      const contributorTrendIds = Object.values(storyDoc.Contributors ?? {})
        .map((c: any) => c.trendId)
        .filter(Boolean) as string[];

      const allTrendIds = [...new Set([storyTrendId, ...contributorTrendIds].filter(Boolean))] as string[];
      console.log(`[DataState] ✓ Step 2.5 — ${allTrendIds.length} TrendIds collected`);

      // Fetch Trend metadata records
      // SWAP TO POSTGRES: prisma.trends.findMany({ where: { id: { in: allTrendIds } } })
      const trendIdSet = new Set(allTrendIds);
      const trendMeta = (trendsJson as TrendRow[]).filter(t => trendIdSet.has(t.id));
      console.log(`[DataState] ✓ Step 2.5 — ${trendMeta.length} Trend records resolved`);

      // Extract trendDataIds from the resolved Trend records
      const trendDataIdSet = new Set(
        trendMeta.map(t => t.trendDataId).filter(Boolean) as string[]
      );

      // Fetch TrendData rows (shared time-series values)
      // SWAP TO POSTGRES: prisma.trendData.findMany({ where: { trendDataId: { in: [...trendDataIdSet] } } })
      const trendDataValues = (trendDataJson as TrendDataRow[]).filter(
        r => trendDataIdSet.has(r.trendDataId)
      );
      console.log(`[DataState] ✓ Step 2.5 — ${trendDataValues.length} TrendData rows fetched`);

      // ── Step 3 — collect DataIds from ALL analysis entries ────────────────
      //
      // We iterate every analysisId in the map (RootAnalysis + all children)
      // and collect their DataIds into one unified Set. Duplicates are
      // deduplicated automatically — rows shared across analyses are only
      // fetched once. This means every subsequent analysis switch is instant:
      // assembledStory filters against already-populated slices with no
      // additional fetch required.
      //
      // The active analysisEntry is still resolved separately so we can guard
      // against a missing analysisId early and use it in logging below.
      //
      const analysisEntry = storyDoc.Analysis?.[analysisId];
      if (!analysisEntry) {
        console.warn(`[DataState] ✗ initStory — analysis "${analysisId}" not found in document`);
        return;
      }

      const allDataIdSet = new Set<string>();
      const allAnalysisEntries = Object.entries(storyDoc.Analysis ?? {});

      for (const [aId, entry] of allAnalysisEntries) {
        const storyDataId = (entry as any).Story?.DataId;
        if (storyDataId) allDataIdSet.add(storyDataId);

        for (const contributor of Object.values((entry as any).Contributors ?? {})) {
          const dataId = (contributor as any).DataId;
          if (dataId) allDataIdSet.add(dataId);
        }
      }

      const allDataIds = [...allDataIdSet];
      console.log(
        `[DataState] ✓ Step 3 — ${allDataIds.length} DataIds collected across ` +
        `${allAnalysisEntries.length} analysis entries (active: "${analysisId}")`
      );

      // ── Step 4 — fetch user value rows by DataId ──────────────────────────
      // SWAP TO POSTGRES: replace each filter with your ORM query using allDataIds.
      const dataIdSet = new Set(allDataIds);

      const dataValues    = (dataJson              as DataRow[])             .filter(r => dataIdSet.has(r.dataId));
      const weightValues  = (weightDataJson        as WeightRow[])           .filter(r => dataIdSet.has(r.dataId));
      const lagValues     = (lagDataJson           as LagRow[])              .filter(r => dataIdSet.has(r.dataId));
      const relValues     = (relationshipDataJson  as RelationshipRow[])     .filter(r => dataIdSet.has(r.dataId));
      const relTypeValues = (relTypeDataJson       as RelationshipTypeRow[]) .filter(r => dataIdSet.has(r.dataId));

      // ── Step 5 — commit all slices to state ───────────────────────────────
      setActiveStoryDoc(storyDoc);
      setActiveAnalysisId(analysisId);
      setAllTrendMeta(trendMeta);
      setAllTrendDataValues(trendDataValues);
      setAllDataValues(dataValues);
      setAllWeightValues(weightValues);
      setAllLagValues(lagValues);
      setAllRelationshipValues(relValues);
      setAllRelationshipTypeValues(relTypeValues);

      console.log(
        `[DataState] ✓ initStory committed — ` +
        `${allTrendIds.length} TrendIds, ${trendDataValues.length} TrendData rows, ` +
        `${allDataIds.length} DataIds across ${allAnalysisEntries.length} analyses`
      );
    } catch (err) {
      console.error("[DataState] ✗ initStory failed:", err);
    } finally {
      setActiveStoryLoading(false);
    }
  }, []);

  // ── addContributor ────────────────────────────────────────────────────────
  //
  // Adds a new contributor mid-session. Always writes to exactly two places:
  //   1. storyDoc.contributors           — canonical roster, always updated
  //   2. storyDoc.analysis.RootAnalysis  — always updated, no exceptions
  //
  // Adding to any child analysis is a separate, explicit user action.
  //
  // In-session state patch:
  //   a. Patch activeStoryDoc with the new contributor in both locations above.
  //   b. Resolve the TrendId → fetch and append Trend metadata + TrendData rows.
  //   c. Append user value rows for the new dataId to the flat slices.
  //      (assembledStory rebuilds automatically via useMemo.)
  //
  const addContributor = useCallback(async (
    contributorId: string,
    name: string,
    trendId: string,
    dataId: string,
  ) => {
    console.log(`[DataState] ▶ addContributor() — contributorId: ${contributorId}, trendId: ${trendId}`);

    setActiveStoryDoc(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        // 1. Write to root contributors map
        Contributors: {
          ...prev.Contributors,
          [contributorId]: { Name: name, trendId },
        },
        // 2. Spread ALL existing analyses first, then overwrite only RootAnalysis.
        //    Without ...prev.Analysis, every child analysis entry would be dropped.
        Analysis: {
          ...prev.Analysis,
          RootAnalysis: {
            ...prev.Analysis?.RootAnalysis,
            Contributors: {
              ...prev.Analysis?.RootAnalysis?.Contributors,
              [contributorId]: { DataId: dataId },
            },
          } as StoryDocument["Analysis"][string],
        },
      } as StoryDocument;
    });

    // b. Resolve the new TrendId — fetch metadata and TrendData rows
    // SWAP TO POSTGRES: prisma.trends.findFirst({ where: { id: trendId } })
    const newTrendMeta = (trendsJson as TrendRow[]).find(t => t.id === trendId);
    if (newTrendMeta) {
      // Patch allTrendMeta — avoid duplicates if trendId was already present
      setAllTrendMeta(prev => {
        const exists = prev.some(t => t.id === trendId);
        return exists ? prev : [...prev, newTrendMeta];
      });

      // Fetch and append TrendData rows for this trend's trendDataId
      // SWAP TO POSTGRES: prisma.trendData.findMany({ where: { trendDataId: newTrendMeta.trendDataId } })
      const newTrendDataRows = (trendDataJson as TrendDataRow[]).filter(
        r => r.trendDataId === newTrendMeta.trendDataId
      );
      setAllTrendDataValues(prev => {
        const alreadyLoaded = prev.some(r => r.trendDataId === newTrendMeta.trendDataId);
        return alreadyLoaded ? prev : [...prev, ...newTrendDataRows];
      });

      console.log(`[DataState] ✓ addContributor — TrendMeta + ${newTrendDataRows.length} TrendData rows patched`);
    } else {
      console.warn(`[DataState] ✗ addContributor — TrendId not found in mock: ${trendId}`);
    }

    // c. Append user value rows for the new dataId
    // SWAP TO POSTGRES: fetch each table filtered by the new dataId
    const newDataValues    = (dataJson            as DataRow[])             .filter(r => r.dataId === dataId);
    const newWeightValues  = (weightDataJson       as WeightRow[])           .filter(r => r.dataId === dataId);
    const newLagValues     = (lagDataJson          as LagRow[])              .filter(r => r.dataId === dataId);
    const newRelValues     = (relationshipDataJson as RelationshipRow[])     .filter(r => r.dataId === dataId);
    const newRelTypeValues = (relTypeDataJson      as RelationshipTypeRow[]) .filter(r => r.dataId === dataId);

    setAllDataValues(prev => {
      const existingKeys = new Set(prev.map(r => `${r.dataId}|${r.timestamp}`));
      const fresh = newDataValues.filter(r => !existingKeys.has(`${r.dataId}|${r.timestamp}`));
      return [...prev, ...fresh];
    });
    setAllWeightValues(prev           => [...prev, ...newWeightValues]);
    setAllLagValues(prev              => [...prev, ...newLagValues]);
    setAllRelationshipValues(prev     => [...prev, ...newRelValues]);
    setAllRelationshipTypeValues(prev => [...prev, ...newRelTypeValues]);

    console.log(`[DataState] ✓ addContributor — value rows patched for dataId: ${dataId}`);
  }, []);

  // ── assembledStory ────────────────────────────────────────────────────────
  //
  // Memoized derived view. Rebuilds whenever any slice, activeStoryDoc, or
  // activeAnalysisId changes. Never edited directly — components read only.
  //
  // For the story-level trend and each contributor:
  //   • Look up TrendId → Trend metadata from allTrendMeta
  //   • Look up trendDataId from that Trend record → filter allTrendDataValues
  //   • Filter user data slices by dataId (from the active analysis entry)
  //   • Stamp .meta onto the assembled item — all five data type arrays
  //     under a contributor inherit the same metadata by cohabitation
  //
  const assembledStory = useMemo((): AssembledStory | null => {
    if (!activeStoryDoc) return null;

    const analysisEntry = activeStoryDoc.Analysis?.[activeAnalysisId];
    if (!analysisEntry) return null;

    // ── Helper: resolve meta + trendDataValues for a given TrendId ───────────
    const resolveTrendMeta = (trendId: string) => {
      const meta = allTrendMeta.find(t => t.id === trendId) ?? null;
      const trendDataValues = meta
        ? allTrendDataValues.filter(r => r.trendDataId === meta.trendDataId)
        : [];
      return { meta, trendDataValues };
    };

    // ── Story-level focal trend ───────────────────────────────────────────────
    const storyTrendId = activeStoryDoc.trendId;
    const storyDataId  = analysisEntry.Story?.DataId;
    const { meta: storyMeta, trendDataValues: storyTrendDataValues } = resolveTrendMeta(storyTrendId);

    // ── Contributors ─────────────────────────────────────────────────────────
    //
    // We cross-reference two sources:
    //   • activeStoryDoc.contributors[cId]         → name, trendId
    //   • analysisEntry.contributors[cId]          → dataId
    //
    // A contributor is only assembled if it exists in BOTH maps for the active
    // analysis. Contributors in the root map but not in the analysis entry are
    // not yet added to that analysis — they are intentionally excluded here.
    //
    const contributors: AssembledContributor[] = Object.entries(analysisEntry.Contributors ?? {}).map(([contributorId, analysisContributor]: [string, any]) => {
      const rootContributor = activeStoryDoc.Contributors?.[contributorId] as any;
      const trendId = rootContributor?.trendId ?? null;
      const dataId  = analysisContributor.DataId;

      const { meta, trendDataValues } = resolveTrendMeta(trendId);

      const contributorDataValues = allDataValues.filter(v => v.dataId === dataId);

      // Normalize to YYYY-MM-DD so timestamps match regardless of whether
      // source data is "2024-01-01T00:00:00Z" or "2024-01-01"
      const normTs = (ts: string) => ts.slice(0, 10);

      // Index overrides by normalized timestamp for O(1) lookup
      const overrideByTimestamp = new Map<string, number>();
      for (const row of contributorDataValues) {
        overrideByTimestamp.set(normTs(row.timestamp), row.value);
      }

      // Track which normalized timestamps exist in the trend
      const trendTimestampSet = new Set(trendDataValues.map(v => normTs(v.timestamp)));

      // Build merged timeline:
      //   Step 1 — walk trend, substitute analysis overrides where they exist
      //   Step 2 — append any analysis points that fall outside the trend timeline
      //            (e.g. analysis data extending 2025–2026 when trend ends 2024)
      //   Sort chronologically so the line renders correctly regardless of order
      const mergedDataValues: MergedDataPoint[] = [
        ...trendDataValues.map(tdv => {
          const override = overrideByTimestamp.get(normTs(tdv.timestamp));
          return override !== undefined
            ? { timestamp: normTs(tdv.timestamp), value: override, isOverride: true  }
            : { timestamp: normTs(tdv.timestamp), value: tdv.value,  isOverride: false };
        }),
        ...contributorDataValues
          .filter(v => !trendTimestampSet.has(normTs(v.timestamp)))
          .map(v => ({ timestamp: normTs(v.timestamp), value: v.value, isOverride: true })),
      ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      return {
        id:                     contributorId,
        name:                   rootContributor?.Name ?? contributorId,
        trendId,
        dataId,
        meta,
        trendDataValues,
        dataValues:             contributorDataValues,
        mergedDataValues,    
        weightValues:           allWeightValues.filter(v => v.dataId === dataId),
        lagValues:              allLagValues.filter(v => v.dataId === dataId),
        relationshipValues:     allRelationshipValues.filter(v => v.dataId === dataId),
        relationshipTypeValues: allRelationshipTypeValues.filter(v => v.dataId === dataId),
      };
    });

    const analyses: AssembledAnalysis[] = Object.entries(
      activeStoryDoc.Analysis ?? {}
    ).map(([analysisId, entry]: [string, any]) => {
      const dataId     = entry?.Story?.DataId ?? "";
      const dataValues = allDataValues.filter(v => v.dataId === dataId);
      return {
        id:         analysisId,
        name:       entry?.Name ?? analysisId,
        dataId,
        dataValues,
      };
    });

    // ── Calculated story values ───────────────────────────────────────────────
    // Live recalc from contributor values. Rebuilds any time a contributor's
    // merged data, weight, lag, relationship, or relationshipType changes.
    // trendDataValues is the unmodified baseline passed as the starting point.
    const calculatedDataValues = calculateStoryValues(storyTrendDataValues, contributors);

    return {
      id:                   activeStoryDoc.id,
      name:                 activeStoryDoc.name,
      trendId:              storyTrendId,
      dataId:               storyDataId,
      activeAnalysisId,
      meta:                 storyMeta,
      trendDataValues:      storyTrendDataValues,
      dataValues:           allDataValues.filter(v => v.dataId === storyDataId),
      calculatedDataValues,
      contributors,
      analyses,
    };
  }, [
    activeStoryDoc,
    activeAnalysisId,
    allTrendMeta,
    allTrendDataValues,
    allDataValues,
    allWeightValues,
    allLagValues,
    allRelationshipValues,
    allRelationshipTypeValues,
  ]);

  // ── Context value ──────────────────────────────────────────────────────────
  const value = useMemo<DataState>(
    () => ({
      perspectives,
      perspectivesLoading,
      fetchPerspectives,
      stories,
      storiesLoading,
      fetchStories,
      activeStoryDoc,
      activeStoryLoading,
      activeAnalysisId,
      setActiveAnalysisId,
      allTrendMeta,
      allTrendDataValues,
      allDataValues,
      allWeightValues,
      allLagValues,
      allRelationshipValues,
      allRelationshipTypeValues,
      setAllDataValues,
      setAllWeightValues,
      setAllLagValues,
      setAllRelationshipValues,
      setAllRelationshipTypeValues,
      assembledStory,
      initStory,
      addContributor,
    }),
    [
      perspectives,
      perspectivesLoading,
      fetchPerspectives,
      stories,
      storiesLoading,
      fetchStories,
      activeStoryDoc,
      activeStoryLoading,
      activeAnalysisId,
      allTrendMeta,
      allTrendDataValues,
      allDataValues,
      allWeightValues,
      allLagValues,
      allRelationshipValues,
      allRelationshipTypeValues,
      assembledStory,
      initStory,
      addContributor,
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