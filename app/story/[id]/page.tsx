"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { DataProvider, useData } from "@/contexts/DataState";
import StorySidebar from "@/components/StorySidebar";
import StoryGraph from "@/components/StoryGraph";

export type ActiveEditSeries = "merged" | "weight" | "lag" | "relationship" | "relationshipType";

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
  activeView:            "story" | "contributor" | "analysis";

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
  shownRelationshipIds:  Set<string>;

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
  onToggleContributor:   (id: string) => void;
  onToggleWeight:        (id: string) => void;
  onToggleLag:           (id: string) => void;
  onToggleRelationship:  (id: string) => void;
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
  const [shownRelationshipIds, setShownRelationshipIds] = useState<Set<string>>(new Set());
  const [shownAnalysisIds,     setShownAnalysisIds]     = useState<Set<string>>(new Set());
  const [activeContributorId,  setActiveContributorId]  = useState<string | null>(null);
  const [activeEditSeries, setActiveEditSeries] = useState<ActiveEditSeries>("merged");
  const [isDirty,          setIsDirty]          = useState(false);

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
    setShownContributorIds(
      contributorIds
        ? new Set(contributorIds)
        : new Set(assembledStory.contributors.map((c) => c.id))
    );
    setShownWeightIds(new Set());
    setShownLagIds(new Set());
    setShownRelationshipIds(new Set());
  }, [assembledStory]);

  // ── relationshipView ───────────────────────────────────────────────────────
  // Story lines stay on. Shows only the selected contributor pair + their
  // metrics defaulted to shown.
  const onRelationshipView = useCallback((contributorId: string) => {
    if (!assembledStory) return;
    setActiveView("contributor");
    setShownStoryTrend(true);
    setShownStoryAnalysis(true);
    setShownContributorIds(new Set([contributorId]));
    setActiveContributorId(contributorId);
    setActiveEditSeries("merged");

    const c = assembledStory.contributors.find((c) => c.id === contributorId);
    if (c) {
      setShownWeightIds(      new Set(c.weightValues.map((w) => w.id)));
      setShownLagIds(         new Set(c.lagValues.map((l) => l.id)));
      setShownRelationshipIds(new Set(c.relationshipValues.map((r) => r.id)));
    }
  }, [assembledStory]);

  // ── analysisView ───────────────────────────────────────────────────────────
  // Story trend shown as base. All analysis entries shown by default.
  // Contributor and metric toggles cleared.
  const onAnalysisView = useCallback(() => {
    setActiveView("analysis");
    setShownStoryTrend(true);
    setShownStoryAnalysis(false);
    setShownContributorIds(new Set());
    setShownWeightIds(new Set());
    setShownLagIds(new Set());
    setShownRelationshipIds(new Set());
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

  const onToggleStoryTrend    = useCallback(() => setShownStoryTrend(v => !v),    []);
  const onSelectEditSeries = useCallback((s: ActiveEditSeries) => setActiveEditSeries(s), []);
  const onPointEdited      = useCallback(() => setIsDirty(true), []);
  const onSave             = useCallback(() => { /* TODO: persist */ setIsDirty(false); }, []);
  const onSaveAsNew        = useCallback(() => { /* TODO: create new analysis */ }, []);
  const onToggleStoryAnalysis = useCallback(() => setShownStoryAnalysis(v => !v), []);
  const onToggleContributor   = useCallback(makeToggle(setShownContributorIds),   []);
  const onToggleWeight        = useCallback(makeToggle(setShownWeightIds),        []);
  const onToggleLag           = useCallback(makeToggle(setShownLagIds),           []);
  const onToggleRelationship  = useCallback(makeToggle(setShownRelationshipIds),  []);
  const onToggleAnalysis      = useCallback(makeToggle(setShownAnalysisIds),      []);

  // ── View state bundle ──────────────────────────────────────────────────────
  const viewState: StoryViewState = {
    activeView,
    shownStoryTrend,
    shownStoryAnalysis,
    shownContributorIds,
    shownWeightIds,
    shownLagIds,
    shownRelationshipIds,
    shownAnalysisIds,
    activeContributorId,
    activeEditSeries,
    isDirty,
    onStoryView,
    onRelationshipView,
    onAnalysisView,
    onToggleStoryTrend,
    onSelectEditSeries,
    onPointEdited,
    onSave,
    onSaveAsNew,
    onToggleStoryAnalysis,
    onToggleContributor,
    onToggleWeight,
    onToggleLag,
    onToggleRelationship,
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