"use client";

import { useData } from "@/contexts/DataState";
import { useAuth } from "@/contexts/AuthContext";
import Breadcrumb from "@/components/Breadcrumb";
import AddContributorModal from "@/components/AddContributor";
import type { AssembledContributor, StoryVisibility } from "@/types/db";
import type { StoryViewState } from "@/app/story/[id]/page";
import CreateAnalysisModal from "@/components/CreateAnalysis";
import DetailsModal from "@/components/DetailsModal";
import StoryPermissionsModal from "@/components/StoryPermissionsModal";
import { useState } from "react";
import {
  EyeIcon,
  EyeOffIcon,
  ForkIcon,
  BarIcon,
  FilterIcon,
  ChevronLeftIcon,
} from "@/components/icons";

// ── Colors ────────────────────────────────────────────────────────────────────
export const TREND_COLORS = [
  "#c026d3", // fuchsia
  "#06b6d4", // cyan
  "#ea580c", // orange
  "#16a34a", // green
  "#6366f1", // indigo
  "#dc2626", // red
  "#9333ea", // purple
  "#0284c7", // sky blue
  "#ca8a04", // gold
];

export function getTrendColor(index: number): string {
  return TREND_COLORS[index % TREND_COLORS.length];
}

const METRIC_COLORS = {
  weight:            "#f59e0b",
  lag:               "#06b6d4",
  correlationValue: "#10b981",
};

// ── Eye toggle button ─────────────────────────────────────────────────────────
function EyeToggle({
  shown,
  onToggle,
  label,
  title,
}: {
  shown:    boolean;
  onToggle: () => void;
  label?:   string;
  title?:   string;
}) {
  return (
    <button
      onClick={onToggle}
      title={title ?? (shown ? "Hide from graph" : "Show on graph")}
      className={`flex items-center gap-1 transition-colors duration-150 ${
        shown
          ? "text-indigo-500 hover:text-indigo-700"
          : "text-zinc-300 hover:text-zinc-500"
      }`}
    >
      {shown ? <EyeIcon /> : <EyeOffIcon />}
      {label && <span className="text-xs">{label}</span>}
    </button>
  );
}

// ── Metric series row ─────────────────────────────────────────────────────────
function MetricSeriesRow({
  label,
  color,
  count,
  dataId,
  shownIds,
  toggleFn,
  isActiveEdit = false,
  onSelectEdit,
}: {
  label:         string;
  color:         string;
  count:         number;
  dataId:        string;
  shownIds:      Set<string>;
  toggleFn:      (id: string) => void;
  isActiveEdit?: boolean;
  onSelectEdit?: () => void;
}) {
  const isShown = count > 0 && shownIds.has(dataId);

  function toggle() {
    toggleFn(dataId); 
  }

  return (
    <div
      className={`flex items-center gap-2 py-2 px-3 rounded-md mb-1.5 cursor-pointer transition-colors ${
        isActiveEdit ? "bg-indigo-50" : "bg-zinc-100 hover:bg-zinc-50"
      }`}
      style={{ borderLeft: `3px solid ${isActiveEdit ? "#6366f1" : color}` }}
      onClick={onSelectEdit}
      title={onSelectEdit ? "Click to select for editing" : undefined}
    >
      <button
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        title={isShown ? "Hide from graph" : "Show on graph"}
        className={`transition-colors duration-150 ${
          isShown
            ? "text-indigo-500 hover:text-indigo-700"
            : "text-zinc-300 hover:text-zinc-500"
        }`}
      >
        {isShown ? <EyeIcon /> : <EyeOffIcon />}
      </button>
      <p className={`text-sm ${isActiveEdit ? "text-indigo-700 font-medium" : "text-zinc-700"}`}>
        {label}
      </p>
      {isActiveEdit && (
        <span className="ml-auto text-indigo-400">
          <PenIcon />
        </span>
      )}
    </div>
  );
}

// ── Visibility helpers ────────────────────────────────────────────────────────
function VisibilityIcon({ visibility }: { visibility: StoryVisibility }) {
  switch (visibility) {
    case "public_visible":
      // Person outline — anyone can see
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "public_usable":
      // Link/chain — anyone can see and use
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case "private":
    default:
      // Lock — restricted access
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
  }
}
 
