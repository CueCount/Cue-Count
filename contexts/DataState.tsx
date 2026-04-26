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
  updateDoc, 
  deleteField
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateStoryValues } from "@/lib/storyCalculation";
import { addIncrements, FUTURE_INCREMENTS_BY_FREQUENCY } from "@/lib/timeIncrements";
import type {
  PerspectiveDocument,
  StoryDocument,
  TrendRow,
  TrendDataRow,
  DataRow,
  WeightRow,
  LagRow,
  CorrelationRow,
  AssembledContributor,
  AssembledAnalysis,
  AssembledStory,
  MergedDataPoint, 
} from "@/types/db";

// ─────────────────────────────────────────────────────────────────────────────
// Data source flag
// Set NEXT_PUBLIC_USE_MOCK=true in .env.local to use JSON mock data.
// Remove or set to false to use Firebase Data Connect (Postgres).
// ─────────────────────────────────────────────────────────────────────────────
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "false";

import trendsJson           from "@/data/mock/trend.json";
import trendDataJson        from "@/data/mock/trendData.json";
import dataJson             from "@/data/mock/data.json";
import weightDataJson       from "@/data/mock/weight.json";
import lagDataJson          from "@/data/mock/lag.json";
import correlationDataJson  from "@/data/mock/correlation.json";

// ── Data Connect SDK imports (only used when USE_MOCK=false) ──────────────────
// NOTE: verify this import path matches your generated SDK location after
// running: firebase dataconnect:sdk:generate
import {
  getTrendsByIds,
  getTrendDataByTrendDataIds,
  getDataByDataIds,
  getWeightDataByDataIds,
  getLagDataByDataIds,
  getCorrelationDataByDataIds,
  upsertData,
  upsertWeightData,
  upsertLagData,
  upsertCorrelationData,
  deleteDataByDataId,
  deleteWeightDataByDataId,
  deleteLagDataByDataId,
  deleteCorrelationDataByDataId,
} from "@/src/dataconnect-generated";

