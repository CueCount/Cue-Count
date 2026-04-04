"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useData } from "@/contexts/DataState";
import type { WeightRow, WeightValueRow, LagRow, RelationshipRow } from "@/types/db";

// ─────────────────────────────────────────────────────────────────────────────
// Mental model
//
// Everything DataState provides is hidden by default.
// UIState explicitly declares what is shown for each view via shown sets.
// Activators build the initial shown sets from DataState on every call.
// User toggles add or remove from those sets — everything else stays hidden.
//
// shownStoryIds is a mixed set of [rootStoryId, ...contributorIds] — the root
// story and contributors share this set because both render as trend lines.
//
// Analyses are shown/hidden independently in AnalysisView — the user can
// toggle individual analysis overlay lines regardless of which is "active".
//
// Contributor metric series (weights, lags, relationships) have their own
// shown sets in ContributorView, keyed by their header row IDs.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Per-view state shapes
// ─────────────────────────────────────────────────────────────────────────────

type StoryViewState = {
  // rootStoryId + top N contributor IDs by latest weight.
  shownStoryIds: Set<string>;
};

type AnalysisViewState = {
  // Which analysis is being viewed. null = base state.
  analysisId: string | null;
  // Contributor trend lines to show in this view.
  shownStoryIds: Set<string>;
  // Which analysis overlay lines to show on the chart.
  shownAnalysisIds: Set<string>;
};

type ContributorViewState = {
  // The contributor this view was opened for.
  contributorId: string;
  // Root story + this contributor's trend line.
  shownStoryIds: Set<string>;
  // Header row IDs for the metric series shown as chart lines.
  // These are WeightRow / LagRow / RelationshipRow IDs — one per series.
  shownWeightIds: Set<string>;
  shownLagIds: Set<string>;
  shownRelationshipIds: Set<string>;
};

// ─────────────────────────────────────────────────────────────────────────────
// UIState shape
// ─────────────────────────────────────────────────────────────────────────────

type UIState = {
  activeView: "story" | "analysis" | "contributor";

  storyView: StoryViewState;
  analysisView: AnalysisViewState;
  contributorView: ContributorViewState | null;

  // Activators — always built fresh from DataState. No prior state restored.
  activateStoryView: () => void;
  activateAnalysisView: (analysisId?: string | null) => void;
  activateContributorView: (contributorId: string) => void;

  // Trend line visibility — writes to the active view's shownStoryIds only.
  toggleStoryVisibility: (storyId: string) => void;
  isStoryShown: (storyId: string) => boolean;

  // Analysis overlay visibility — scoped to analysisView only.
  toggleAnalysisVisibility: (analysisId: string) => void;
  isAnalysisShown: (analysisId: string) => boolean;

  // Contributor metric series visibility — scoped to contributorView only.
  // Each toggle operates on its own shown set. No-op if contributorView is null.
  toggleWeightVisibility: (weightId: string) => void;
  toggleLagVisibility: (lagId: string) => void;
  toggleRelationshipVisibility: (relationshipId: string) => void;
  isWeightShown: (weightId: string) => boolean;
  isLagShown: (lagId: string) => boolean;
  isRelationshipShown: (relationshipId: string) => boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Returns the latest base weight value for a contributor.
// Used to rank contributors for Story View's default shown set.
// Reads from WeightRow headers (filtered to base, analysisId = null) then
// finds the most recent data point across their WeightValueRows.
function getLatestWeightValue(
  contributorId: string,
  allWeights: WeightRow[],
  allWeightValues: WeightValueRow[]
): number {
  const baseHeaders = allWeights.filter(
    (w) => w.contributorId === contributorId && w.analysisId === null
  );
  const headerIds = new Set(baseHeaders.map((w) => w.id));
  const values = allWeightValues.filter((v) => headerIds.has(v.weightId));
  if (values.length === 0) return 0;
  return [...values].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0].value;
}

