"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { Line } from "react-chartjs-2";
import ChartDragData from "chartjs-plugin-dragdata";
import { useData } from "@/contexts/DataState";
import { getTrendColor } from "@/components/StorySidebar";
import type { StoryViewState } from "@/app/story/[id]/page";
import type { TooltipItem } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

// ── Register Chart.js components ──────────────────────────────────────────────
ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  ChartDragData,
  zoomPlugin,
);

// ── Colors ────────────────────────────────────────────────────────────────────
const METRIC_COLORS = {
  weight:       "#f59e0b",
  lag:          "#06b6d4",
  relationship: "#10b981",
};

// ── Helper: hex color → rgba string ──────────────────────────────────────────
function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── TimePoint — the data shape Chart.js expects with TimeScale ───────────────
type TimePoint = { x: string; y: number };

function normalizeTs(ts: string): string {
  return ts.slice(0, 10); // "2024-01-01T00:00:00Z" → "2024-01-01"
}

function futureMonths(lastTs: string, count: number): string[] {
  const result: string[] = [];
  const d = new Date(lastTs);
  for (let i = 1; i <= count; i++) {
    const next = new Date(d);
    next.setMonth(next.getMonth() + i);
    result.push(next.toISOString().slice(0, 10));
  }
  return result;
}

// ── axisId: deterministic y-axis ID from unit + denomination ─────────────────
function axisId(unit: string | null | undefined, denomination: number | null | undefined): string {
  const u = (unit ?? "").trim().toLowerCase();
  const d = denomination ?? 1;
  return `y_${u}_${d}`.replace(/[^a-z0-9_]/g, "_");
}