// ─────────────────────────────────────────────────────────────────────────────
// runInBatches — bounded-parallelism executor
// ─────────────────────────────────────────────────────────────────────────────
//
// Used for bulk Postgres mutations (createAnalysis copy path, save layer).
// Postgres has a hard cap on concurrent connections; firing hundreds of
// upserts at once via Promise.all blows past it (RESOURCE_EXHAUSTED).
// runInBatches accepts an array of Promise factories (zero-arg functions
// that START the work when called) and runs at most batchSize at a time.
//
// Important: callers must push factories, not started promises. Pushing
// `() => upsertWeightData(...)` defers the call until the batch starts.
// Pushing `upsertWeightData(...)` directly starts the work immediately,
// defeating the purpose.
//
async function runInBatches<T>(
  factories: (() => Promise<T>)[],
  batchSize: number,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < factories.length; i += batchSize) {
    const slice = factories.slice(i, i + batchSize).map(fn => fn());
    out.push(...await Promise.all(slice));
  }
  return out;
}

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

  // ── Active view state ─────────────────────────────────────────────────────
  // Session-only state describing the user's current view of the story:
  // currently the visible time range (zoom). Lives here (not on storyDoc) so
  // it survives view switches and analysis switches but resets on story
  // switch. Initialized in initStory from the focal trend's first/last
  // timestamps. Both Graph (chart x.min/x.max) and RangeSlider read+write
  // these fields — single source of truth, no drift possible.
  activeViewState: {
    zoomStart:   string;  // ISO timestamp — chart x-axis min
    zoomEnd:     string;  // ISO timestamp — chart x-axis max
    domainStart: string;  // earliest valid timestamp (= focal trend start)
    domainEnd:   string;  // latest valid timestamp (= focal trend end + N future increments)
  } | null;
  setActiveViewState: (next: Partial<{
    zoomStart:   string;
    zoomEnd:     string;
    domainStart: string;
    domainEnd:   string;
  }>) => void;

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
  allCorrelationValues:      CorrelationRow[];

  // ── Flat slice setters ────────────────────────────────────────────────────
  setAllDataValues:             (rows: DataRow[] | ((prev: DataRow[]) => DataRow[])) => void;
  setAllWeightValues:           (rows: WeightRow[] | ((prev: WeightRow[]) => WeightRow[])) => void;
  setAllLagValues:              (rows: LagRow[] | ((prev: LagRow[]) => LagRow[])) => void;
  setAllCorrelationValues:      (rows: CorrelationRow[] | ((prev: CorrelationRow[]) => CorrelationRow[])) => void;

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
    dataIdByAnalysisId: Record<string, string>,
    baselineRows: {
      weight:      WeightRow[];
      lag:         LagRow[];
      correlation: CorrelationRow[];
    },
  ) => Promise<void>;

  linkContributor: (
    name: string,
    trendId: string,
  ) => Promise<void>;

  unlinkContributor: (
    contributorId: string,
  ) => Promise<void>;

  createAnalysis: (params: { 
    name:            string;
    baseAnalysisId?: string;
  }) => Promise<{ analysisId: string }>;

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
  const [activeAnalysisId, setActiveAnalysisId] = useState<string>("");

  // ── Active view state ─────────────────────────────────────────────────────
  const [activeViewState, setActiveViewStateInternal] = useState<{
    zoomStart:   string;
    zoomEnd:     string;
    domainStart: string;
    domainEnd:   string;
  } | null>(null);
  const setActiveViewState = useCallback((next: Partial<{
    zoomStart:   string;
    zoomEnd:     string;
    domainStart: string;
    domainEnd:   string;
  }>) => {
    setActiveViewStateInternal(prev => {
      if (!prev) {
        if (next.zoomStart && next.zoomEnd && next.domainStart && next.domainEnd) {
          return next as any;
        }
        return prev;
      }
      return { ...prev, ...next };
    });
  }, []);

  // ── Trend metadata + TrendData values ─────────────────────────────────────
  const [allTrendMeta,       setAllTrendMeta]       = useState<TrendRow[]>([]);
  const [allTrendDataValues, setAllTrendDataValues] = useState<TrendDataRow[]>([]);

  // ── User flat slices ──────────────────────────────────────────────────────
  const [allDataValues,             setAllDataValues]             = useState<DataRow[]>([]);
  const [allWeightValues,           setAllWeightValues]           = useState<WeightRow[]>([]);
  const [allLagValues,              setAllLagValues]              = useState<LagRow[]>([]);
  const [allCorrelationValues,      setAllCorrelationValues]      = useState<CorrelationRow[]>([]);

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
    analysisId?: string,
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
      const resolvedAnalysisId = analysisId ?? Object.keys(storyDoc.Analysis ?? {}).sort()[0] ?? "";
      setActiveAnalysisId(resolvedAnalysisId);

      // ── Step 2.5 — resolve TrendIds → metadata + TrendData values ─────────
      
      const storyTrendId = storyDoc.trendId;
      const contributorTrendIds = Object.values(storyDoc.Contributors ?? {})
        .map((c: any) => c.trendId)
        .filter(Boolean) as string[];

      const allTrendIds = [...new Set([storyTrendId, ...contributorTrendIds].filter(Boolean))] as string[];
      console.log(`[DataState] ✓ Step 2.5 — ${allTrendIds.length} TrendIds collected`);

      // Fetch Trend metadata records
      let trendMeta: TrendRow[];
      if (USE_MOCK) {
        const trendIdSet = new Set(allTrendIds);
        trendMeta = (trendsJson as TrendRow[]).filter(t => trendIdSet.has(t.trendId));      
      } else {
        const result = await getTrendsByIds({ ids: allTrendIds });
        trendMeta = result.data.trends as TrendRow[];
      }
      console.log(`[DataState] ✓ Step 2.5 — ${trendMeta.length} Trend records resolved`);

      const trendDataIdSet = new Set(
        trendMeta.map(t => t.trendDataId).filter(Boolean) as string[]
      );

      // Fetch TrendData rows
      let trendDataValues: TrendDataRow[];
      if (USE_MOCK) {
        trendDataValues = (trendDataJson as TrendDataRow[]).filter(
          r => trendDataIdSet.has(r.trendDataId)
        );
      } else {
        const result = await getTrendDataByTrendDataIds({ trendDataIds: [...trendDataIdSet] });
        trendDataValues = result.data.trendDatas as TrendDataRow[];
      }
      console.log(`[DataState] ✓ Step 2.5 — ${trendDataValues.length} TrendData rows fetched`);

      // ── Step 3 — collect DataIds from ALL analysis entries ────────────────
      const analysisEntry = storyDoc.Analysis?.[resolvedAnalysisId];
      if (!analysisEntry) {
        console.warn(`[DataState] ✗ initStory — analysis "${resolvedAnalysisId}" not found in document`);
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
        `${allAnalysisEntries.length} analysis entries (active: "${resolvedAnalysisId}")`
      );

      // ── Step 4 — fetch user value rows by DataId ──────────────────────────
      let dataValues:    DataRow[];
      let weightValues:  WeightRow[];
      let lagValues:     LagRow[];
      let corValues:     CorrelationRow[];

      if (USE_MOCK) {
        const dataIdSet = new Set(allDataIds);
        dataValues    = (dataJson              as DataRow[])            .filter(r => dataIdSet.has(r.dataId));
        weightValues  = (weightDataJson        as WeightRow[])          .filter(r => dataIdSet.has(r.dataId));
        lagValues     = (lagDataJson           as LagRow[])             .filter(r => dataIdSet.has(r.dataId));
        corValues     = (correlationDataJson   as CorrelationRow[])     .filter(r => dataIdSet.has(r.dataId));
      } else {
        const [d, w, l, r] = await Promise.all([
          getDataByDataIds({                 dataIds: allDataIds }),
          getWeightDataByDataIds({           dataIds: allDataIds }),
          getLagDataByDataIds({              dataIds: allDataIds }),
          getCorrelationDataByDataIds({      dataIds: allDataIds }),
        ]);
        dataValues    = d.data.datas                  as DataRow[];
        weightValues  = w.data.weightDatas            as WeightRow[];
        lagValues     = l.data.lagDatas               as LagRow[];
        corValues     = r.data.correlationDatas       as CorrelationRow[];
      }

      // ── Step 5 — commit all slices to state ───────────────────────────────
      setActiveStoryDoc(storyDoc);
      setActiveAnalysisId(resolvedAnalysisId);
      setAllTrendMeta(trendMeta);
      setAllTrendDataValues(trendDataValues);
      setAllDataValues(dataValues);
      setAllWeightValues(weightValues);
      setAllLagValues(lagValues);
      setAllCorrelationValues(corValues);

      // Initialize activeViewState from the focal trend's domain.
      const focalMeta = trendMeta.find(t => t.trendId === storyDoc.trendId);
      const focalRows = focalMeta
        ? trendDataValues.filter(r => r.trendDataId === focalMeta.trendDataId)
        : trendDataValues;
      if (focalRows.length > 0) {
        const sorted   = [...focalRows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const dataStart = sorted[0].timestamp;
        const dataEnd   = sorted[sorted.length - 1].timestamp;
 
        // Domain extends past the last trend point by N increments. This is
        // session-only — no Postgres rows are created for the future window.
        // Click-to-add and the calc layer's interpolation honor this domain
        // when the user wants to drop forecast points past the trend's end.
        const frequency       = focalMeta?.frequency ?? "monthly";
        const futureCount     = FUTURE_INCREMENTS_BY_FREQUENCY[frequency.toLowerCase()] ?? 6;
        const domainEnd       = addIncrements(dataEnd, frequency, futureCount);
 
        setActiveViewStateInternal({
          zoomStart:   dataStart,
          zoomEnd:     domainEnd,    // initial zoom shows full domain including forecast window
          domainStart: dataStart,
          domainEnd:   domainEnd,
        });
      } else {
        // No rows at all — clear view state. Graph will fall back to its own autoscaling until rows arrive.
        setActiveViewStateInternal(null);
      }

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
  // In-session state patch for a newly-linked contributor. Writes to:
  //   1. activeStoryDoc.Contributors               — root roster (name, trendId)
  //   2. activeStoryDoc.Analysis[<each>].Contributors[newId].DataId
  //                                                 — one entry per analysis,
  //                                                   each with its own DataId
  //   3. allTrendMeta + allTrendDataValues         — fetches the new trend's
  //                                                   metadata and historical
  //                                                   data (if not already loaded)
  //   4. allWeightValues / allLagValues / allCorrelationValues
  //                                                 — appends the baseline rows
  //                                                   that linkContributor just
  //                                                   inserted into Postgres
  //
  // This function is PURE in-memory. It assumes Postgres + Firebase writes have
  // already completed successfully in linkContributor. It never fetches user
  // value rows — those are always preloaded by the caller.
  //
  const addContributor = useCallback(async (
    contributorId:        string,
    name:                 string,
    trendId:              string,
    dataIdByAnalysisId:   Record<string, string>,
    baselineRows: {
      weight:      WeightRow[];
      lag:         LagRow[];
      correlation: CorrelationRow[];
    },
  ) => {
    console.log(`[DataState] ▶ addContributor() — contributorId: ${contributorId}, trendId: ${trendId}, analyses: ${Object.keys(dataIdByAnalysisId).length}`);
 
    // 1 + 2. Patch activeStoryDoc — root map + every analysis entry
    setActiveStoryDoc(prev => {
      if (!prev) return prev;
 
      const nextAnalysis = { ...(prev.Analysis ?? {}) };
      for (const [aId, dataId] of Object.entries(dataIdByAnalysisId)) {
        const entry = nextAnalysis[aId];
        if (!entry) {
          // Defensive: if the analysis vanished between the Firebase write and
          // here (unlikely), skip it rather than creating a malformed entry.
          console.warn(`[DataState] addContributor — analysis ${aId} missing from activeStoryDoc, skipping`);
          continue;
        }
        nextAnalysis[aId] = {
          ...entry,
          Contributors: {
            ...(entry.Contributors ?? {}),
            [contributorId]: { DataId: dataId },
          },
        };
      }
 
      return {
        ...prev,
        Contributors: {
          ...prev.Contributors,
          [contributorId]: { Name: name, trendId },
        },
        Analysis: nextAnalysis,
      };
    });
 
    // 3. Resolve the new TrendId — fetch metadata and TrendData rows if we
    //    haven't seen this trend before in this session.
    let newTrendMeta: TrendRow | undefined;
    if (USE_MOCK) {
      newTrendMeta = (trendsJson as TrendRow[]).find(t => t.trendId === trendId);
    } else {
      const result = await getTrendsByIds({ ids: [trendId] });
      newTrendMeta = result.data.trends[0] as TrendRow | undefined;
    }
 
    if (newTrendMeta) {
      setAllTrendMeta(prev => {
        const exists = prev.some(t => t.trendId === trendId);
        return exists ? prev : [...prev, newTrendMeta!];
      });
 
      let newTrendDataRows: TrendDataRow[];
      if (USE_MOCK) {
        newTrendDataRows = (trendDataJson as TrendDataRow[]).filter(
          r => r.trendDataId === newTrendMeta!.trendDataId
        );
      } else {
        const result = await getTrendDataByTrendDataIds({ trendDataIds: [newTrendMeta.trendDataId] });
        newTrendDataRows = result.data.trendDatas as TrendDataRow[];
      }
 
      setAllTrendDataValues(prev => {
        const alreadyLoaded = prev.some(r => r.trendDataId === newTrendMeta!.trendDataId);
        return alreadyLoaded ? prev : [...prev, ...newTrendDataRows];
      });
      console.log(`[DataState] ✓ addContributor — TrendMeta + ${newTrendDataRows.length} TrendData rows patched`);
    } else {
      console.warn(`[DataState] ✗ addContributor — TrendId not found: ${trendId}`);
    }
 
    // 4. Append baseline rows (constructed by linkContributor, already
    //    persisted to Postgres). No fetch needed — we built these ourselves.
    //    allDataValues gets nothing: drag edits will create override rows
    //    on-demand.
    setAllWeightValues(prev       => [...prev, ...baselineRows.weight]);
    setAllLagValues(prev          => [...prev, ...baselineRows.lag]);
    setAllCorrelationValues(prev  => [...prev, ...baselineRows.correlation]);
 
    console.log(`[DataState] ✓ addContributor — baseline rows appended (weight: ${baselineRows.weight.length}, lag: ${baselineRows.lag.length}, correlation: ${baselineRows.correlation.length})`);
  }, []);

  // ── linkContributor ───────────────────────────────────────────────────────
  //
  // Public-facing action called from the Add Contributor modal. Handles every
  // persisted side-effect of adding a new contributor to the active story:
  //
  //   1. Generate a unique dataId per analysis (contributor data is per-
  //      analysis — each analysis is a different lens on the story).
  //   2. Compute the baseline timestamp (earliest point of the focal story
  //      trend — anchors the contributor's weight/lag/correlation at the
  //      start of the story's domain).
  //   3. Construct baseline rows:
  //        • weight:      value 1.0  (full contribution by default)
  //        • lag:         value 0    (no lag by default)
  //        • correlation: value 1.0  (positive correlation by default)
  //      No data rows — user creates overrides via drag on demand.
  //   4. Upsert all baseline rows to Postgres in parallel.
  //   5. Write to Firebase: root Contributors map + every analysis entry in
  //      one atomic updateDoc.
  //   6. Delegate in-session state patching to addContributor.
  //
  // Write order (Postgres → Firebase → memory) matters: if Firebase fails
  // mid-flow, we have orphan Postgres rows with no document referencing them,
  // which is recoverable via a future cleanup sweep. The reverse (Firebase
  // document referencing dataIds that have no rows) would silently break the
  // UI on reload.
  //
  const linkContributor = useCallback(async (
    name:    string,
    trendId: string,
  ) => {
    if (!activeStoryDoc) return;
 
    console.log(`[DataState] ▶ linkContributor() — name: ${name}, trendId: ${trendId}`);
 
    const contributorId = `contributor-${crypto.randomUUID().slice(0, 8)}`;
 
    // 1. Generate one dataId per analysis
    const analysisIds = Object.keys(activeStoryDoc.Analysis ?? {});
    if (analysisIds.length === 0) {
      console.warn(`[DataState] ✗ linkContributor — story has no analyses, aborting`);
      return;
    }
 
    const dataIdByAnalysisId: Record<string, string> = {};
    for (const aId of analysisIds) {
      dataIdByAnalysisId[aId] = `data-${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;
    }
 
    // 2. Baseline timestamp = earliest point of the focal story trend.
    //    Falls back to "now" if the focal trend has no data loaded (shouldn't
    //    happen in practice — initStory always loads it — but defensive).
    const focalTrend = allTrendMeta.find(t => t.trendId === activeStoryDoc.trendId);
    const focalTrendDataValues = focalTrend
      ? allTrendDataValues.filter(r => r.trendDataId === focalTrend.trendDataId)
      : [];
    const baselineTimestamp =
      focalTrendDataValues[0]?.timestamp ?? new Date().toISOString();
 
    // 3. Construct baseline rows — one per analysis per series type.
    //    Each row gets its own row-level UUID for Postgres's id PK.
    const weightRows: WeightRow[]         = [];
    const lagRows:    LagRow[]            = [];
    const corRows:    CorrelationRow[]    = [];
 
    for (const dataId of Object.values(dataIdByAnalysisId)) {
      weightRows.push({ dataId, timestamp: baselineTimestamp, value: 1.0 });
      lagRows.push   ({ dataId, timestamp: baselineTimestamp, value: 0   });
      corRows.push   ({ dataId, timestamp: baselineTimestamp, value: 1.0 });
    }
 
    // 4. Upsert to Postgres. In mock mode, skip — caller is testing UI state.
    if (!USE_MOCK) {
      const upsertFactories: (() => Promise<any>)[] = [];
      for (const dataId of Object.values(dataIdByAnalysisId)) {
        upsertFactories.push(
          () => upsertWeightData({      id: crypto.randomUUID(), dataId, timestamp: baselineTimestamp, value: 1.0 }),
          () => upsertLagData({         id: crypto.randomUUID(), dataId, timestamp: baselineTimestamp, value: 0   }),
          () => upsertCorrelationData({ id: crypto.randomUUID(), dataId, timestamp: baselineTimestamp, value: 1.0 }),
        );
      }
      await runInBatches(upsertFactories, 20);
      console.log(`[DataState] ✓ linkContributor — ${upsertFactories.length} baseline rows upserted to Postgres`);
    }
 
    // 5. Firebase: root Contributors map + every analysis in one write.
    const storyRef = doc(db, "stories", activeStoryDoc.id);
    const firebaseUpdates: Record<string, any> = {
      [`Contributors.${contributorId}`]: { Name: name, trendId },
    };
    for (const [aId, dataId] of Object.entries(dataIdByAnalysisId)) {
      firebaseUpdates[`Analysis.${aId}.Contributors.${contributorId}`] = { DataId: dataId };
    }
    await updateDoc(storyRef, firebaseUpdates);
    console.log(`[DataState] ✓ linkContributor — Firebase updated across ${analysisIds.length} analyses`);
 
    // 6. In-session patch.
    await addContributor(contributorId, name, trendId, dataIdByAnalysisId, {
      weight:      weightRows,
      lag:         lagRows,
      correlation: corRows,
    });
 
    console.log(`[DataState] ✓ linkContributor complete — contributorId: ${contributorId}`);
  }, [activeStoryDoc, allTrendMeta, allTrendDataValues, addContributor]);

  // ── unlinkContributor ─────────────────────────────────────────────────────
  //
  // Removes a contributor entirely:
  //   1. Collects all dataIds across every analysis (not just active)
  //   2. Deletes all Postgres value rows for those dataIds
  //   3. Removes from Firebase root map + every analysis in one atomic write
  //   4. Patches all in-session flat slices + activeStoryDoc
  //   5. Cleans up allTrendMeta if no remaining contributor shares the trendId
  //
  const unlinkContributor = useCallback(async (
    contributorId: string,
  ) => {
    if (!activeStoryDoc) return;
 
    console.log(`[DataState] ▶ unlinkContributor() — contributorId: ${contributorId}`);
 
    // 1. Collect ALL dataIds for this contributor across every analysis
    const allDataIds = Object.values(activeStoryDoc.Analysis ?? {})
      .map((entry: any) => entry?.Contributors?.[contributorId]?.DataId)
      .filter(Boolean) as string[];
 
    console.log(`[DataState] ✓ unlinkContributor — ${allDataIds.length} dataIds to clean up`);
 
    // 2. Delete all Postgres value rows in parallel
    if (!USE_MOCK) {
      await Promise.all(allDataIds.flatMap(dataId => [
        deleteDataByDataId({            dataId }),
        deleteWeightDataByDataId({      dataId }),
        deleteLagDataByDataId({         dataId }),
        deleteCorrelationDataByDataId({ dataId }),
      ]));
    }
 
    // 3. Remove from Firebase — root map + every analysis in one atomic write
    const storyRef = doc(db, "stories", activeStoryDoc.id);
    const firebaseUpdates: Record<string, any> = {
      [`Contributors.${contributorId}`]: deleteField(),
    };
    for (const analysisId of Object.keys(activeStoryDoc.Analysis ?? {})) {
      firebaseUpdates[`Analysis.${analysisId}.Contributors.${contributorId}`] = deleteField();
    }
    await updateDoc(storyRef, firebaseUpdates);
 
    // 4. Patch activeStoryDoc in-session
    const removedTrendId = (activeStoryDoc.Contributors?.[contributorId] as any)?.trendId;
 
    setActiveStoryDoc(prev => {
      if (!prev) return prev;
      const nextContributors = { ...prev.Contributors };
      delete nextContributors[contributorId];
      const nextAnalysis = Object.fromEntries(
        Object.entries(prev.Analysis ?? {}).map(([aId, entry]: [string, any]) => {
          const nextContribs = { ...(entry.Contributors ?? {}) };
          delete nextContribs[contributorId];
          return [aId, { ...entry, Contributors: nextContribs }];
        })
      );
      return { ...prev, Contributors: nextContributors, Analysis: nextAnalysis };
    });
 
    // 4b. Remove value rows from all flat slices
    const dataIdSet = new Set(allDataIds);
    setAllDataValues(prev        => prev.filter(r => !dataIdSet.has(r.dataId)));
    setAllWeightValues(prev      => prev.filter(r => !dataIdSet.has(r.dataId)));
    setAllLagValues(prev         => prev.filter(r => !dataIdSet.has(r.dataId)));
    setAllCorrelationValues(prev => prev.filter(r => !dataIdSet.has(r.dataId)));
 
    // 5. Clean up allTrendMeta + TrendData if no remaining contributor uses this trendId
    if (removedTrendId) {
      const stillUsed = Object.entries(activeStoryDoc.Contributors ?? {})
        .some(([cId, c]: [string, any]) => cId !== contributorId && c.trendId === removedTrendId);
      if (!stillUsed) {
        const staleMeta = allTrendMeta.find(t => t.trendId === removedTrendId);
        setAllTrendMeta(prev       => prev.filter(t => t.trendId !== removedTrendId));
        setAllTrendDataValues(prev => prev.filter(r => r.trendDataId !== staleMeta?.trendDataId));
      }
    }
 
    console.log(`[DataState] ✓ unlinkContributor complete — contributorId: ${contributorId}`);
  }, [activeStoryDoc, allTrendMeta]);

  // ── createAnalysis ────────────────────────────────────────────────────────
  //
  // Creates a new analysis on the active story. Two paths share most of the
  // shape — they differ only in what gets written to Postgres for each
  // contributor's value rows:
  //
  //   • Copy path (baseAnalysisId given):
  //       Read all existing rows under each source contributor's dataId and
  //       upsert them under the new dataIds. Preserves the source's edit
  //       history and weight/lag/correlation curves.
  //
  //   • Scratch path (baseAnalysisId omitted):
  //       Insert baseline rows only — one weight (1.0), lag (0), correlation
  //       (1.0) per contributor at the focal trend's start timestamp. Same
  //       defaults as linkContributor.
  //
  // Both paths iterate the ROOT Contributors map (the canonical roster), not
  // a specific analysis's contributor list. This is self-healing: if drift
  // ever exists between the root map and an analysis entry, every contributor
  // in the root still gets a dataId in the new analysis. Contributors missing
  // from the source analysis but present in the root receive baseline rows
  // instead of copied rows.
  //
  // After Firebase + Postgres writes complete, initStory is called to reload
  // session state with the new analysis as active. User experience: brief
  // loading flash, then they're looking at the new analysis.
  //
  // Known optimization point — the copy path fans out one upsert per row in
  // parallel. For analyses with thousands of rows this can be slow on the
  // network. Server-side INSERT...SELECT mutations would compress this to one
  // round trip per series. Not worth the added schema complexity until users
  // actually accumulate enough edit history to feel it.
  //
  const createAnalysis = useCallback(async (params: {
    name:            string;
    baseAnalysisId?: string;
  }): Promise<{ analysisId: string }> => {
    if (!activeStoryDoc) {
      throw new Error("[createAnalysis] no active story");
    }
 
    const { name, baseAnalysisId } = params;
    const isCopy = !!baseAnalysisId;
 
    console.log(`[DataState] ▶ createAnalysis() — name: "${name}", base: ${baseAnalysisId ?? "(scratch)"}`);
 
    // 1. Generate ids
    const newAnalysisId  = `analysis-${crypto.randomUUID().slice(0, 8)}`;
    const newStoryDataId = `data-${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;
 
    // 2. Build the contributor → newDataId map by iterating the root roster
    const contributorIds = Object.keys(activeStoryDoc.Contributors ?? {});
    const newDataIdByContributorId: Record<string, string> = {};
    for (const cId of contributorIds) {
      newDataIdByContributorId[cId] = `data-${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;
    }
 
    // 3. Resolve the source analysis (copy path only) and figure out which
    //    contributors actually have source rows to copy. Anyone missing falls
    //    back to baseline rows, just like the scratch path.
    const sourceEntry  = isCopy ? activeStoryDoc.Analysis?.[baseAnalysisId!] : undefined;
    const sourceStoryDataId = sourceEntry?.Story?.DataId;
    const sourceDataIdByContributorId: Record<string, string> = {};
    if (isCopy && sourceEntry) {
      for (const cId of contributorIds) {
        const sourceDataId = sourceEntry.Contributors?.[cId]?.DataId;
        if (sourceDataId) sourceDataIdByContributorId[cId] = sourceDataId;
      }
    }
 
    // 4. Compute baseline timestamp for any contributor that needs baseline
    //    rows (scratch path entirely, or copy path where a contributor is
    //    missing from the source analysis). Same logic as linkContributor.
    const focalTrend = allTrendMeta.find(t => t.trendId === activeStoryDoc.trendId);
    const focalTrendDataValues = focalTrend
      ? allTrendDataValues.filter(r => r.trendDataId === focalTrend.trendDataId)
      : [];
    const baselineTimestamp =
      focalTrendDataValues[0]?.timestamp ?? new Date().toISOString();
 
    // 5. Postgres writes — split contributors into "copy from source" and
    //    "baseline only" buckets, then write each bucket appropriately.
    if (!USE_MOCK) {
      const upsertFactories: (() => Promise<any>)[] = [];
 
      // 5a. Copy path: for each contributor with a source dataId, fetch all
      //     four series' rows and re-upsert them under the new dataId.
      const contribsToCopy   = contributorIds.filter(cId =>  sourceDataIdByContributorId[cId]);
      const contribsBaseline = contributorIds.filter(cId => !sourceDataIdByContributorId[cId]);
 
      if (contribsToCopy.length > 0) {
        const sourceDataIds = contribsToCopy.map(cId => sourceDataIdByContributorId[cId]);
        const [d, w, l, c] = await Promise.all([
          getDataByDataIds({            dataIds: sourceDataIds }),
          getWeightDataByDataIds({      dataIds: sourceDataIds }),
          getLagDataByDataIds({         dataIds: sourceDataIds }),
          getCorrelationDataByDataIds({ dataIds: sourceDataIds }),
        ]);
 
        // Build a lookup: source dataId → new dataId, for fast remapping.
        const sourceToNew = new Map<string, string>();
        for (const cId of contribsToCopy) {
          sourceToNew.set(sourceDataIdByContributorId[cId], newDataIdByContributorId[cId]);
        }
 
        for (const row of (d.data.datas as DataRow[])) {
          upsertFactories.push(() => upsertData({
            id: crypto.randomUUID(), dataId: sourceToNew.get(row.dataId)!,
            timestamp: row.timestamp, value: row.value,
          }));
        }
        for (const row of (w.data.weightDatas as WeightRow[])) {
          upsertFactories.push(() => upsertWeightData({
            id: crypto.randomUUID(), dataId: sourceToNew.get(row.dataId)!,
            timestamp: row.timestamp, value: row.value,
          }));
        }
        for (const row of (l.data.lagDatas as LagRow[])) {
          upsertFactories.push(() => upsertLagData({
            id: crypto.randomUUID(), dataId: sourceToNew.get(row.dataId)!,
            timestamp: row.timestamp, value: row.value,
          }));
        }
        for (const row of (c.data.correlationDatas as CorrelationRow[])) {
          upsertFactories.push(() => upsertCorrelationData({
            id: crypto.randomUUID(), dataId: sourceToNew.get(row.dataId)!,
            timestamp: row.timestamp, value: row.value,
          }));
        }
        console.log(`[DataState] ✓ createAnalysis — queued ${upsertFactories.length} copy upserts for ${contribsToCopy.length} contributors`);
      }
 
      // 5b. Baseline path: for each contributor missing source rows (or all
      //     contributors in the scratch path), insert the three baseline rows.
      for (const cId of contribsBaseline) {
        const newDataId = newDataIdByContributorId[cId];
        upsertFactories.push(
          () => upsertWeightData({      id: crypto.randomUUID(), dataId: newDataId, timestamp: baselineTimestamp, value: 1.0 }),
          () => upsertLagData({         id: crypto.randomUUID(), dataId: newDataId, timestamp: baselineTimestamp, value: 0   }),
          () => upsertCorrelationData({ id: crypto.randomUUID(), dataId: newDataId, timestamp: baselineTimestamp, value: 1.0 }),
        );
      }
      if (contribsBaseline.length > 0) {
        console.log(`[DataState] ✓ createAnalysis — queued baseline rows for ${contribsBaseline.length} contributors`);
      }
 
      // 5c. Story dataId — copy any rows that exist under the source story
      //     dataId. Scratch path writes nothing here; calc layer fills it on
      //     save. Copy path preserves whatever calc result the source had.
      if (isCopy && sourceStoryDataId) {
        const result = await getDataByDataIds({ dataIds: [sourceStoryDataId] });
        for (const row of (result.data.datas as DataRow[])) {
          upsertFactories.push(() => upsertData({
            id: crypto.randomUUID(), dataId: newStoryDataId,
            timestamp: row.timestamp, value: row.value,
          }));
        }
        console.log(`[DataState] ✓ createAnalysis — queued story dataId copy (${result.data.datas.length} rows)`);
      }
 
      await runInBatches(upsertFactories, 20)
      console.log(`[DataState] ✓ createAnalysis — ${upsertFactories.length} total Postgres writes complete`);
    }
 
    // 6. Build the new Analysis entry and write to Firebase
    const newContributorsMap: Record<string, { DataId: string }> = {};
    for (const cId of contributorIds) {
      newContributorsMap[cId] = { DataId: newDataIdByContributorId[cId] };
    }
 
    const storyRef = doc(db, "stories", activeStoryDoc.id);
    await updateDoc(storyRef, {
      [`Analysis.${newAnalysisId}`]: {
        Name: name,
        Story: { DataId: newStoryDataId },
        Contributors: newContributorsMap,
      },
    });
    console.log(`[DataState] ✓ createAnalysis — Firebase analysis entry written (${newAnalysisId})`);
 
    // 7. Reload session state with the new analysis as active. initStory
    //    re-fetches everything including the rows we just wrote, so we don't
    //    need to surgically patch flat slices here.
    await initStory(activeStoryDoc.id, null, newAnalysisId);
 
    console.log(`[DataState] ✓ createAnalysis complete — analysisId: ${newAnalysisId}`);
    return { analysisId: newAnalysisId };
  }, [activeStoryDoc, allTrendMeta, allTrendDataValues, initStory]);

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
      const meta = allTrendMeta.find(t => t.trendId === trendId) ?? null;
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
        correlationValues:      allCorrelationValues.filter(v => v.dataId === dataId),
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
    const calculatedDataValues = calculateStoryValues(storyTrendDataValues, contributors, storyMeta?.frequency ?? "monthly",);

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
    allCorrelationValues,
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
      allCorrelationValues,
      setAllDataValues,
      setAllWeightValues,
      setAllLagValues,
      setAllCorrelationValues,
      assembledStory,
      initStory,
      addContributor,
      linkContributor,
      unlinkContributor,
      createAnalysis,
      activeViewState,
      setActiveViewState,
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
      allCorrelationValues,
      assembledStory,
      initStory,
      addContributor,
      linkContributor,
      unlinkContributor,
      createAnalysis,
      activeViewState,
      setActiveViewState,
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