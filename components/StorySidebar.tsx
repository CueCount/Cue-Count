"use client";

import { useState } from "react";
import type {
  ContributorWithDetail,
  AnalysisRow,
  PerspectiveRow,
} from "@/types/db";
import { useUI } from "@/contexts/UIState";
import { useData } from "@/contexts/DataState";
import Breadcrumb from "@/components/Breadcrumb";
import mockPerspectives from "@/data/mock/perspectives.json";

export const TREND_COLORS = [
  "#c026d3",
  "#06b6d4",
  "#e879f9",
  "#f0abfc",
  "#f5d0fe",
  "#d946ef",
  "#a21caf",
];

export function getTrendColor(index: number): string {
  return TREND_COLORS[index % TREND_COLORS.length];
}

const METRIC_COLORS = {
  weight:            "#f59e0b",
  lag:               "#06b6d4",
  relationshipValue: "#10b981",
};

import {
  EyeIcon,
  EyeOffIcon,
  ForkIcon,
  BarIcon,
  FilterIcon,
  ChevronLeftIcon,
} from "@/components/icons";

// ── Stat pill ──────────────────────────────────────────────────────────

function Stat({ icon, value }: { icon: React.ReactNode; value: string | number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-indigo-500">
      {icon}
      {value}
    </span>
  );
}

// ── Relationship type badge ────────────────────────────────────────────

const REL_COLORS: Record<string, string> = {
  direct:     "bg-emerald-50 text-emerald-600 border-emerald-200",
  inverse:    "bg-rose-50 text-rose-600 border-rose-200",
  correlated: "bg-blue-50 text-blue-600 border-blue-200",
  lagged:     "bg-amber-50 text-amber-600 border-amber-200",
};

