"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { DataProvider, useData } from "@/contexts/DataState";
import { useAuth } from "@/contexts/AuthContext";
import StorySidebar from "@/components/StorySidebar";
import StoryGraph from "@/components/StoryGraph";
import {
  canUserViewStory,
  populateViewerOnFirstVisit,
  normalizeEmail,
} from "@/lib/permissions";

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
  const { initStory, assembledStory, activeStoryDoc, saveStory } = useData();

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
  const onSave = useCallback(async () => {
    try {
      const result = await saveStory();
      console.log(`[page] save complete — ${result.writes} rows persisted`);
      setIsDirty(false);
    } catch (err) {
      console.error("[page] save failed:", err);
      // Leave isDirty true so the user knows their changes weren't persisted.
      // Future: surface a toast or banner with the error.
    }
  }, [saveStory]);
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
    onToggleStoryAnalysis,
    onToggleContributorTrend,
    onToggleContributor,
    onToggleWeight,
    onToggleLag,
    onToggleCorrelation,
    onToggleAnalysis,
  };

  return (
    <AccessGuard storyId={storyId}>
      <div className="flex min-h-screen w-full">
        <aside className="w-96 shrink-0 px-5 py-6 overflow-y-auto">
          <StorySidebar viewState={viewState} />
        </aside>
        <main className="flex-1 overflow-hidden">
          <StoryGraph viewState={viewState} />
        </main>
      </div>
    </AccessGuard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AccessGuard
//
// Gates rendering of the story based on auth + the story doc's permissions:
//
//   • Public stories (visible / usable)  → render for everyone, signed in or not
//   • Private stories                    → render only if signed-in user is the
//                                          admin OR their email is in the
//                                          designated viewers map
//
// First-visit lazy population: when an authorized viewer visits with a uid+name
// that haven't been written yet (entry.uid === null), we fire-and-forget update
// the viewer entry. Doesn't block render.
// ─────────────────────────────────────────────────────────────────────────────

function AccessGuard({ storyId, children }: { storyId: string; children: React.ReactNode }) {
  const { activeStoryDoc } = useData();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const accessState = useMemo(() => {
    if (!activeStoryDoc || activeStoryDoc.id !== storyId) return "loading" as const;
    if (authLoading) return "loading" as const;

    const allowed = canUserViewStory(activeStoryDoc, user?.uid ?? null, user?.email ?? null);
    if (allowed) return "allowed" as const;
    return user ? "denied_signed_in" as const : "denied_signed_out" as const;
  }, [activeStoryDoc, storyId, user, authLoading]);

  // First-visit lazy population: fires once when an authorized non-admin
  // viewer arrives and their entry hasn't been backfilled yet.
  useEffect(() => {
    if (accessState !== "allowed") return;
    if (!activeStoryDoc || !user?.email) return;
    const isAdmin = activeStoryDoc.permissions.admin === user.uid;
    if (isAdmin) return;
    const email = normalizeEmail(user.email);
    const entry = activeStoryDoc.permissions.viewers?.[email];
    if (entry && entry.uid === null) {
      populateViewerOnFirstVisit(storyId, email, {
        uid:         user.uid,
        displayName: user.displayName,
      }).catch((err) => console.warn("[AccessGuard] populate failed:", err));
    }
  }, [accessState, activeStoryDoc, user, storyId]);

  if (accessState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 size={28} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (accessState === "denied_signed_in") {
    return (
      <NoAccessCard
        signedIn={true}
        primaryAction={
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium transition-colors"
          >
            Go back
          </button>
        }
      />
    );
  }

  if (accessState === "denied_signed_out") {
    const returnTo = `/story/${storyId}`;
    return (
      <NoAccessCard
        signedIn={false}
        primaryAction={
          <Link
            href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Sign in or create an account
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}

function NoAccessCard({
  signedIn, primaryAction,
}: {
  signedIn:      boolean;
  primaryAction: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <AlertCircle size={24} className="text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">
            You don't have access to this story
          </h1>
          <p className="text-sm text-zinc-600">
            {signedIn
              ? "This story is private. Ask the story owner to add your email as a designated viewer."
              : "This story is private. If your email has been added by the owner, sign in to view it."}
          </p>
        </div>
        <div className="space-y-2">{primaryAction}</div>
      </div>
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