function visibilityLabel(visibility: StoryVisibility): string {
  switch (visibility) {
    case "public_visible": return "Public";
    case "public_usable":  return "Public + Usable";
    case "private":
    default:               return "Private";
  }
}

// ── Analysis card ─────────────────────────────────────────────────────────────
type AnalysisEntry = { id: string; Name?: string; createdAt?: string };
 
function AnalysisCard({
  variant,
  viewState,
}: {
  variant:   AnalysisEntry;
  viewState: StoryViewState;
}) {
  const {
    activeAnalysisId,
    setActiveAnalysisId,
    deleteAnalysis,
    renameAnalysis,
    activeStoryDoc,
  } = useData();
  const isActive = activeAnalysisId === variant.id;
  const isShown  = viewState.shownAnalysisIds.has(variant.id);
 
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [showRename,  setShowRename]  = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
 
  const isOnlyAnalysis = Object.keys(activeStoryDoc?.Analysis ?? {}).length <= 1;
 
  async function handleDelete() {
    setConfirmDel(false);
    try {
      await deleteAnalysis(variant.id);
    } catch (err) {
      console.error("[AnalysisCard] delete failed:", err);
    }
  }
 
  return (
    <>
      <div
        className={`
          flex flex-col gap-1.5 px-3 py-2.5 rounded-md mb-1.5 cursor-pointer
          transition-colors duration-150
          ${isActive
            ? "bg-indigo-50 border border-indigo-200"
            : "bg-zinc-100 border border-transparent hover:border-zinc-200"
          }
        `}
        onClick={() => { if (!isActive) setActiveAnalysisId(variant.id); }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug flex-1 ${isActive ? "text-indigo-700" : "text-zinc-700"}`}>
            {variant.Name ?? "Unnamed variant"}
          </p>
 
          {/* "..." menu — Rename / Delete */}
          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="text-zinc-400 hover:text-zinc-600 transition-colors p-0.5 rounded"
            >
              <MoreIcon />
            </button>
 
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                />
                <div className="absolute right-0 top-6 z-20 w-36 bg-white rounded-lg shadow-lg border border-zinc-100 py-1 overflow-hidden">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setShowRename(true); }}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setConfirmDel(true); }}
                    disabled={isOnlyAnalysis}
                    title={isOnlyAnalysis ? "A story must have at least one analysis" : undefined}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:text-zinc-300 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
 
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); viewState.onToggleAnalysis(variant.id); }}
            title={isShown ? "Hide from graph" : "Show on graph"}
            className={`transition-colors duration-150 ${
              isShown
                ? "text-indigo-500 hover:text-indigo-700"
                : "text-zinc-300 hover:text-zinc-500"
            }`}
          >
            {isShown ? <EyeIcon /> : <EyeOffIcon />}
          </button>
          {isActive && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-indigo-100 text-indigo-600 border-indigo-200">
              Active
            </span>
          )}
          {variant.createdAt && (
            <span className="text-xs text-zinc-400">
              {new Date(variant.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
 
      {showRename && (
        <DetailsModal
          title="Analysis Details"
          fieldLabel="Analysis Name"
          initialValue={variant.Name ?? ""}
          onSave={(newName) => renameAnalysis(variant.id, newName)}
          onClose={() => setShowRename(false)}
        />
      )}
 
      {confirmDel && (
        <DeleteAnalysisConfirmModal
          analysisName={variant.Name ?? "this analysis"}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(false)}
        />
      )}
    </>
  );
}

// ── ContributorPanel ──────────────────────────────────────────────────────────
function ContributorPanel({
  storyName,
  storyDataPointCount,
  contributor,
  viewState,
}: {
  storyName:           string;
  storyDataPointCount: number;
  contributor:         AssembledContributor;
  viewState:           StoryViewState;
}) {
  const focalColor       = getTrendColor(0);
  const contributorColor = getTrendColor(1);
  const isShown      = viewState.shownContributorIds.has(contributor.id);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">

      {/* Back link */}
      <button
        onClick={() => viewState.onStoryView()}
        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 mb-2 transition-colors duration-150"
      >
        <ChevronLeftIcon />
        Back to Contributors
      </button>

      {/* Contributor card — single pair toggle */}
      <div
        className="flex flex-col gap-1.5 py-2 px-3 rounded-md bg-zinc-100 mb-1.5"
        style={{ borderLeft: `3px solid ${contributorColor}` }}
      >
        <p className="text-zinc-700 text-sm leading-snug">{contributor.name}</p>
        <div className="flex items-center gap-2">
          <EyeToggle
            shown={viewState.shownContributorTrendIds.has(contributor.id)}
            onToggle={() => viewState.onToggleContributorTrend(contributor.id)}
            label="Root Data"
          />
          {contributor.meta && (
            <span className="text-xs text-zinc-400">
              {contributor.meta.unit}
              {contributor.meta.denomination && contributor.meta.denomination !== 1
                ? ` ×${contributor.meta.denomination.toLocaleString()}`
                : ""}
            </span>
          )}
        </div>
      </div>

      {/* Data Points row — selects "merged" as the active edit series */}
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-md mb-1.5 cursor-pointer transition-colors ${
          viewState.activeEditSeries === "merged" ? "bg-indigo-50" : "bg-zinc-100 hover:bg-zinc-50"
        }`}
        style={{ borderLeft: `3px solid ${viewState.activeEditSeries === "merged" ? "#6366f1" : contributorColor}` }}
        onClick={() => viewState.onSelectEditSeries("merged")}
        title="Click to edit data points"
      >
        <button
          onClick={(e) => { e.stopPropagation(); viewState.onToggleContributor(contributor.id); }}
          title={viewState.shownContributorIds.has(contributor.id) ? "Hide from graph" : "Show on graph"}
          className={`transition-colors duration-150 ${
            viewState.shownContributorIds.has(contributor.id)
              ? "text-indigo-500 hover:text-indigo-700"
              : "text-zinc-300 hover:text-zinc-500"
          }`}
        >
          {viewState.shownContributorIds.has(contributor.id) ? <EyeIcon /> : <EyeOffIcon />}
        </button>
        <p className={`text-sm ${viewState.activeEditSeries === "merged" ? "text-indigo-700 font-medium" : "text-zinc-700"}`}>
          Data Points
        </p>
        {viewState.activeEditSeries === "merged" && (
          <span className="ml-auto text-indigo-400"><PenIcon /></span>
        )}
      </div>

      {/* Metric series rows */}
      <MetricSeriesRow
        label="Weight"
        color={METRIC_COLORS.weight}
        count={contributor.weightValues.length}
        dataId={contributor.dataId}  
        shownIds={viewState.shownWeightIds}
        toggleFn={viewState.onToggleWeight}
        isActiveEdit={viewState.activeEditSeries === "weight"}
        onSelectEdit={() => viewState.onSelectEditSeries("weight")}
      />
      <MetricSeriesRow
        label="Lag"
        color={METRIC_COLORS.lag}
        count={contributor.lagValues.length}
        dataId={contributor.dataId}  
        shownIds={viewState.shownLagIds}
        toggleFn={viewState.onToggleLag}
        isActiveEdit={viewState.activeEditSeries === "lag"}
        onSelectEdit={() => viewState.onSelectEditSeries("lag")}
      />
      <MetricSeriesRow
        label="Correlation"
        color={METRIC_COLORS.correlationValue}
        count={contributor.correlationValues.length}
        dataId={contributor.dataId}  
        shownIds={viewState.shownCorrelationIds}
        toggleFn={viewState.onToggleCorrelation}
        isActiveEdit={viewState.activeEditSeries === "correlation"}
        onSelectEdit={() => viewState.onSelectEditSeries("correlation")}
      />
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────
function MoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="5"  r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
 
// ── UnlinkConfirmModal ────────────────────────────────────────────────────────
function UnlinkConfirmModal({
  contributorName,
  onConfirm,
  onCancel,
}: {
  contributorName: string;
  onConfirm:       () => void;
  onCancel:        () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
        <p className="text-sm font-semibold text-zinc-800">Remove Contributor?</p>
        <p className="text-sm text-zinc-500 leading-relaxed">
          <span className="font-medium text-zinc-700">{contributorName}</span> will be removed
          from this story. All weight, lag, and correlation edits for this contributor
          will be permanently deleted.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DeleteAnalysisConfirmModal ────────────────────────────────────────────────
function DeleteAnalysisConfirmModal({
  analysisName,
  onConfirm,
  onCancel,
}: {
  analysisName: string;
  onConfirm:    () => void;
  onCancel:     () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
        <p className="text-sm font-semibold text-zinc-800">Delete Analysis?</p>
        <p className="text-sm text-zinc-500 leading-relaxed">
          <span className="font-medium text-zinc-700">{analysisName}</span> will be permanently
          deleted, along with all weight, lag, correlation, and edited data points associated
          with it. This cannot be undone.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ContributorNode ───────────────────────────────────────────────────────────
function ContributorNode({
  contributor,
  colorIndex,
  viewState,
}: {
  contributor: AssembledContributor;
  colorIndex:  number;
  viewState:   StoryViewState;
}) {
  const { unlinkContributor } = useData();
  const color        = getTrendColor(colorIndex);
  const isShown      = viewState.shownContributorIds.has(contributor.id);
  const [menuOpen,        setMenuOpen]        = useState(false);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);

  async function handleUnlink() {
    setConfirmingUnlink(false);
    await unlinkContributor(contributor.id);
  }

  return (
    <>

    <div
      className="flex flex-col gap-1.5 py-2 px-3 rounded-md bg-zinc-100 mb-1.5"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center gap-2">
        <p className="text-zinc-700 text-sm leading-snug">{contributor.name}</p>
      </div>

      <div className="flex items-center gap-2">
        <EyeToggle
          shown={isShown}
          onToggle={() => viewState.onToggleContributor(contributor.id)}
        />

        <button
          onClick={() => viewState.onRelationshipView(contributor.id)}
          title="View contributor metrics"
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors duration-150"
        >
          <FilterIcon />
          <p className="text-indigo-500 text-sm leading-snug">Edit Contributor</p>
        </button>

        <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="text-zinc-400 hover:text-zinc-600 transition-colors p-0.5 rounded"
            >
              <MoreIcon />
            </button>

            {menuOpen && (
              <>
                {/* Click-away backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-6 z-20 w-36 bg-white rounded-lg shadow-lg border border-zinc-100 py-1 overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); setConfirmingUnlink(true); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
      </div>
    </div>

    {confirmingUnlink && (
      <UnlinkConfirmModal
        contributorName={contributor.name}
        onConfirm={handleUnlink}
        onCancel={() => setConfirmingUnlink(false)}
      />
    )}
    
    </>
  );
}

// ── StorySidebar ──────────────────────────────────────────────────────────────

export default function StorySidebar({ viewState }: { viewState: StoryViewState }) {
  const { user } = useAuth();
  const {
    assembledStory,
    activeStoryDoc,
    activeAnalysisId,
    perspectives,
    createAnalysis,
    renameStory,
  } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateAnalysis, setShowCreateAnalysis] = useState(false);
  const [storyMenuOpen, setStoryMenuOpen] = useState(false);
  const [showStoryRename, setShowStoryRename] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  if (!assembledStory) return null;
  const { id: storyId, name: title, trendDataValues, contributors } = assembledStory;
  const perspective = perspectives.find((p) => p.id === activeStoryDoc?.perspectiveId);
  const activeAnalysisEntry = activeAnalysisId
    ? { id: activeAnalysisId, ...(activeStoryDoc?.Analysis?.[activeAnalysisId] as any) }
    : null;
  const analyses: AnalysisEntry[] = Object.entries(activeStoryDoc?.Analysis ?? {})
    .map(([id, entry]) => ({ id, ...(entry as any) }))
    .sort((a, b) => (a.Name ?? a.id).localeCompare(b.Name ?? b.id));
  const activeContributor = viewState.activeView === "contributor"
    ? contributors.find((c) => c.id === viewState.activeContributorId) ?? null
    : null;
  const focalColor = getTrendColor(0);
  const visibility: StoryVisibility = activeStoryDoc?.permissions?.visibility ?? "private";
  const viewers = activeStoryDoc?.permissions?.viewers ?? {};
  const isAdmin = !!user && activeStoryDoc?.permissions?.admin === user.uid;

  return (
    <div className="flex flex-col h-full">

      {/* ── User header ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 mb-5">
        <Breadcrumb items={[
          { label: "Home", href: "/" },
          { label: "Perspectives", href: "/" },
          { label: perspective?.name ?? "Perspective", href: `/perspective/${activeStoryDoc?.perspectiveId}` },
          { label: title },
        ]} />
        <div className="w-8 h-8 rounded-full bg-zinc-300 shrink-0 overflow-hidden" />
        <span className="text-sm font-medium text-zinc-700">Admin</span>
        {/* Visibility status — clickable only for the admin */}
        <button
          onClick={() => isAdmin && setShowPermissions(true)}
          disabled={!isAdmin}
          title={isAdmin ? "Change permissions" : "Permissions (admin only)"}
          className={`flex items-center gap-1 text-sm transition-colors duration-150 ${
            isAdmin
              ? "text-zinc-600 hover:text-indigo-600 cursor-pointer"
              : "text-zinc-400 cursor-default"
          }`}
        >
          <VisibilityIcon visibility={visibility} />
          <span>{visibilityLabel(visibility)}</span>
        </button>
      </div>

      {/* ── Story view ────────────────────────────────────────────────────── */}
      {viewState.activeView === "story" && (
        <div className="flex flex-col flex-1 overflow-y-auto">

          {/* Focal story card — two independent toggles */}
          <div
            className="flex flex-col gap-2 mb-2 px-3 py-2 rounded-md bg-zinc-100"
            style={{ borderLeft: `3px solid ${focalColor}` }}
          >
            <p className="text-zinc-800 font-semibold text-sm leading-snug">{title}</p>
            <div className="flex items-center gap-3">
              <EyeToggle
                shown={viewState.shownStoryAnalysis}
                onToggle={viewState.onToggleStoryAnalysis}
                label="Analyzed"
              />
              <EyeToggle
                shown={viewState.shownStoryTrend}
                onToggle={viewState.onToggleStoryTrend}
                label="Root Data"
              />

              {/* "..." menu — Rename (Edit Color / View Source deferred) */}
              <div className="relative ml-auto">
                <button
                  onClick={() => setStoryMenuOpen(v => !v)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors p-0.5 rounded"
                >
                  <MoreIcon />
                </button>
                {storyMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setStoryMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-6 z-20 w-36 bg-white rounded-lg shadow-lg border border-zinc-100 py-1 overflow-hidden">
                      <button
                        onClick={() => { setStoryMenuOpen(false); setShowStoryRename(true); }}
                        className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        Rename
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Active analysis pill */}
          {activeAnalysisEntry && (
            <button
              onClick={() => viewState.onAnalysisView()}
              className="flex items-center gap-1.5 px-3 py-1.5 mb-3 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 text-xs font-medium w-full text-left"
            >
              <ForkIcon />
              <span className="flex-1 truncate">{activeAnalysisEntry.Name ?? activeAnalysisEntry.id}</span>
              <span>→</span>
            </button>
          )}

          {/* Calculation  label */}
          <p className="text-xs text-zinc-400 mb-2 px-1">
            Standard Calculation Algo
          </p>

          {/* Contributor count label */}
          <p className="text-xs text-zinc-400 mb-2 px-1">
            {contributors.length} Contributor{contributors.length !== 1 ? "s" : ""}
          </p>

          {/* Contributor nodes */}
          {contributors.map((contributor, i) => (
            <ContributorNode
              key={contributor.id}
              contributor={contributor}
              colorIndex={i + 1}
              viewState={viewState}
            />
          ))}

          {/* Add New Contributor button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 w-full mt-3 px-3 py-2 rounded-md border border-dashed border-zinc-300 text-xs font-medium text-zinc-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
          >
            Add New Contributor
            <span className="text-base leading-none">+</span>
          </button>
        </div>
      )}

      {/* ── Analysis view ─────────────────────────────────────────────────── */}
      {viewState.activeView === "analysis" && (
        <div className="flex flex-col flex-1 overflow-y-auto">

          {/* Story card — trend toggle is the base reference line */}
          <div
            className="flex flex-col gap-2 mb-3 px-3 py-2 rounded-md bg-zinc-100"
            style={{ borderLeft: `3px solid ${focalColor}` }}
          >
            <p className="text-zinc-800 font-semibold text-sm leading-snug">{title}</p>
            <div className="flex items-center gap-3">
              <EyeToggle
                shown={viewState.shownStoryTrend}
                onToggle={viewState.onToggleStoryTrend}
                label="Root Data"
              />
              <button
                onClick={() => viewState.onStoryView()}
                className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 transition-colors duration-150"
              >
                Back to Story →
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-400 mb-2 px-1">
            {analyses.length} Analysis{analyses.length !== 1 ? "s" : ""} for Story
          </p>

          {analyses.length === 0 ? (
            <div className="flex items-center justify-center flex-1 text-zinc-400 text-sm">
              No analyses yet
            </div>
          ) : (
            analyses.map((analysis) => (
              <AnalysisCard key={analysis.id} variant={analysis} viewState={viewState} />
            ))
          )}

          <button
            onClick={() => setShowCreateAnalysis(true)}
            className="mt-2 px-3 py-3 rounded-md bg-zinc-50 hover:bg-zinc-100 text-sm font-medium text-indigo-500 hover:text-indigo-700 transition-colors duration-150 flex items-center justify-center gap-2"
          >
            Add Analysis
            <span className="text-base leading-none">+</span>
          </button>
        </div>
      )}

      {/* ── Contributor view ──────────────────────────────────────────────── */}
      {viewState.activeView === "contributor" && (
        <div className="flex flex-col flex-1 overflow-y-auto">

          {/* Focal story card — two independent toggles */}
          <div
            className="flex flex-col gap-2 mb-2 px-3 py-2 rounded-md bg-zinc-100"
            style={{ borderLeft: `3px solid ${focalColor}` }}
          >
            <p className="text-zinc-800 font-semibold text-sm leading-snug">{title}</p>
            <div className="flex items-center gap-3">
              <EyeToggle
                shown={viewState.shownStoryAnalysis}
                onToggle={viewState.onToggleStoryAnalysis}
                label="Analyzed"
              />
              <EyeToggle
                shown={viewState.shownStoryTrend}
                onToggle={viewState.onToggleStoryTrend}
                label="Root Data"
              />
            </div>
          </div>

          {/* Active analysis pill */}
          {activeAnalysisEntry && (
            <button
              onClick={() => viewState.onAnalysisView()}
              className="flex items-center gap-1.5 px-3 py-1.5 mb-3 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 text-xs font-medium w-full text-left"
            >
              <ForkIcon />
              <span className="flex-1 truncate">{activeAnalysisEntry.Name ?? activeAnalysisEntry.id}</span>
              <span>→</span>
            </button>
          )}

          {/* Calculation  label */}
          <p className="text-xs text-zinc-400 mb-2 px-1">
            Standard Calculation Algo
          </p>

          {activeContributor && (
            <ContributorPanel
              storyName={title}
              storyDataPointCount={trendDataValues.length}
              contributor={activeContributor}
              viewState={viewState}
            />
          )}
        </div>
      )}

      {/* ── Add Contributor Modal ──────────────────────────────────────── */}
      {showAddModal && (
        <AddContributorModal onClose={() => setShowAddModal(false)} />
      )}

      {/* ── Add Analysis Modal ──────────────────────────────────────── */}
      {showCreateAnalysis && (
        <CreateAnalysisModal
          onClose={() => setShowCreateAnalysis(false)}
          onProceed={async (baseAnalysisId) => {
            setShowCreateAnalysis(false);
            await createAnalysis({
              name: baseAnalysisId
                ? `Copy of ${activeStoryDoc?.Analysis?.[baseAnalysisId]?.Name ?? "Analysis"}`
                : "New Analysis",
              baseAnalysisId: baseAnalysisId ?? undefined,
            });
          }}
        />
      )}

      {/* ── Rename Story Modal ──────────────────────────────────────── */}
      {showStoryRename && (
        <DetailsModal
          title="Story Details"
          fieldLabel="Story Name"
          initialValue={title}
          onSave={(newName) => renameStory(newName)}
          onClose={() => setShowStoryRename(false)}
        />
      )}

      {/* ── Story Permissions Modal ─────────────────────────────────── */}
      {showPermissions && (
        <StoryPermissionsModal
          storyId={storyId}
          storyName={title}
          currentVisibility={visibility}
          viewers={viewers}
          onClose={() => setShowPermissions(false)}
        />
      )}

    </div>

  );
}