function RelBadge({ type }: { type: string }) {
  const cls = REL_COLORS[type] ?? "bg-zinc-50 text-zinc-500 border-zinc-200";
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${cls}`}>
      {type}
    </span>
  );
}

// ── Metric series row ──────────────────────────────────────────────────

function MetricSeriesRow({
  label,
  color,
  ids,
  isShownFn,
  toggleFn,
}: {
  label: string;
  color: string;
  ids: string[];
  isShownFn: (id: string) => boolean;
  toggleFn: (id: string) => void;
}) {
  const isShown = ids.length > 0 && ids.some((id) => isShownFn(id));

  function toggle() {
    ids.forEach((id) => {
      const currentlyShown = isShownFn(id);
      if (isShown && currentlyShown) toggleFn(id);
      if (!isShown && !currentlyShown) toggleFn(id);
    });
  }

  return (
    <div
      className="flex items-center gap-2 py-2 px-3 rounded-md bg-zinc-100 mb-1.5"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <button
        onClick={toggle}
        title={isShown ? "Hide from graph" : "Show on graph"}
        className={`transition-colors duration-150 ${
          isShown
            ? "text-indigo-500 hover:text-indigo-700"
            : "text-zinc-300 hover:text-zinc-500"
        }`}
      >
        {isShown ? <EyeIcon /> : <EyeOffIcon />}
      </button>
      <p className="text-zinc-700 text-sm">{label}</p>
      <span className="ml-auto text-xs text-zinc-400">{ids.length} pts</span>
    </div>
  );
}

// ── Contributor Panel ──────────────────────────────────────────────────
// Shown when activeView === "contributor". Replaces the full sidebar content.
// Back button calls activateStoryView() to return to the contributors list.

function ContributorPanel() {
  const { rootStory, getEffectiveContributors } = useData();
  const {
    contributorView,
    isStoryShown,
    toggleStoryVisibility,
    isWeightShown,
    isLagShown,
    isRelationshipShown,
    toggleWeightVisibility,
    toggleLagVisibility,
    toggleRelationshipVisibility,
    activateStoryView,
  } = useUI();
 
  if (!contributorView || !rootStory) return null;
 
  const { name: title, id: storyId, focalTrend } = rootStory;
  // Use getEffectiveContributors so the weight/lag/relationship IDs here
  // match exactly what activateContributorView put into shownWeightIds etc.
  const contributor = getEffectiveContributors().find((c) => c.id === contributorView.contributorId);
 
  const focalIsShown = isStoryShown(storyId);
  const focalColor   = getTrendColor(0);
 
  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
 
      {/* Focal story card */}
      <div
        className="flex flex-col gap-2 mb-2 px-3 py-2 rounded-md bg-zinc-100"
        style={{ borderLeft: `3px solid ${focalColor}` }}
      >
        <p className="text-zinc-800 font-semibold text-sm leading-snug">{title}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleStoryVisibility(storyId)}
            className={`transition-colors duration-150 ${
              focalIsShown
                ? "text-indigo-500 hover:text-indigo-700"
                : "text-zinc-300 hover:text-zinc-500"
            }`}
          >
            {focalIsShown ? <EyeIcon /> : <EyeOffIcon />}
          </button>
          <Stat icon={<BarIcon />} value={focalTrend.values.length} />
        </div>
      </div>
 
      {/* Back link — between focal story and contributor card */}
      <button
        onClick={() => activateStoryView()}
        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 mb-2 transition-colors duration-150"
      >
        <ChevronLeftIcon />
        Back to Contributors
      </button>
 
      {/* Contributor card */}
      {contributor && (() => {
        const isShown = isStoryShown(contributor.id);
        const color   = getTrendColor(1);
        return (
          <div
            className="flex flex-col gap-1.5 py-2 px-3 rounded-md bg-zinc-100 mb-1.5"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <p className="text-zinc-700 text-sm leading-snug">{contributor.name}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleStoryVisibility(contributor.id)}
                className={`transition-colors duration-150 ${
                  isShown
                    ? "text-indigo-500 hover:text-indigo-700"
                    : "text-zinc-300 hover:text-zinc-500"
                }`}
              >
                {isShown ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
          </div>
        );
      })()}
 
      {/* Metric series rows */}
      {contributor && (
        <>
          <MetricSeriesRow
            label="Weight"
            color={METRIC_COLORS.weight}
            ids={contributor.weights.map((w) => w.id)}
            isShownFn={isWeightShown}
            toggleFn={toggleWeightVisibility}
          />
          <MetricSeriesRow
            label="Lag"
            color={METRIC_COLORS.lag}
            ids={contributor.lags.map((l) => l.id)}
            isShownFn={isLagShown}
            toggleFn={toggleLagVisibility}
          />
          <MetricSeriesRow
            label="Relationship Value"
            color={METRIC_COLORS.relationshipValue}
            ids={contributor.relationships.map((r) => r.id)}
            isShownFn={isRelationshipShown}
            toggleFn={toggleRelationshipVisibility}
          />
        </>
      )}
 
    </div>
  );
}

// ── Analysis Panel card ────────────────────────────────────────────────

function AnalysisCard({ variant }: { variant: AnalysisRow }) {
  const { activeAnalysisId, setActiveAnalysisId } = useData();
  const { isAnalysisShown, toggleAnalysisVisibility } = useUI();

  const isActive = activeAnalysisId === variant.id;
  const isShown  = isAnalysisShown(variant.id);

  return (
    <div
      className={`
        flex flex-col gap-1.5 px-3 py-2.5 rounded-md mb-1.5 cursor-pointer
        transition-colors duration-150
        ${isActive
          ? "bg-indigo-50 border border-indigo-200"
          : "bg-zinc-100 border border-transparent hover:border-zinc-200"
        }
      `}
      onClick={() => setActiveAnalysisId(isActive ? null : variant.id)}
    >
      <p className={`text-sm font-medium leading-snug ${isActive ? "text-indigo-700" : "text-zinc-700"}`}>
        {variant.name ?? "Unnamed variant"}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleAnalysisVisibility(variant.id);
          }}
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
        <span className="text-xs text-zinc-400">
          {new Date(variant.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}

// ── Contributor Node ───────────────────────────────────────────────────

function ContributorNode({
  contributor,
  allContributors,
  colorIndex,
  depth,
  hiddenContributorIds,
  onToggleSidebarVisibility,
}: {
  contributor: ContributorWithDetail;
  allContributors: ContributorWithDetail[];
  colorIndex: number;
  depth: number;
  hiddenContributorIds: Set<string>;
  onToggleSidebarVisibility: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const { isStoryShown, toggleStoryVisibility, activateContributorView } = useUI();

  const story = contributor;
  const trend = contributor.trend;
  const color = getTrendColor(colorIndex);

  const isShown          = isStoryShown(story.id);
  const isChildrenHidden = hiddenContributorIds.has(story.id);

  const children    = allContributors.filter((c) => c.focalStoryId === story.id);
  const hasChildren = children.length > 0;

  const latestWeight = contributor.weights.at(0)?.values.at(-1)?.value ?? null;
  const relType      = contributor.type;

  return (
    <div style={{ width: `calc(100% - ${depth * 10}px)` }}>
      <div
        className="flex flex-col gap-1.5 py-2 px-3 rounded-md bg-zinc-100 mb-1.5"
        style={{ borderLeft: `3px solid ${color}` }}
      >
        <div className="flex items-center gap-1.5">
          <p className="text-zinc-700 text-sm leading-snug">{story.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleStoryVisibility(story.id)}
            title={isShown ? "Hide from graph" : "Show on graph"}
            className={`transition-colors duration-150 ${
              isShown
                ? "text-indigo-500 hover:text-indigo-700"
                : "text-zinc-300 hover:text-zinc-500"
            }`}
          >
            {isShown ? <EyeIcon /> : <EyeOffIcon />}
          </button>

          <RelBadge type={relType} />

          {latestWeight !== null && (
            <button
              onClick={() => activateContributorView(contributor.id)}
              title="View contributor metrics"
              className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors duration-150"
            >
              <FilterIcon />
              {latestWeight.toFixed(2)}
            </button>
          )}

          <Stat icon={<ForkIcon />} value={children.length} />
          <Stat icon={<BarIcon />} value={trend.values.length} />

          {hasChildren && (
            <button
              onClick={() => onToggleSidebarVisibility(story.id)}
              className="ml-auto text-xs font-medium text-zinc-400 hover:text-zinc-600"
            >
              {isChildrenHidden ? "Show" : "Hide"}
            </button>
          )}
        </div>
      </div>

      {hasChildren && expanded && !isChildrenHidden && (
        <div>
          {children.map((child, i) => (
            <ContributorNode
              key={child.id}
              contributor={child}
              allContributors={allContributors}
              colorIndex={colorIndex + i + 1}
              depth={depth + 1}
              hiddenContributorIds={hiddenContributorIds}
              onToggleSidebarVisibility={onToggleSidebarVisibility}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── StorySidebar ───────────────────────────────────────────────────────

export default function StorySidebar() {
  const [hiddenContributorIds, setHiddenContributorIds] = useState<Set<string>>(new Set());

  const {
    activeView,
    isStoryShown,
    toggleStoryVisibility,
    activateAnalysisView,
    activateStoryView,
  } = useUI();
  const { rootStory, analyses, activeAnalysisId } = useData();

  if (!rootStory) return null;

  const { name: title, id: storyId, focalTrend, contributors } = rootStory;

  const perspective = (mockPerspectives as PerspectiveRow[]).find(
    (p) => p.id === rootStory.perspectiveId
  );

  const focalIsShown = isStoryShown(storyId);
  const focalColor   = getTrendColor(0);

  function toggleSidebarVisibility(id: string) {
    setHiddenContributorIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const directContributors = contributors.filter((c) => c.focalStoryId === storyId);

  return (
    <div className="flex flex-col h-full">

      {/* ── User header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 mb-5">
        <Breadcrumb items={[
          { label: "Home", href: "/" },
          { label: "Perspectives", href: "/" },
          { label: perspective?.name ?? "Perspective", href: `/perspective/${rootStory.perspectiveId}` },
          { label: title },
        ]} />
        <div className="w-8 h-8 rounded-full bg-zinc-300 shrink-0 overflow-hidden" />
        <span className="text-sm font-medium text-zinc-700">Admin</span>
        <button
          onClick={() => {}}
          title="Edit permissions"
          className="text-zinc-400 hover:text-zinc-600 transition-colors duration-150"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      {/* ── Contributors view (default) ───────────────────────────────── */}
      {activeView === "story" && (
        <div className="flex flex-col flex-1 overflow-y-auto">

          {/* Active analysis pill — click to open analysis panel */}
          {activeAnalysisId && (() => {
            const activeAnalysis = analyses.find((a) => a.id === activeAnalysisId);
            return activeAnalysis ? (
              <button
                onClick={() => activateAnalysisView()}
                className="flex items-center gap-1.5 px-3 py-1.5 mb-3 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 text-xs font-medium w-full text-left"
              >
                <ForkIcon />
                <span className="flex-1 truncate">{activeAnalysis.name}</span>
                <span>→</span>
              </button>
            ) : null;
          })()}

          {/* Focal story card */}
          <div
            className="flex flex-col gap-2 mb-2 px-3 py-2 rounded-md bg-zinc-100"
            style={{ borderLeft: `3px solid ${focalColor}` }}
          >
            <p className="text-zinc-800 font-semibold text-sm leading-snug">{title}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleStoryVisibility(storyId)}
                title={focalIsShown ? "Hide from graph" : "Show on graph"}
                className={`transition-colors duration-150 ${
                  focalIsShown
                    ? "text-indigo-500 hover:text-indigo-700"
                    : "text-zinc-300 hover:text-zinc-500"
                }`}
              >
                {focalIsShown ? <EyeIcon /> : <EyeOffIcon />}
              </button>
              <Stat icon={<ForkIcon />} value={contributors.length} />
              <Stat icon={<BarIcon />} value={focalTrend.values.length} />
            </div>
          </div>

          {/* Contributor count label */}
          <p className="text-xs text-zinc-400 mb-2 px-1">
            {directContributors.length} Contributor{directContributors.length !== 1 ? "s" : ""}
          </p>

          {directContributors.map((contributor, i) => (
            <ContributorNode
              key={contributor.id}
              contributor={contributor}
              allContributors={contributors}
              colorIndex={i + 1}
              depth={0}
              hiddenContributorIds={hiddenContributorIds}
              onToggleSidebarVisibility={toggleSidebarVisibility}
            />
          ))}
        </div>
      )}

      {/* ── Analysis view ─────────────────────────────────────────────── */}
      {activeView === "analysis" && (
        <div className="flex flex-col flex-1 overflow-y-auto">

          {/* Focal story card with back link */}
          <div
            className="flex flex-col gap-2 mb-3 px-3 py-2 rounded-md bg-zinc-100"
            style={{ borderLeft: `3px solid ${focalColor}` }}
          >
            <p className="text-zinc-800 font-semibold text-sm leading-snug">{title}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleStoryVisibility(storyId)}
                title={focalIsShown ? "Hide from graph" : "Show on graph"}
                className={`transition-colors duration-150 ${
                  focalIsShown
                    ? "text-indigo-500 hover:text-indigo-700"
                    : "text-zinc-300 hover:text-zinc-500"
                }`}
              >
                {focalIsShown ? <EyeIcon /> : <EyeOffIcon />}
              </button>
              <button
                onClick={() => activateStoryView()}
                className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 transition-colors duration-150"
              >
                Back to Story →
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-400 mb-2 px-1">
            {analyses.length} Variant{analyses.length !== 1 ? "s" : ""} for Story
          </p>

          {analyses.length === 0 ? (
            <div className="flex items-center justify-center flex-1 text-zinc-400 text-sm">
              No analyses yet
            </div>
          ) : (
            analyses.map((analysis: AnalysisRow) => (
              <AnalysisCard key={analysis.id} variant={analysis} />
            ))
          )}
        </div>
      )}

      {/* ── Contributor view ──────────────────────────────────────────── */}
      {activeView === "contributor" && (
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Active analysis pill — click to open analysis panel */}
          {activeAnalysisId && (() => {
            const activeAnalysis = analyses.find((a) => a.id === activeAnalysisId);
            return activeAnalysis ? (
              <button
                onClick={() => activateAnalysisView()}
                className="flex items-center gap-1.5 px-3 py-1.5 mb-3 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 text-xs font-medium w-full text-left"
              >
                <ForkIcon />
                <span className="flex-1 truncate">{activeAnalysis.name}</span>
                <span>→</span>
              </button>
            ) : null;
          })()}

          <ContributorPanel />
        </div>
      )}

    </div>
  );
}