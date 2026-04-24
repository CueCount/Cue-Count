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
  deleteDataByDataId,
  deleteWeightDataByDataId,
  deleteLagDataByDataId,
  deleteCorrelationDataByDataId,
} from "@/src/dataconnect-generated";

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
    dataId: string
  ) => Promise<void>;

  linkContributor: (
    name: string,
    trendId: string,
  ) => Promise<void>;

  unlinkContributor: (
    contributorId: string,
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
      setActiveAnalysisId(analysisId);
      setAllTrendMeta(trendMeta);
      setAllTrendDataValues(trendDataValues);
      setAllDataValues(dataValues);
      setAllWeightValues(weightValues);
      setAllLagValues(lagValues);
      setAllCorrelationValues(corValues);

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

    // c. Append user value rows for the new dataId
    let newDataValues:    DataRow[];
    let newWeightValues:  WeightRow[];
    let newLagValues:     LagRow[];
    let newCorValues:     CorrelationRow[];

    if (USE_MOCK) {
      newDataValues    = (dataJson            as DataRow[])            .filter(r => r.dataId === dataId);
      newWeightValues  = (weightDataJson      as WeightRow[])          .filter(r => r.dataId === dataId);
      newLagValues     = (lagDataJson         as LagRow[])             .filter(r => r.dataId === dataId);
      newCorValues     = (correlationDataJson as CorrelationRow[])     .filter(r => r.dataId === dataId);
    } else {
      const [d, w, l, r] = await Promise.all([
        getDataByDataIds({                 dataIds: [dataId] }),
        getWeightDataByDataIds({           dataIds: [dataId] }),
        getLagDataByDataIds({              dataIds: [dataId] }),
        getCorrelationDataByDataIds({      dataIds: [dataId] }),
      ]);
      newDataValues    = d.data.datas                  as DataRow[];
      newWeightValues  = w.data.weightDatas            as WeightRow[];
      newLagValues     = l.data.lagDatas               as LagRow[];
      newCorValues     = r.data.correlationDatas       as CorrelationRow[];
    }

    setAllDataValues(prev => {
      const existingKeys = new Set(prev.map(r => `${r.dataId}|${r.timestamp}`));
      const fresh = newDataValues.filter(r => !existingKeys.has(`${r.dataId}|${r.timestamp}`));
      return [...prev, ...fresh];
    });
    setAllWeightValues(prev       => [...prev, ...newWeightValues]);
    setAllLagValues(prev          => [...prev, ...newLagValues]);
    setAllCorrelationValues(prev  => [...prev, ...newCorValues]);

    console.log(`[DataState] ✓ addContributor — value rows patched for dataId: ${dataId}`);
  }, []);

  // ── linkContributor ───────────────────────────────────────────────────────
  //
  // Public-facing action called from the Add Contributor modal.
  // Generates IDs, persists to Firebase, then delegates state patching
  // to addContributor (which is also used by initStory).
  //
  const linkContributor = useCallback(async (
    name: string,
    trendId: string,
  ) => {
    if (!activeStoryDoc) return;

    const contributorId = `contributor-${crypto.randomUUID().slice(0, 8)}`;
    const dataId        = `data-${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;

    console.log(`[DataState] ▶ linkContributor() — name: ${name}, trendId: ${trendId}`);

    // Persist to Firebase — root Contributors map + RootAnalysis in one write
    const storyRef = doc(db, "stories", activeStoryDoc.id);
    await updateDoc(storyRef, {
      [`Contributors.${contributorId}`]: { Name: name, trendId },
      [`Analysis.RootAnalysis.Contributors.${contributorId}`]: { DataId: dataId },
    });

    // Delegate all state patching to addContributor
    await addContributor(contributorId, name, trendId, dataId);

    console.log(`[DataState] ✓ linkContributor complete — contributorId: ${contributorId}, dataId: ${dataId}`);
  }, [activeStoryDoc, addContributor]);

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
      const stillUsed = Object.values(activeStoryDoc.Contributors ?? {})
        .some((c: any) => c.trendId === removedTrendId && c !== activeStoryDoc.Contributors[contributorId]);
      if (!stillUsed) {
        const staleMeta = allTrendMeta.find(t => t.trendId === removedTrendId);
        setAllTrendMeta(prev       => prev.filter(t => t.trendId !== removedTrendId));
        setAllTrendDataValues(prev => prev.filter(r => r.trendDataId !== staleMeta?.trendDataId));
      }
    }

    console.log(`[DataState] ✓ unlinkContributor complete — contributorId: ${contributorId}`);
  }, [activeStoryDoc, allTrendMeta]);

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