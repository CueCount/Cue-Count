"use client";

import { useState } from "react";
import { useData } from "@/contexts/DataState";
import Breadcrumb from "@/components/Breadcrumb";
import type { AssembledContributor } from "@/types/db";
import type { StoryViewState } from "@/app/story/[id]/page";

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

// ── Stat pill ─────────────────────────────────────────────────────────────────

function Stat({ icon, value }: { icon: React.ReactNode; value: string | number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-indigo-500">
      {icon}
      {value}
    </span>
  );
}

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

// ── Relationship type badge ───────────────────────────────────────────────────

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

// ── Metric series row ─────────────────────────────────────────────────────────

function MetricSeriesRow({
  label,
  color,
  ids,
  shownIds,
  toggleFn,
}: {
  label:    string;
  color:    string;
  ids:      string[];
  shownIds: Set<string>;
  toggleFn: (id: string) => void;
}) {
  const isShown = ids.length > 0 && ids.some((id) => shownIds.has(id));

  function toggle() {
    ids.forEach((id) => {
      const currentlyShown = shownIds.has(id);
      if (isShown && currentlyShown)   toggleFn(id);
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

// ── Analysis card ─────────────────────────────────────────────────────────────

type AnalysisEntry = { id: string; Name?: string; createdAt?: string };

function AnalysisCard({
  variant,
  viewState,
}: {
  variant:   AnalysisEntry;
  viewState: StoryViewState;
}) {
  const { activeAnalysisId, setActiveAnalysisId } = useData();
  const isActive = activeAnalysisId === variant.id;
  const isShown  = viewState.shownAnalysisIds.has(variant.id);

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
      onClick={() => setActiveAnalysisId(isActive ? "RootAnalysis" : variant.id)}
    >
      <p className={`text-sm font-medium leading-snug ${isActive ? "text-indigo-700" : "text-zinc-700"}`}>
        {variant.Name ?? "Unnamed variant"}
      </p>
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
  );
}

// ── ContributorPanel ──────────────────────────────────────────────────────────
// Shown when activeView === "contributor".
// Story pair toggles shown at top; contributor pair + metrics below.

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
            shown={isShown}
            onToggle={() => viewState.onToggleContributor(contributor.id)}
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

      {/* Metric series rows */}
      <MetricSeriesRow
        label="Weight"
        color={METRIC_COLORS.weight}
        ids={contributor.weightValues.map((w) => w.id)}
        shownIds={viewState.shownWeightIds}
        toggleFn={viewState.onToggleWeight}
      />
      <MetricSeriesRow
        label="Lag"
        color={METRIC_COLORS.lag}
        ids={contributor.lagValues.map((l) => l.id)}
        shownIds={viewState.shownLagIds}
        toggleFn={viewState.onToggleLag}
      />
      <MetricSeriesRow
        label="Relationship Value"
        color={METRIC_COLORS.relationshipValue}
        ids={contributor.relationshipValues.map((r) => r.id)}
        shownIds={viewState.shownRelationshipIds}
        toggleFn={viewState.onToggleRelationship}
      />
    </div>
  );
}

// ── ContributorNode ───────────────────────────────────────────────────────────
// One row per contributor in the story view list.
// Single eye toggle controls the whole TrendData + analysis pair.

function ContributorNode({
  contributor,
  colorIndex,
  viewState,
}: {
  contributor: AssembledContributor;
  colorIndex:  number;
  viewState:   StoryViewState;
}) {
  const color        = getTrendColor(colorIndex);
  const isShown      = viewState.shownContributorIds.has(contributor.id);
  const latestWeight = contributor.weightValues.at(-1)?.value ?? null;
  const relType      = (contributor.relationshipTypeValues.at(-1)?.value as string) ?? null;

  return (
    <div
      className="flex flex-col gap-1.5 py-2 px-3 rounded-md bg-zinc-100 mb-1.5"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-zinc-700 text-sm leading-snug">{contributor.name}</p>
        {relType && <RelBadge type={relType} />}
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
          <p className="text-indigo-500 text-sm leading-snug">Open Relationship</p>
        </button>
      </div>
    </div>
  );
}

// ── StorySidebar ──────────────────────────────────────────────────────────────

export default function StorySidebar({ viewState }: { viewState: StoryViewState }) {
  const {
    assembledStory,
    activeStoryDoc,
    activeAnalysisId,
    perspectives,
  } = useData();

  if (!assembledStory) return null;

  const { id: storyId, name: title, trendDataValues, contributors } = assembledStory;

  const perspective = perspectives.find((p) => p.id === activeStoryDoc?.perspectiveId);

  const activeAnalysisEntry = activeAnalysisId
    ? { id: activeAnalysisId, ...(activeStoryDoc?.Analysis?.[activeAnalysisId] as any) }
    : null;

  const analyses: AnalysisEntry[] = Object.entries(activeStoryDoc?.Analysis ?? {})
    .sort(([a]) => a === "RootAnalysis" ? -1 : 1)
    .map(([id, entry]) => ({ id, ...(entry as any) }));

  const activeContributor = viewState.activeView === "contributor"
    ? contributors.find((c) => c.id === viewState.activeContributorId) ?? null
    : null;

  const focalColor = getTrendColor(0);

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

    </div>
  );
}