// Generic toggle for any Set<string>.
function toggleId(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const UIContext = createContext<UIState | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function UIProvider({ children }: { children: React.ReactNode }) {
  const {
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
  } = useData();

  // ── Per-view state ──────────────────────────────────────────────────────────

  const [activeView, setActiveView] = useState<"story" | "analysis" | "contributor">("story");

  const [storyView, setStoryView] = useState<StoryViewState>({
    shownStoryIds: new Set(),
  });

  const [analysisView, setAnalysisView] = useState<AnalysisViewState>({
    analysisId: null,
    shownStoryIds: new Set(),
    shownAnalysisIds: new Set(),
  });

  const [contributorView, setContributorView] = useState<ContributorViewState | null>(null);

  // ── activateStoryView ───────────────────────────────────────────────────────
  //
  // Shown: root focal story + top 5 contributors ranked by latest base weight.
  // Everything else starts hidden. Called once on page load by page.tsx.
  const activateStoryView = useCallback(() => {
    if (!rootStoryId) return;

    const ranked = [...allContributors]
      .filter((c) => c.focalStoryId === rootStoryId)
      .sort(
        (a, b) =>
          getLatestWeightValue(b.id, allWeights, allWeightValues) -
          getLatestWeightValue(a.id, allWeights, allWeightValues)
      );

    const shownStoryIds = new Set<string>([
      rootStoryId,
      ...ranked.slice(0, 5).map((c) => c.id),
    ]);

    setStoryView({ shownStoryIds });
    setContributorView(null);
    setActiveView("story");
  }, [rootStoryId, allContributors, allWeights, allWeightValues]);

  // ── activateAnalysisView ────────────────────────────────────────────────────
  //
  // Shown stories: root focal story only.
  // Shown analyses: all analyses — user compares and hides from there.
  // analysisId defaults to DataState's activeAnalysisId if not passed.
  // Pass null explicitly to show base state with no analysis active.
  const activateAnalysisView = useCallback(
    (analysisId?: string | null) => {
      if (!rootStoryId) return;

      const resolvedAnalysisId = analysisId !== undefined ? analysisId : activeAnalysisId;
      const shownStoryIds = new Set<string>([rootStoryId]);
      const shownAnalysisIds = new Set<string>(analyses.map((a) => a.id));

      setAnalysisView({ analysisId: resolvedAnalysisId, shownStoryIds, shownAnalysisIds });
      setContributorView(null);
      setActiveView("analysis");
    },
    [rootStoryId, analyses, activeAnalysisId]
  );

  // ── activateContributorView ─────────────────────────────────────────────────
  //
  // Opens the drill-down view for a single contributor's time series.
  // Shown stories: root story + this contributor.
  // Shown metric series: all effective header rows for this contributor —
  // shown immediately so the user can see and interact with them right away.
  // "Effective" means analysis-scoped rows if activeAnalysisId is set,
  // otherwise base (analysisId = null) rows.
  const activateContributorView = useCallback(
    (contributorId: string) => {
      if (!rootStoryId) return;

      const resolveHeaders = <T extends { contributorId: string; analysisId: string | null }>(
        headers: T[]
      ): T[] => {
        const forContributor = headers.filter((h) => h.contributorId === contributorId);
        if (!activeAnalysisId) return forContributor.filter((h) => h.analysisId === null);
        const analysisSpecific = forContributor.filter((h) => h.analysisId === activeAnalysisId);
        return analysisSpecific.length > 0
          ? analysisSpecific
          : forContributor.filter((h) => h.analysisId === null);
      };

      const shownStoryIds   = new Set<string>([rootStoryId, contributorId]);
      const shownWeightIds  = new Set<string>(resolveHeaders(allWeights).map((w) => w.id));
      const shownLagIds     = new Set<string>(resolveHeaders(allLags).map((l) => l.id));
      const shownRelationshipIds = new Set<string>(resolveHeaders(allRelationships).map((r) => r.id));

      setContributorView({
        contributorId,
        shownStoryIds,
        shownWeightIds,
        shownLagIds,
        shownRelationshipIds,
      });
      setActiveView("contributor");
    },
    [rootStoryId, activeAnalysisId, allWeights, allLags, allRelationships]
  );

  // ── toggleStoryVisibility ───────────────────────────────────────────────────
  //
  // Adds or removes an ID from the active view's shownStoryIds.
  // The ID can be the root story ID or a contributor ID — both are trend lines.
  const toggleStoryVisibility = useCallback(
    (storyId: string) => {
      if (activeView === "story") {
        setStoryView((prev) => ({ ...prev, shownStoryIds: toggleId(prev.shownStoryIds, storyId) }));
      } else if (activeView === "analysis") {
        setAnalysisView((prev) => ({ ...prev, shownStoryIds: toggleId(prev.shownStoryIds, storyId) }));
      } else if (activeView === "contributor") {
        setContributorView((prev) =>
          prev ? { ...prev, shownStoryIds: toggleId(prev.shownStoryIds, storyId) } : prev
        );
      }
    },
    [activeView]
  );

  // ── isStoryShown ────────────────────────────────────────────────────────────
  //
  // Reads from the active view's shownStoryIds. Components call this with
  // either the root story ID or a contributor ID.
  const isStoryShown = useCallback(
    (storyId: string): boolean => {
      if (activeView === "story")       return storyView.shownStoryIds.has(storyId);
      if (activeView === "analysis")    return analysisView.shownStoryIds.has(storyId);
      if (activeView === "contributor") return contributorView?.shownStoryIds.has(storyId) ?? false;
      return false;
    },
    [activeView, storyView, analysisView, contributorView]
  );

  // ── toggleAnalysisVisibility / isAnalysisShown ──────────────────────────────
  //
  // Show/hide individual analysis overlay lines. Scoped to analysisView only.
  const toggleAnalysisVisibility = useCallback((analysisId: string) => {
    setAnalysisView((prev) => ({
      ...prev,
      shownAnalysisIds: toggleId(prev.shownAnalysisIds, analysisId),
    }));
  }, []);

  const isAnalysisShown = useCallback(
    (analysisId: string) => analysisView.shownAnalysisIds.has(analysisId),
    [analysisView]
  );

  // ── Contributor metric series toggles ───────────────────────────────────────
  //
  // Each operates on its own shown set inside contributorView.
  // The IDs are WeightRow / LagRow / RelationshipRow header IDs.
  // No-op if contributorView is null.
  const toggleWeightVisibility = useCallback((weightId: string) => {
    setContributorView((prev) =>
      prev ? { ...prev, shownWeightIds: toggleId(prev.shownWeightIds, weightId) } : prev
    );
  }, []);

  const toggleLagVisibility = useCallback((lagId: string) => {
    setContributorView((prev) =>
      prev ? { ...prev, shownLagIds: toggleId(prev.shownLagIds, lagId) } : prev
    );
  }, []);

  const toggleRelationshipVisibility = useCallback((relationshipId: string) => {
    setContributorView((prev) =>
      prev ? { ...prev, shownRelationshipIds: toggleId(prev.shownRelationshipIds, relationshipId) } : prev
    );
  }, []);

  const isWeightShown = useCallback(
    (weightId: string) => contributorView?.shownWeightIds.has(weightId) ?? false,
    [contributorView]
  );

  const isLagShown = useCallback(
    (lagId: string) => contributorView?.shownLagIds.has(lagId) ?? false,
    [contributorView]
  );

  const isRelationshipShown = useCallback(
    (relationshipId: string) => contributorView?.shownRelationshipIds.has(relationshipId) ?? false,
    [contributorView]
  );

  // ── Context value ───────────────────────────────────────────────────────────

  const value = useMemo<UIState>(
    () => ({
      activeView,
      storyView,
      analysisView,
      contributorView,
      activateStoryView,
      activateAnalysisView,
      activateContributorView,
      toggleStoryVisibility,
      isStoryShown,
      toggleAnalysisVisibility,
      isAnalysisShown,
      toggleWeightVisibility,
      toggleLagVisibility,
      toggleRelationshipVisibility,
      isWeightShown,
      isLagShown,
      isRelationshipShown,
    }),
    [
      activeView,
      storyView,
      analysisView,
      contributorView,
      activateStoryView,
      activateAnalysisView,
      activateContributorView,
      toggleStoryVisibility,
      isStoryShown,
      toggleAnalysisVisibility,
      isAnalysisShown,
      toggleWeightVisibility,
      toggleLagVisibility,
      toggleRelationshipVisibility,
      isWeightShown,
      isLagShown,
      isRelationshipShown,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useUI(): UIState {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within a <UIProvider>");
  return ctx;
}