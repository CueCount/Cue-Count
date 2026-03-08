// components/WorkspaceGraphSidebar.tsx
import type { TrendWithValues } from "@/types/db";

// ── Color palette assigned by position — UI concern, not a DB field ──────────
export const TREND_COLORS = [
  "#c026d3", // primary (index 0)
  "#e879f9",
  "#f0abfc",
  "#f5d0fe",
  "#fae8ff",
  "#d946ef",
  "#a21caf",
];

export function getTrendColor(index: number): string {
  return TREND_COLORS[index % TREND_COLORS.length];
}

function ProjectionsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function ContributorsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="4" height="18" rx="1" />
      <rect x="10" y="8" width="4" height="13" rx="1" />
      <rect x="17" y="5" width="4" height="16" rx="1" />
    </svg>
  );
}

type Props = {
  title: string;
  yesPercent: number;
  projections: number;
  contributors: number;
  focalTrend: TrendWithValues;
  variantTrends: TrendWithValues[];  // the supporting lines
  activeTrendId: string | null;
  onTrendHover: (id: string | null) => void;
};

export default function WorkspaceGraphSidebar({
  title,
  yesPercent,
  projections,
  contributors,
  focalTrend,
  variantTrends,
  activeTrendId,
  onTrendHover,
}: Props) {
  const primaryColor = getTrendColor(0);

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* Story title */}
      <h2 className="text-zinc-800 font-semibold text-base leading-snug">
        {title}
      </h2>

      {/* Yes % verdict */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full shrink-0"
          style={{ backgroundColor: primaryColor }}
        />
        <span className="text-zinc-800 font-bold text-lg">{yesPercent}% Yes</span>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-xs font-medium text-pink-500">
          <ProjectionsIcon />
          {projections} Projections
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-pink-400">
          <ContributorsIcon />
          {contributors} Contributors
        </span>
      </div>

      {/* Focal trend label */}
      <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-pink-50 border border-pink-100">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
        <span className="text-xs font-semibold text-zinc-700">{focalTrend.name}</span>
        {focalTrend.unit && (
          <span className="text-xs text-zinc-400 ml-auto">{focalTrend.unit}</span>
        )}
      </div>

      {/* Variant trend list — hover to highlight on graph */}
      <div className="flex flex-col mt-1">
        {variantTrends.map((trend, index) => {
          const color = getTrendColor(index + 1); // +1 so focal is always index 0
          return (
            <button
              key={trend.id}
              onMouseEnter={() => onTrendHover(trend.id)}
              onMouseLeave={() => onTrendHover(null)}
              className={`
                text-left px-2 py-3 text-sm rounded-lg border-b border-zinc-100
                transition-colors duration-150
                ${activeTrendId === trend.id
                  ? "text-zinc-800 bg-zinc-50 font-medium"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
                }
              `}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span>{trend.name}</span>
                {trend.unit && (
                  <span className="text-xs text-zinc-400 ml-auto">{trend.unit}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}