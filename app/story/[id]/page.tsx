"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { DataProvider, useData } from "@/contexts/DataState";
import StorySidebar from "@/components/StorySidebar";
import StoryGraph from "@/components/StoryGraph";

export type ActiveEditSeries = "merged" | "weight" | "lag" | "correlation" ;

// ─────────────────────────────────────────────────────────────────────────────
// StoryViewState
//
// Passed as props to both StorySidebar and StoryGraph.
// Neither child owns any visibility state — they only read and call back up.
//
// Story visibility is split into two independent booleans:
//   shownStoryTrend    — the shared TrendData baseline line
//   shownStoryAnalysis — the analysis DataValues overlay line
//
// Contributor visibility is a single Set<string>: one toggle per contributor
// controls the whole pair (TrendData + analysis DataValues overlay).
//
// ─────────────────────────────────────────────────────────────────────────────

export type StoryViewState = {
  activeView: "story" | "contributor" | "analysis";

  // ── Story toggles (independent) ───────────────────────────────────────────
  shownStoryTrend:       boolean;   // TrendData baseline
  shownStoryAnalysis:    boolean;   // Analysis DataValues overlay

  // ── Contributor toggles (whole pair per contributor) ──────────────────────
  shownContributorIds:   Set<string>;

  // ── Active contributor (panel identity, independent of graph visibility) ──
  activeContributorId:   string | null;

  // ── Metric toggles (contributor view only) ────────────────────────────────
  shownWeightIds:        Set<string>;
  shownLagIds:           Set<string>;
  shownCorrelationIds:  Set<string>;
  shownContributorTrendIds: Set<string>;

  // ── Analysis view toggles ─────────────────────────────────────────────────
  shownAnalysisIds:      Set<string>;

  // ── Edit state ───────────────────────────────────────────────────────────
  activeEditSeries:    ActiveEditSeries;
  isDirty:             boolean;
  onSelectEditSeries:  (series: ActiveEditSeries) => void;
  onPointEdited:       () => void;
  onSave:              () => void;
  onSaveAsNew:         () => void;

  // ── View transitions ──────────────────────────────────────────────────────
  onStoryView:           (contributorIds?: string[]) => void;
  onRelationshipView:    (contributorId: string) => void;
  onAnalysisView:        () => void;

  // ── Toggles ───────────────────────────────────────────────────────────────
  onToggleStoryTrend:    () => void;
  onToggleStoryAnalysis: () => void;
  onToggleContributorTrend: (id: string) => void;
  onToggleContributor:   (id: string) => void;
  onToggleWeight:        (id: string) => void;
  onToggleLag:           (id: string) => void;
  onToggleCorrelation:   (id: string) => void;
  onToggleAnalysis:      (id: string) => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// StoryPageInner
// ─────────────────────────────────────────────────────────────────────────────

function StoryPageInner({ storyId }: { storyId: string }) {
  const { initStory, assembledStory, activeStoryDoc } = useData();

  // ── View ───────────────────────────────────────────────────────────────────
  const [activeView,           setActiveView]           = useState<"story" | "contributor" | "analysis">("story");

  // ── Story toggles ──────────────────────────────────────────────────────────
  const [shownStoryTrend,      setShownStoryTrend]      = useState(true);
  const [shownStoryAnalysis,   setShownStoryAnalysis]   = useState(true);

  // ── Contributor + metric toggles ───────────────────────────────────────────
  const [shownContributorIds,  setShownContributorIds]  = useState<Set<string>>(new Set());
  const [shownWeightIds,       setShownWeightIds]       = useState<Set<string>>(new Set());
  const [shownLagIds,          setShownLagIds]          = useState<Set<string>>(new Set());
  const [shownCorrelationIds,  setShownCorrelationIds]  = useState<Set<string>>(new Set());
  const [shownContributorTrendIds, setShownContributorTrendIds] = useState<Set<string>>(new Set());
  const [shownAnalysisIds,     setShownAnalysisIds]     = useState<Set<string>>(new Set());
  const [activeContributorId,  setActiveContributorId]  = useState<string | null>(null);
  const [activeEditSeries,     setActiveEditSeries]     = useState<ActiveEditSeries>("merged");
  const [isDirty,              setIsDirty]              = useState(false);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (storyId) initStory(storyId);
  }, [storyId]);

  useEffect(() => {
    if (assembledStory) onStoryView();
  }, [assembledStory?.id]);

  // ── storyView ──────────────────────────────────────────────────────────────
  // Resets to default story view: both story lines shown, all contributors
  // shown, metrics cleared.
  const onStoryView = useCallback((contributorIds?: string[]) => {
    if (!assembledStory) return;
    setActiveView("story");
    setShownStoryTrend(true);
    setShownStoryAnalysis(true);
    setShownContributorTrendIds(new Set());
    setShownContributorIds(
      contributorIds
        ? new Set(contributorIds)
        : new Set(assembledStory.contributors.map((c) => c.id))
    );
    setShownWeightIds(new Set());
    setShownLagIds(new Set());
    setShownCorrelationIds(new Set());
  }, [assembledStory]);

  // ── relationshipView ───────────────────────────────────────────────────────
  // Story lines stay on. Shows only the selected contributor pair + their
  // metrics defaulted to shown.
  const onRelationshipView = useCallback((contributorId: string) => {
    if (!assembledStory) return;
    setActiveView("contributor");
    setShownStoryTrend(true);
    setShownStoryAnalysis(true);
    setShownContributorTrendIds(new Set([contributorId]));
    setShownContributorIds(new Set([contributorId]));
    setActiveContributorId(contributorId);
    setActiveEditSeries("merged");

    const c = assembledStory.contributors.find((c) => c.id === contributorId);
    if (c) {
      setShownWeightIds(      new Set(c.weightValues.length > 0      ? [c.dataId] : []));
      setShownLagIds(         new Set(c.lagValues.length > 0         ? [c.dataId] : []));
      setShownCorrelationIds( new Set(c.correlationValues.length > 0 ? [c.dataId] : []));

      // ── temporary debug ──
      console.log("[debug] contributorId:", contributorId);
      console.log("[debug] dataId:", c.dataId);
      console.log("[debug] weightValues.length:", c.weightValues.length);
      console.log("[debug] lagValues.length:", c.lagValues.length);
      console.log("[debug] correlationValues.length:", c.correlationValues.length);
    }
  }, [assembledStory]);

  // ── analysisView ───────────────────────────────────────────────────────────
  // Story trend shown as base. All analysis entries shown by default.
  // Contributor and metric toggles cleared.
  const onAnalysisView = useCallback(() => {
    setActiveView("analysis");
    setShownStoryTrend(true);
    setShownStoryAnalysis(false);
    setShownContributorTrendIds(new Set());
    setShownContributorIds(new Set());
    setShownWeightIds(new Set());
    setShownLagIds(new Set());
    setShownCorrelationIds(new Set());
    setShownAnalysisIds(
      new Set(Object.keys(activeStoryDoc?.Analysis ?? {}))
    );
  }, [activeStoryDoc]);

  // ── Granular toggles ───────────────────────────────────────────────────────
  const makeToggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (id: string) => setter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const onToggleStoryTrend      = useCallback(() => setShownStoryTrend(v => !v),    []);
  const onSelectEditSeries      = useCallback((s: ActiveEditSeries) => setActiveEditSeries(s), []);
  const onPointEdited           = useCallback(() => setIsDirty(true), []);
  const onSave                  = useCallback(() => { /* TODO: persist */ setIsDirty(false); }, []);
  const onSaveAsNew             = useCallback(() => { /* TODO: create new analysis */ }, []);
  const onToggleStoryAnalysis    = useCallback(() => setShownStoryAnalysis(v => !v), []);
  const onToggleContributorTrend = useCallback(makeToggle(setShownContributorTrendIds), []);
  const onToggleContributor     = useCallback(makeToggle(setShownContributorIds),   []);
  const onToggleWeight          = useCallback(makeToggle(setShownWeightIds),        []);
  const onToggleLag             = useCallback(makeToggle(setShownLagIds),           []);
  const onToggleCorrelation     = useCallback(makeToggle(setShownCorrelationIds),  []);
  const onToggleAnalysis        = useCallback(makeToggle(setShownAnalysisIds),      []);

  // ── View state bundle ──────────────────────────────────────────────────────
  const viewState: StoryViewState = {
    activeView,
    shownStoryTrend,
    shownStoryAnalysis,
    shownContributorIds,
    shownWeightIds,
    shownLagIds,
    shownCorrelationIds,
    shownAnalysisIds,
    activeContributorId,
    activeEditSeries,
    isDirty,
    shownContributorTrendIds,
    onStoryView,
    onRelationshipView,
    onAnalysisView,
    onToggleStoryTrend,
    onSelectEditSeries,
    onPointEdited,
    onSave,
    onSaveAsNew,
    onToggleStoryAnalysis,
    onToggleContributorTrend,
    onToggleContributor,
    onToggleWeight,
    onToggleLag,
    onToggleCorrelation,
    onToggleAnalysis,
  };

  return (
    <div className="flex min-h-screen w-full">
      <aside className="w-96 shrink-0 px-5 py-6 overflow-y-auto">
        <StorySidebar viewState={viewState} />
      </aside>
      <main className="flex-1 overflow-hidden">
        <StoryGraph viewState={viewState} />
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StoryPage — outer shell, mounts DataProvider only
// ─────────────────────────────────────────────────────────────────────────────

export default function StoryPage() {
  const params  = useParams();
  const storyId = params.id as string;

  return (
    <DataProvider>
      <StoryPageInner storyId={storyId} />
    </DataProvider>
  );
}