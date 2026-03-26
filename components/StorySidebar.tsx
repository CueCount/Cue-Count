"use client";

import { useState } from "react";
import type {
  TrendWithValues,
  ContributorWithDetail,
  VariantRow,
} from "@/types/db";
import { useUI } from "@/contexts/UIState";
import { useData } from "@/contexts/DataState";

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

// ── Icons ──────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" />
      <path d="M6 9v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V9" />
      <line x1="12" y1="12" x2="12" y2="15" />
    </svg>
  );
}

function BarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="4" height="18" rx="1" />
      <rect x="10" y="8" width="4" height="13" rx="1" />
      <rect x="17" y="5" width="4" height="16" rx="1" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ── Props ──────────────────────────────────────────────────────────────
// CHANGED: removed activeTrendId and onTrendHover props — these now live
// in UIState and are read directly via useUI() inside this component
// and ContributorNode. No more prop drilling from the page.
type Props = {
  title: string;
  storyId: string;
  focalTrend: TrendWithValues;
  contributors: ContributorWithDetail[]; // CHANGED: was StoryContributorWithDetail
};

// CHANGED: "extrapolate" → "variants"
type Tab = "contributors" | "variants";

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

// ── Variant card ───────────────────────────────────────────────────────
// ADDED: new component — renders one row in the Variants tab.
// Reads activeVariantId from UIState; setActiveVariantId auto-resets
// hiddenTrendIds via the wrapped handler in UIProvider.
function VariantCard({ variant }: { variant: VariantRow }) {
  const { activeVariantId, setActiveVariantId } = useData();
  const isActive = activeVariantId === variant.id;

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
      onClick={() => setActiveVariantId(isActive ? null : variant.id)}
    >
      <p className={`text-sm font-medium leading-snug ${isActive ? "text-indigo-700" : "text-zinc-700"}`}>
        {variant.name ?? "Unnamed variant"}
      </p>
      <div className="flex items-center gap-2">
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

// ── Contributor node ───────────────────────────────────────────────────
function ContributorNode({
  contributor,
  allContributors,
  colorIndex,
  depth,
  hiddenContributorIds,
  onToggleSidebarVisibility,
}: {
  contributor: ContributorWithDetail;  // CHANGED: was StoryContributorWithDetail
  allContributors: ContributorWithDetail[];
  colorIndex: number;
  depth: number;
  hiddenContributorIds: Set<string>;
  onToggleSidebarVisibility: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
 
  // CHANGED: activeTrendId and setActiveTrendId now come from UIState
  // directly — no longer passed as props from the page
  const { isTrendHidden, toggleTrendVisibility, activeTrendId, setActiveTrendId } = useUI();
 
  const story  = contributor.contributorStory;
  const trend  = story.focalTrend;
  const color  = getTrendColor(colorIndex);
 
  const isHiddenOnGraph  = isTrendHidden(trend.id);
  // "Hide" button collapses this node's children by toggling story.id in the set.
  // Children check hiddenContributorIds.has(contributor.focalStoryId) to know
  // whether their parent has hidden them — the node itself is never removed.
  const isChildrenHidden = hiddenContributorIds.has(story.id);
 
  const children    = allContributors.filter((c) => c.focalStoryId === story.id);
  const hasChildren = children.length > 0;
 
  const latestWeight = contributor.weights.at(-1)?.value ?? null;
  const relType      = contributor.type;
 
  return (
    <div style={{ width: `calc(100% - ${depth * 10}px)` }}>
      <div
        className={`
          flex flex-col gap-1.5 py-2 px-3 rounded-md bg-zinc-100 mb-1.5
          transition-opacity duration-150
          ${isHiddenOnGraph
            ? "opacity-40"
            : activeTrendId && activeTrendId !== trend.id
              ? "opacity-60"
              : "opacity-100"
          }
        `}
        style={{ borderLeft: `3px solid ${color}` }}
        onMouseEnter={() => setActiveTrendId(trend.id)}
        onMouseLeave={() => setActiveTrendId(null)}
      >
        {/* Chevron + story name */}
        <div className="flex items-center gap-1.5">
          {hasChildren ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-zinc-400 hover:text-zinc-600 shrink-0"
            >
              <ChevronIcon open={expanded} />
            </button>
          ) : (
            <span className="w-[11px] shrink-0" />
          )}
          <p className="text-zinc-700 text-sm leading-snug">{story.name}</p>
        </div>
 
        {/* Stats row */}
        <div className="flex items-center gap-2 pl-[19px]">
          <button
            onClick={() => toggleTrendVisibility(trend.id)}
            title={isHiddenOnGraph ? "Show on graph" : "Hide from graph"}
            className={`transition-colors duration-150 ${
              isHiddenOnGraph
                ? "text-zinc-300 hover:text-zinc-500"
                : "text-indigo-500 hover:text-indigo-700"
            }`}
          >
            {isHiddenOnGraph ? <EyeOffIcon /> : <EyeIcon />}
          </button>
 
          <RelBadge type={relType} />
 
          {latestWeight !== null && (
            <Stat icon={<FilterIcon />} value={latestWeight.toFixed(2)} />
          )}
          <Stat icon={<ForkIcon />} value={children.length} />
          <Stat icon={<BarIcon />} value={trend.values.length} />
 
          {/* Passes story.id so the toggle hides/shows this node's children */}
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
 
      {/* Children — hidden when isChildrenHidden, collapsed when !expanded */}
      {hasChildren && expanded && !isChildrenHidden && (
        <div className="ml-[5px]">
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

// ── Component ──────────────────────────────────────────────────────────
export default function StorySidebar({
  title,
  storyId,
  focalTrend,
  contributors,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("contributors");
  const [hiddenContributorIds, setHiddenContributorIds] = useState<Set<string>>(new Set());

  // CHANGED: activeTrendId/onTrendHover no longer props — read from UIState
  const { isTrendHidden, toggleTrendVisibility, activeTrendId, setActiveTrendId } = useUI();

  // ADDED: reads variants from DataState for the Variants tab
  const { variants } = useData();

  const focalHiddenOnGraph = isTrendHidden(focalTrend.id);
  const focalColor = getTrendColor(0);

  function toggleSidebarVisibility(id: string) {
    setHiddenContributorIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Direct contributors are relationships where focalStoryId = this story.
  // CHANGED: was filtering StoryContributorWithDetail[]; now filtering
  // ContributorWithDetail[] — field name focalStoryId is the same.
  const directContributors = contributors.filter((c) => c.focalStoryId === storyId);

  return (
    <div className="flex flex-col h-full">

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      {/* CHANGED: "extrapolate" tab renamed to "variants" */}
      <div className="flex border-b border-zinc-100 mb-4">
        {(["contributors", "variants"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium capitalize
              border-b-2 -mb-px transition-colors duration-150
              ${activeTab === tab
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
              }
            `}
          >
            {tab === "contributors" ? <BarIcon /> : <ForkIcon />}
            {tab}
          </button>
        ))}
      </div>

      {/* ── Contributors Tab ───────────────────────────────────────── */}
      {activeTab === "contributors" && (
        <div className="flex flex-col flex-1 overflow-y-auto">

          {/* Focal story row */}
          {/* CHANGED: hover handlers now call setActiveTrendId from UIState */}
          <div
            className="flex flex-col gap-2 mb-2 px-3 py-2 rounded-md bg-zinc-100"
            style={{ borderLeft: `3px solid ${focalColor}` }}
            onMouseEnter={() => setActiveTrendId(focalTrend.id)}
            onMouseLeave={() => setActiveTrendId(null)}
          >
            <p className={`text-zinc-800 font-semibold text-sm leading-snug transition-opacity duration-150 ${
              activeTrendId && activeTrendId !== focalTrend.id ? "opacity-60" : "opacity-100"
            }`}>
              {title}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleTrendVisibility(focalTrend.id)}
                title={focalHiddenOnGraph ? "Show on graph" : "Hide from graph"}
                className={`transition-colors duration-150 ${
                  focalHiddenOnGraph
                    ? "text-zinc-300 hover:text-zinc-500"
                    : "text-indigo-500 hover:text-indigo-700"
                }`}
              >
                {focalHiddenOnGraph ? <EyeOffIcon /> : <EyeIcon />}
              </button>
              <Stat icon={<ForkIcon />} value={contributors.length} />
              <Stat icon={<BarIcon />} value={focalTrend.values.length} />
            </div>
          </div>

          {/* Contributor tree */}
          {/* CHANGED: onTrendHover prop removed — ContributorNode reads useUI() directly */}
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

      {/* ── Variants Tab ───────────────────────────────────────────── */}
      {/* CHANGED: was "Extrapolate coming soon" placeholder.
          Now renders the real variant list from DataState.
          Variants are scoped to the root story — DataState guarantees this. */}
      {activeTab === "variants" && (
        <div className="flex flex-col flex-1 overflow-y-auto">
          {variants.length === 0 ? (
            <div className="flex items-center justify-center flex-1 text-zinc-400 text-sm">
              No variants yet
            </div>
          ) : (
            variants.map((variant) => (
              <VariantCard key={variant.id} variant={variant} />
            ))
          )}
        </div>
      )}

    </div>
  );
}