// ── formatValue: format a raw value for tooltip display ──────────────────────
function formatValue(value: number, unit: string | null | undefined, denomination: number | null | undefined): string {
  const u = (unit ?? "").trim();
  const den = denomination ?? 1;
  const scaled = value * den;
  const compact = (n: number): string => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "B";
    if (abs >= 1_000_000)     return (n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "M";
    if (abs >= 1_000)         return (n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "K";
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
  if (u === "%")                    return value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + "%";
  if (u === "USD" || u === "$")     return "$" + compact(scaled);
  if (u === "ratio")                return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (u === "days")                 return Math.round(value) + " days";
  if (u.toLowerCase() === "people") return compact(scaled) + " people";
  return compact(scaled) + (u ? " " + u : "");
}

// ── Helper: build a Chart.js dataset ─────────────────────────────────────────
function makeDataset(
  label:     string,
  data:      { x: string; y: number | null }[] | TimePoint[],
  color:     string,
  opacity:   number,
  lineStyle: "solid" | "dashed" | "dotted" = "solid",
  draggable  = false,
  yAxisID    = "y_default",
  _dataId:   string | undefined = undefined,
) {
  const borderDash =
    lineStyle === "dashed" ? [6, 3] :
    lineStyle === "dotted" ? [2, 2] : [];

  return {
    label,
    data,
    yAxisID,
    _dataId,                          // custom field — used by onDragEnd for insert/update
    spanGaps:             true,
    borderColor:          rgba(color, opacity),
    backgroundColor:      rgba(color, opacity * 0.08),
    borderWidth:          2,
    borderDash,
    pointRadius:          draggable ? 4 : 0,
    pointHoverRadius:     draggable ? 6 : 3,
    pointBackgroundColor: rgba(color, opacity),
    pointHitRadius:       draggable ? 25 : 4,
    tension:              0.3,
    dragData:             draggable,
  };
}

// ── toPoints: sparse conversion — used for non-draggable read-only series ────
// Returns only the timestamps that have actual data. On a TimeScale, Chart.js
// naturally leaves visual gaps when x positions are non-contiguous.
function toPoints(rows: { timestamp: string; value: number }[]): TimePoint[] {
  return rows.map(v => ({ x: normalizeTs(v.timestamp), y: v.value }));  // ← normalize here
}

// ── toFullPoints: full-axis population for draggable series ───────────────────
// Walks every timestamp in the master timeAxis and emits { x, y: value } where
// data exists and { x, y: null } where it does not. This means:
//   • dragData can read .x from every slot without crashing
//   • null y-slots are visually empty but become draggable placeholders
//   • onDragEnd can detect null→value as a "create new analysis point" operation
function toFullPoints(
  rows: { timestamp: string; value: number }[],
  timeAxis: string[],
): { x: string; y: number | null }[] {
  const byTimestamp = new Map(
    rows.map(r => [normalizeTs(r.timestamp), r.value])  // ← normalize here
  );
  return timeAxis.map(ts => ({
    x: ts,
    y: byTimestamp.has(ts) ? byTimestamp.get(ts)! : null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// RangeSlider
//
// Now receives the full sorted timeAxis array instead of a point count.
// Percentages are mapped to actual timestamps for the zoom call, so the
// slider window always corresponds to real calendar positions.
// ─────────────────────────────────────────────────────────────────────────────
function RangeSlider({
  timeAxis,
  onRangeChange,
}: {
  timeAxis:      string[];
  onRangeChange: (minTime: string, maxTime: string) => void;
}) {
  const [range, setRange]    = useState({ min: 0, max: 100 });
  const trackRef             = useRef<HTMLDivElement>(null);
  const dragging             = useRef<"min" | "max" | "window" | null>(null);
  const dragStartX           = useRef(0);
  const dragStartRange       = useRef({ min: 0, max: 100 });

  // Convert % → timestamp string
  const pctToTime = useCallback((pct: number): string => {
    if (timeAxis.length === 0) return "";
    const idx = Math.round((pct / 100) * (timeAxis.length - 1));
    return timeAxis[Math.max(0, Math.min(timeAxis.length - 1, idx))];
  }, [timeAxis]);

  const commit = useCallback((min: number, max: number) => {
    setRange({ min, max });
    onRangeChange(pctToTime(min), pctToTime(max));
  }, [onRangeChange, pctToTime]);

  const onMouseDown = (handle: "min" | "max" | "window") =>
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current       = handle;
      dragStartX.current     = e.clientX;
      dragStartRange.current = { ...range };

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const rect  = trackRef.current?.getBoundingClientRect();
        if (!rect) return;
        const delta = ((ev.clientX - dragStartX.current) / rect.width) * 100;
        const { min: sMin, max: sMax } = dragStartRange.current;

        if (dragging.current === "min") {
          commit(Math.max(0, Math.min(sMax - 5, sMin + delta)), sMax);
        } else if (dragging.current === "max") {
          commit(sMin, Math.min(100, Math.max(sMin + 5, sMax + delta)));
        } else {
          const width   = sMax - sMin;
          const nextMin = Math.max(0, Math.min(100 - width, sMin + delta));
          commit(nextMin, nextMin + width);
        }
      };

      const onUp = () => {
        dragging.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };

  const { min, max } = range;

  return (
    <div className="relative w-full h-8 flex items-center px-1 select-none" ref={trackRef}>
      <div className="absolute inset-x-1 h-1.5 rounded-full bg-zinc-200" />
      <div
        className="absolute h-1.5 rounded-full bg-purple-200 cursor-grab active:cursor-grabbing"
        style={{ left: `${min}%`, width: `${max - min}%` }}
        onMouseDown={onMouseDown("window")}
      />
      <div
        className="absolute w-3 h-3 rounded-full bg-purple-600 border-2 border-white shadow cursor-col-resize z-10"
        style={{ left: `${min}%`, top: "50%", transform: "translate(-50%, -50%)" }}
        onMouseDown={onMouseDown("min")}
      />
      <div
        className="absolute w-3 h-3 rounded-full bg-purple-600 border-2 border-white shadow cursor-col-resize z-10"
        style={{ left: `${max}%`, top: "50%", transform: "translate(-50%, -50%)" }}
        onMouseDown={onMouseDown("max")}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GraphToolBar
//
// Whatever look at me I'm the GraphToolBar, I bet you like that don't you
// ─────────────────────────────────────────────────────────────────────────────
function GraphToolbar({ viewState }: { viewState: StoryViewState }) {
  const isEditing = viewState.activeView === "contributor";
  return (
    <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5">
      {/* Left — edit mode indicator */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
        isEditing ? "border-indigo-300 bg-indigo-50 text-indigo-600" : "border-zinc-200 text-zinc-300"
      }`}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 1l8 5-4.5 1L4 11 2 1z" fill="currentColor"/>
        </svg>
        Edit Points
      </div>

      {/* Right — save actions */}
      <div className="flex items-center gap-2">
        {viewState.isDirty && <span className="text-xs text-zinc-400">Unsaved changes</span>}
        <button
          onClick={viewState.onSave}
          disabled={!viewState.isDirty}
          className="text-sm px-3 py-1.5 text-zinc-600 hover:border-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StoryGraph
// ─────────────────────────────────────────────────────────────────────────────
export default function StoryGraph({ viewState }: { viewState: StoryViewState }) {
  const {
    assembledStory,
    activeStoryDoc,
    activeAnalysisId,
    allDataValues,
    setAllDataValues,
    allWeightValues,
    setAllWeightValues,
    allLagValues,
    setAllLagValues,
    allRelationshipValues,
    setAllRelationshipValues,
  } = useData();

  const chartRef = useRef<ChartJS<"line", any[]>>(null);

  const {
    activeView,
    shownStoryTrend,
    shownStoryAnalysis,
    shownContributorIds,
    shownWeightIds,
    shownLagIds,
    shownRelationshipIds,
    shownAnalysisIds,
    activeEditSeries,
    onPointEdited,
  } = viewState;

  const activeEditSeriesRef = useRef(activeEditSeries);
  useEffect(() => { activeEditSeriesRef.current = activeEditSeries; }, [activeEditSeries]);

  // ── Handle range slider → zoom the chart ───────────────────────────────────
  // Receives actual timestamp strings, converts to ms for TimeScale zoom.
  const handleRangeChange = useCallback((minTime: string, maxTime: string) => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.zoomScale(
      "x",
      { min: new Date(minTime).getTime(), max: new Date(maxTime).getTime() },
      "default",
    );
  }, []);

  // ── Build timeAxis + datasets ───────────────────────────────────────────────
  const { timeAxis, datasets, axisRegistry } = useMemo(() => {
    if (!assembledStory) return { timeAxis: [], datasets: [], axisRegistry: new Map() };

    // ── Collect every timestamp across all series into a sorted unique axis ───
    // Used only to drive the RangeSlider. Chart.js itself positions each
    // TimePoint by its x value — this array is not passed to the chart.
    const allTimestamps = new Set<string>();
    assembledStory.trendDataValues.forEach((v) => allTimestamps.add(v.timestamp));
    assembledStory.dataValues.forEach((v) => allTimestamps.add(v.timestamp));
    assembledStory.analyses?.forEach(a => {                           
      a.dataValues.forEach(v => allTimestamps.add(v.timestamp));      
    });
    assembledStory.contributors.forEach((c) => {
      c.trendDataValues.forEach((v) => allTimestamps.add(v.timestamp));
      c.mergedDataValues.forEach((v) => allTimestamps.add(v.timestamp));
    });
    let timeAxis = Array.from(allTimestamps).sort();
    if (activeView === "contributor" && timeAxis.length > 0) {
      const extensions = futureMonths(timeAxis[timeAxis.length - 1], 3);
      timeAxis = [...timeAxis, ...extensions];
    }

    const datasets: ReturnType<typeof makeDataset>[] = [];
    const storyColor = getTrendColor(0);

    // Axis registry: maps axisId → { unit, denomination } for scale generation
    // and tooltip formatting.
    const axisRegistry = new Map<string, { unit: string; denomination: number }>();
    const storyUnit = assembledStory.meta?.unit        ?? "";
    const storyDen  = assembledStory.meta?.denomination ?? 1;
    const storyAxis = axisId(storyUnit, storyDen);
    axisRegistry.set(storyAxis, { unit: storyUnit, denomination: storyDen });

    const storyDataId = assembledStory.dataId ?? "";

    // ── STORY VIEW ────────────────────────────────────────────────────────────
    if (activeView === "story") {
      // Story trend — read-only, sparse points
      datasets.push(makeDataset(
        assembledStory.meta?.name ?? assembledStory.name,
        toPoints(assembledStory.trendDataValues),
        storyColor, shownStoryTrend ? 1 : 0, "solid", false, storyAxis,
      ));
      // Story analysis — draggable, full axis so every slot is a drag target
      datasets.push(makeDataset(
        "Analyzed",
        toPoints(assembledStory.dataValues),
        storyColor, shownStoryAnalysis ? 1 : 0, "solid", false, storyAxis, storyDataId,
      ));
      assembledStory.contributors.forEach((c, i) => {
        const color   = getTrendColor(i + 1);
        const opacity = shownContributorIds.has(c.id) ? 1 : 0;
        const cUnit   = c.meta?.unit        ?? "";
        const cDen    = c.meta?.denomination ?? 1;
        const cAxis   = axisId(cUnit, cDen);
        axisRegistry.set(cAxis, { unit: cUnit, denomination: cDen });
        // Contributor merged — draggable, full axis
        datasets.push(makeDataset(
          c.meta?.name ?? c.name,
          toPoints(c.mergedDataValues),
          color, opacity, "solid", false, cAxis, c.dataId,
        ));
      });
    }

    // ── CONTRIBUTOR VIEW ──────────────────────────────────────────────────────
    if (activeView === "contributor") {
      // Story context lines — always read-only
      datasets.push(makeDataset(
        assembledStory.meta?.name ?? assembledStory.name,
        toPoints(assembledStory.trendDataValues),
        storyColor, shownStoryTrend ? 1 : 0, "solid", false, storyAxis,
      ));
      datasets.push(makeDataset(
        "Analyzed",
        toPoints(assembledStory.dataValues),
        storyColor, shownStoryAnalysis ? 0.75 : 0, "dashed", false, storyAxis,
      ));

      const contributor = assembledStory.contributors.find((c) =>
        shownContributorIds.has(c.id)
      );
      if (contributor) {
        const color   = getTrendColor(1);
        const opacity = shownContributorIds.has(contributor.id) ? 1 : 0;
        const cUnit   = contributor.meta?.unit        ?? "";
        const cDen    = contributor.meta?.denomination ?? 1;
        const cAxis   = axisId(cUnit, cDen);
        axisRegistry.set(cAxis, { unit: cUnit, denomination: cDen });

        // Merged contributor data — draggable only if activeEditSeries === "merged"
        const mergedIsActive = activeEditSeries === "merged";
        datasets.push(makeDataset(
          contributor.meta?.name ?? contributor.name,
          mergedIsActive
            ? toFullPoints(contributor.mergedDataValues, timeAxis)
            : toPoints(contributor.mergedDataValues),
          color, opacity, "solid", mergedIsActive, cAxis,
          mergedIsActive ? contributor.dataId : undefined,
        ));

        // Weight — draggable only if activeEditSeries === "weight"
        if (shownWeightIds.size > 0) {
          axisRegistry.set("y_ratio", { unit: "ratio", denomination: 1 });
          const isActive = activeEditSeries === "weight";
          datasets.push(makeDataset(
            "Weight",
            isActive ? toFullPoints(contributor.weightValues, timeAxis) : toPoints(contributor.weightValues),
            METRIC_COLORS.weight, 1, "dashed", isActive, "y_ratio",
            isActive ? contributor.dataId : undefined,
          ));
        }
        

        // Lag — draggable only if activeEditSeries === "lag"
        if (shownLagIds.size > 0) {
          axisRegistry.set("y_days", { unit: "days", denomination: 1 });
          const isActive = activeEditSeries === "lag";
          datasets.push(makeDataset(
            "Lag",
            isActive ? toFullPoints(contributor.lagValues, timeAxis) : toPoints(contributor.lagValues),
            METRIC_COLORS.lag, 1, "dashed", isActive, "y_days",
            isActive ? contributor.dataId : undefined,
          ));
        }

        // Relationship — draggable only if activeEditSeries === "relationship"
        if (shownRelationshipIds.size > 0) {
          axisRegistry.set("y_ratio", { unit: "ratio", denomination: 1 });
          const isActive = activeEditSeries === "relationship";
          datasets.push(makeDataset(
            "Relationship",
            isActive ? toFullPoints(contributor.relationshipValues, timeAxis) : toPoints(contributor.relationshipValues),
            METRIC_COLORS.relationship, 1, "dashed", isActive, "y_ratio",
            isActive ? contributor.dataId : undefined,
          ));
        }
      }
    }

    // ── ANALYSIS VIEW ─────────────────────────────────────────────────────────
    if (activeView === "analysis") {
      datasets.push(makeDataset(
        assembledStory.meta?.name ?? assembledStory.name,
        toPoints(assembledStory.trendDataValues),
        storyColor, shownStoryTrend ? 1 : 0, "solid", false, storyAxis,
      ));
      assembledStory.analyses
        .sort((a, b) => a.id === "RootAnalysis" ? -1 : 1)
        .forEach((analysis, i) => {
          const color   = getTrendColor(i + 1);
          const isShown = shownAnalysisIds.has(analysis.id);
          datasets.push(makeDataset(
            analysis.name,
            toPoints(analysis.dataValues),
            color, isShown ? 1 : 0,
            analysis.id === "RootAnalysis" ? "solid" : "dashed",
            false, storyAxis, analysis.dataId,
          ));
        });
    }

    return { timeAxis, datasets, axisRegistry };
  }, [
    assembledStory,
    activeStoryDoc,
    activeAnalysisId,
    allDataValues,
    activeView,
    shownStoryTrend,
    shownStoryAnalysis,
    shownContributorIds,
    shownWeightIds,
    shownLagIds,
    shownRelationshipIds,
    shownAnalysisIds,
    activeEditSeries,
  ]);

  // ── Dynamic y-scales from axisRegistry ───────────────────────────────────
  const yScales = useMemo(() => {
    const scales: Record<string, any> = {};
    let pos: "left" | "right" = "left";
    axisRegistry.forEach((_info, id) => {
      scales[id] = { type: "linear", position: pos, grid: { display: false }, border: { display: false }, ticks: { display: false } };
      pos = pos === "left" ? "right" : "left";
    });
    if (!scales["y_default"]) scales["y_default"] = { type: "linear", display: false };
    return scales;
  }, [axisRegistry]);

  // ── Chart options ───────────────────────────────────────────────────────────
  const options = useMemo((): ChartOptions<"line"> => ({
    responsive:          true,
    maintainAspectRatio: false,
    animation:           { duration: 300 },

    plugins: {
      legend: { display: false },

      // ── Drag ─────────────────────────────────────────────────────────────
      dragData: {
        round:       2,
        showTooltip: true,
        onDragEnd: (_e: any, datasetIndex: number, index: number, value: any) => {
          const numericValue = typeof value === "object" && value !== null ? value.y : value;
          const ds = datasets[datasetIndex];
          if (!ds?.dragData) return;

          const point = (ds.data as { x: string; y: number | null }[])[index];
          if (!point?.x) return;
          const timestamp = normalizeTs(point.x);
          const dataId = (ds as any)._dataId as string | undefined;
          if (!dataId) return;

          // Read current series type from ref — never stale
          const series = activeEditSeriesRef.current;

          const allValues =
            series === "weight"       ? allWeightValues :
            series === "lag"          ? allLagValues :
            series === "relationship" ? allRelationshipValues :
            allDataValues;

          const setter: any =
            series === "weight"       ? setAllWeightValues :
            series === "lag"          ? setAllLagValues :
            series === "relationship" ? setAllRelationshipValues :
            setAllDataValues;

          const existingIdx = allValues.findIndex(
            r => r.dataId === dataId && normalizeTs(r.timestamp) === timestamp
          );

          if (existingIdx >= 0) {
            setter((prev: any[]) =>
              prev.map((row: any, i: number) => i === existingIdx ? { ...row, value: numericValue } : row)
            );
          } else {
            setter((prev: any[]) => [...prev, { timestamp, value: numericValue, dataId }]);
          }
          onPointEdited();
        },
      },

      // ── Tooltip ───────────────────────────────────────────────────────────
      tooltip: {
        mode:            "nearest",
        intersect:       false,
        backgroundColor: "white",
        borderColor:     "#f3e8ff",
        borderWidth:     1,
        titleColor:      "#a1a1aa",
        titleFont:       { size: 11 },
        bodyColor:       "#3f3f46",
        bodyFont:        { size: 12 },
        padding:         10,
        filter: (item: TooltipItem<"line">) => item.parsed.y !== null,
        callbacks: {
          label: (ctx: TooltipItem<"line">) => {
            if (ctx.parsed.y === null) return "";
            const yId      = (ctx.dataset as any).yAxisID ?? "";
            const axisInfo = axisRegistry.get(yId);
            const formatted = axisInfo
              ? formatValue(ctx.parsed.y, axisInfo.unit, axisInfo.denomination)
              : Number(ctx.parsed.y).toLocaleString();
            return `  ${ctx.dataset.label}: ${formatted}`;
          },
        },
      },

      zoom: {
        zoom:  { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        pan:   { enabled: true, mode: "x" },
        limits: { x: { minRange: 1000 * 60 * 60 * 24 * 30 } }, // minimum 30-day window
      },

    } as any,

    scales: {
      x: {
        type: "time",
        time: {
          tooltipFormat:  "yyyy-MM",
          displayFormats: { month: "MMM yyyy", year: "yyyy" },
        },
        grid:   { display: false },
        border: { display: false },
        ticks:  { display: false },
      },
      ...yScales,
    },
  }), [datasets, allDataValues, setAllDataValues, allWeightValues, setAllWeightValues, allLagValues, setAllLagValues, allRelationshipValues, setAllRelationshipValues, axisRegistry, yScales]);
  // ── Render ──────────────────────────────────────────────────────────────────
  if (!assembledStory) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 text-sm">
        Loading...
      </div>
    );
  }

  const chartData: ChartData<"line", any[]> = { datasets };

  return (
    <div className="flex flex-col w-full h-full px-2 py-2">
      <GraphToolbar viewState={viewState} />

      <div className="flex-1 min-h-0 px-2 pt-1">
        <Line
          key={activeView}
          ref={chartRef}
          data={chartData}
          options={options}
        />
      </div>

      {timeAxis.length > 0 && (
        <div className="shrink-0 pt-1 pb-1">
          <RangeSlider
            timeAxis={timeAxis}
            onRangeChange={handleRangeChange}
          />
        </div>
      )}

    </div>
  );
}