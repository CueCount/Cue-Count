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
  correlation: "#10b981",
};

// ── Helper: hex color → rgba string ──────────────────────────────────────────
function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Clamp a value to its valid range for a given series type ─────────────────
function clampForSeries(series: string, value: number): number {
  if (series === "weight")      return Math.max(0, Math.min(1, value));
  if (series === "correlation") return Math.max(-1, Math.min(1, value));
  if (series === "lag")         return Math.max(0, value);
  return value; // merged — no hard clamp
}

// ── TimePoint — the data shape Chart.js expects with TimeScale ───────────────
type TimePoint = { x: string; y: number };

function normalizeTs(ts: string): string {
  return ts.slice(0, 10); // "2024-01-01T00:00:00Z" → "2024-01-01"
}

// ── nextTimestamp: advance one frequency increment ────────────────────────────
function nextTimestamp(ts: string, frequency: string): string {
  const d = new Date(ts.slice(0, 10) + "T00:00:00Z");
  switch (frequency.toLowerCase()) {
    case "monthly":   d.setUTCMonth(d.getUTCMonth() + 1);       break;
    case "weekly":    d.setUTCDate(d.getUTCDate() + 7);          break;
    case "daily":     d.setUTCDate(d.getUTCDate() + 1);          break;
    case "quarterly": d.setUTCMonth(d.getUTCMonth() + 3);        break;
    case "annual":
    case "yearly":    d.setUTCFullYear(d.getUTCFullYear() + 1);  break;
    default:          d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

// ── futureIncrements: generate N future timestamps from last using frequency ──
function futureIncrements(lastTs: string, count: number, frequency: string): string[] {
  const result: string[] = [];
  let current = lastTs;
  for (let i = 0; i < count; i++) {
    current = nextTimestamp(current, frequency);
    result.push(current);
  }
  return result;
}

// ── toStepPoints: step-function display for sparse modifier series ────────────
// Extends the last known value forward to fill gaps — used for weight, lag,
// and correlation which are sparse by design.
function toStepPoints(
  rows: { timestamp: string; value: number }[],
  timeAxis: string[],
): { x: string; y: number | null }[] {
  if (rows.length === 0) return timeAxis.map(ts => ({ x: ts, y: null }));
  const sorted = [...rows].sort((a, b) =>
    normalizeTs(a.timestamp).localeCompare(normalizeTs(b.timestamp))
  );
  const firstTs = normalizeTs(sorted[0].timestamp);
  return timeAxis.map(ts => {
    if (ts < firstTs) return { x: ts, y: null };
    let best: number | null = null;
    for (const row of sorted) {
      if (normalizeTs(row.timestamp) <= ts) best = row.value;
      else break;
    }
    return { x: ts, y: best };
  });
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
// ─────────────────────────────────────────────────────────────────────────────
function GraphToolbar({
  viewState,
  onAddNextPoint,
}: {
  viewState:       StoryViewState;
  onAddNextPoint?: () => void;
}) {
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
    allCorrelationValues,
    setAllCorrelationValues,
  } = useData();

  const chartRef = useRef<ChartJS<"line", any[]>>(null);

  // ── Point selection ────────────────────────────────────────────────────────
  const [selectedPoints, setSelectedPoints] = useState<Map<string, number>>(new Map());
  const [overlayAnchor,  setOverlayAnchor]  = useState<{ x: number; y: number } | null>(null);
  const [inputValue,     setInputValue]     = useState("");
  const [mouseX,       setMouseX]       = useState<number | null>(null);
  const [nextPointPx,  setNextPointPx]  = useState<number | null>(null);

  const chartWrapperRef   = useRef<HTMLDivElement>(null);
  const mouseDownInfo     = useRef<{ x: number; y: number; time: number } | null>(null);
  const dragStartValue    = useRef<number | null>(null);
  const isDraggingPoint   = useRef(false);
  const datasetsRef       = useRef<ReturnType<typeof makeDataset>[]>([]);
  const selectedPointsRef = useRef<Map<string, number>>(new Map());

  const {
    activeView,
    shownStoryTrend,
    shownStoryAnalysis,
    shownContributorIds,
    shownContributorTrendIds,
    shownWeightIds,
    shownLagIds,
    shownCorrelationIds,
    shownAnalysisIds,
    activeEditSeries,
    onPointEdited,
  } = viewState;

  const activeEditSeriesRef = useRef(activeEditSeries);
  useEffect(() => { activeEditSeriesRef.current = activeEditSeries; }, [activeEditSeries]);

  // Clear selection when user switches view or edit series
  useEffect(() => {
    setSelectedPoints(new Map());
    setOverlayAnchor(null);
    setInputValue("");
  }, [activeView, activeEditSeries]);

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

  // ── writePoint — shared by drag and input apply ────────────────────────────
  const writePoint = useCallback((
    series: string,
    dataId: string,
    timestamp: string,
    value: number,
  ) => {
    const allValues =
      series === "weight"      ? allWeightValues :
      series === "lag"         ? allLagValues :
      series === "correlation" ? allCorrelationValues :
      allDataValues;

    const setter: any =
      series === "weight"      ? setAllWeightValues :
      series === "lag"         ? setAllLagValues :
      series === "correlation" ? setAllCorrelationValues :
      setAllDataValues;

    const existingIdx = allValues.findIndex(
      r => r.dataId === dataId && normalizeTs(r.timestamp) === timestamp
    );
    if (existingIdx >= 0) {
      setter((prev: any[]) =>
        prev.map((row: any, i: number) => i === existingIdx ? { ...row, value } : row)
      );
    } else {
      setter((prev: any[]) => [...prev, { timestamp, value, dataId }]);
    }
  }, [allDataValues, allWeightValues, allLagValues, allCorrelationValues,
      setAllDataValues, setAllWeightValues, setAllLagValues, setAllCorrelationValues]);

  // ── applyInputValue — commit input field value to selected points ──────────
  const applyInputValue = useCallback(() => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed)) return;
    const series = activeEditSeriesRef.current;
    const pts    = selectedPointsRef.current;
    const isMulti = pts.size > 1;

    pts.forEach((currentVal, key) => {
      const [dsIdx, ptIdx] = key.split(":").map(Number);
      const ds = datasetsRef.current[dsIdx] as any;
      if (!ds?._dataId) return;
      const point = (ds.data as any[])[ptIdx];
      if (!point?.x) return;
      const newValue = clampForSeries(series, isMulti ? currentVal + parsed : parsed);
      writePoint(series, ds._dataId, normalizeTs(point.x), newValue);
    });

    setSelectedPoints(prev => {
      const next = new Map(prev);
      next.forEach((val, key) => {
        next.set(key, clampForSeries(series, next.size > 1 ? val + parsed : parsed));
      });
      return next;
    });

    if (isMulti) setInputValue("");
    onPointEdited();
  }, [inputValue, writePoint, onPointEdited]);

  useEffect(() => {
    const canvas = chartRef.current?.canvas;
    if (!canvas) return;

    const onDown = (e: MouseEvent) => {
      console.log("[click] onDown fired", e.clientX, e.clientY);
      mouseDownInfo.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    };

    const onUp = (e: MouseEvent) => {
      console.log("[click] onUp fired");
      const down = mouseDownInfo.current;
      mouseDownInfo.current = null;
      if (!down) return;
      const dist    = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const elapsed = Date.now() - down.time;
      console.log("[click] dist:", dist, "elapsed:", elapsed);
      if (dist > 6 || elapsed > 300) return;

      const chart = chartRef.current;
      if (!chart) return;

      const elements = chart.getElementsAtEventForMode(
        e, "nearest", { intersect: true }, false
      );
      console.log("[click] elements found:", elements.length, elements);

      if (elements.length === 0) {
        setSelectedPoints(new Map());
        setOverlayAnchor(null);
        setInputValue("");
        return;
      }

      const { datasetIndex, index } = elements[0];
      const ds = datasetsRef.current[datasetIndex] as any;
      if (!ds?.dragData) return;
      const point = (ds.data as any[])[index];
      if (!point || point.y === null || point.y === undefined) return;

      const key          = `${datasetIndex}:${index}`;
      const currentValue = point.y as number;

      setSelectedPoints(prev => {
        if (e.shiftKey) {
          const next = new Map(prev);
          next.has(key) ? next.delete(key) : next.set(key, currentValue);
          return next.size > 0 ? next : new Map();
        }
        if (prev.size === 1 && prev.has(key)) return new Map();
        return new Map([[key, currentValue]]);
      });

      const meta     = chart.getDatasetMeta(datasetIndex);
      const pointEl  = meta.data[index] as any;
      const wrapRect = chartWrapperRef.current?.getBoundingClientRect();
      const canvRect = canvas.getBoundingClientRect();
      if (pointEl && wrapRect) {
        setOverlayAnchor({
          x: canvRect.left - wrapRect.left + pointEl.x,
          y: canvRect.top  - wrapRect.top  + pointEl.y,
        });
      }
      setInputValue(currentValue.toFixed(2));
    };

    // capture: true fires BEFORE dragData/zoom bubble-phase listeners
    canvas.addEventListener("mousedown", onDown, { capture: true });
    document.addEventListener("pointerup", onUp, { capture: true });
    return () => {
      canvas.removeEventListener("mousedown", onDown, { capture: true });
      document.removeEventListener("pointerup", onUp, { capture: true });
    };
  }, [assembledStory?.id, activeView]); // re-attach when chart is recreated

  // ── addNextPoint — appends next frequency increment to the active series ──────
  const addNextPoint = useCallback(() => {
    if (!assembledStory) return;
    const frequency = assembledStory.meta?.frequency ?? "monthly";
    const series    = activeEditSeriesRef.current;

    // Find the active draggable dataset
    const activeDs = datasetsRef.current.find((ds: any) => ds.dragData) as any;
    if (!activeDs?._dataId) return;

    // Find last non-null point
    const points = (activeDs.data as any[]).filter((p: any) => p.y !== null && p.y !== undefined);
    if (points.length === 0) return;

    const lastTs  = points[points.length - 1].x as string;
    const lastVal = points[points.length - 1].y as number;
    const nextTs  = nextTimestamp(lastTs, frequency);

    const allValues =
      series === "weight"      ? allWeightValues :
      series === "lag"         ? allLagValues :
      series === "correlation" ? allCorrelationValues :
      allDataValues;

    const setter: any =
      series === "weight"      ? setAllWeightValues :
      series === "lag"         ? setAllLagValues :
      series === "correlation" ? setAllCorrelationValues :
      setAllDataValues;

    const exists = (allValues as any[]).some(
      (r: any) => r.dataId === activeDs._dataId && normalizeTs(r.timestamp) === nextTs
    );
    if (!exists) {
      setter((prev: any[]) => [...prev, { timestamp: nextTs, value: lastVal, dataId: activeDs._dataId }]);
      onPointEdited();
    }
  }, [assembledStory, allDataValues, allWeightValues, allLagValues, allCorrelationValues,
      setAllDataValues, setAllWeightValues, setAllLagValues, setAllCorrelationValues, onPointEdited]);

  // ── selectAllPoints — selects every non-null point in the active draggable dataset
  const selectAllPoints = useCallback(() => {
    const newSelected = new Map<string, number>();
    let anchorDsIdx = -1;
    let anchorPtIdx = -1;

    datasetsRef.current.forEach((ds: any, dsIdx: number) => {
      if (!ds.dragData) return;
      (ds.data as any[]).forEach((point: any, ptIdx: number) => {
        if (point.y !== null && point.y !== undefined) {
          newSelected.set(`${dsIdx}:${ptIdx}`, point.y as number);
          if (anchorDsIdx === -1) { anchorDsIdx = dsIdx; anchorPtIdx = ptIdx; }
        }
      });
    });

    setSelectedPoints(newSelected);

    // Position overlay at first point
    if (anchorDsIdx >= 0 && chartRef.current && chartWrapperRef.current) {
      const chart   = chartRef.current;
      const meta    = chart.getDatasetMeta(anchorDsIdx);
      const pointEl = meta.data[anchorPtIdx] as any;
      const wrapRect = chartWrapperRef.current.getBoundingClientRect();
      const canvRect = chart.canvas.getBoundingClientRect();
      if (pointEl) {
        setOverlayAnchor({
          x: canvRect.left - wrapRect.left + pointEl.x,
          y: canvRect.top  - wrapRect.top  + pointEl.y,
        });
      }
    }
    setInputValue("");
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
      const frequency  = assembledStory.meta?.frequency ?? "monthly";
      const extensions = futureIncrements(timeAxis[timeAxis.length - 1], 3, frequency);
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
        toPoints(
          assembledStory.calculatedDataValues.length > 0
            ? assembledStory.calculatedDataValues
            : assembledStory.dataValues
        ),
        storyColor, shownStoryAnalysis ? 1 : 0, "dashed", false, storyAxis,
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
        toPoints(
          assembledStory.calculatedDataValues.length > 0
            ? assembledStory.calculatedDataValues
            : assembledStory.dataValues
        ),
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

        // Contributor root — uneditable baseline, controlled by shownContributorTrendIds
        datasets.push(makeDataset(
          `${contributor.meta?.name ?? contributor.name} (Root)`,
          toPoints(contributor.trendDataValues),
          color, shownContributorTrendIds.has(contributor.id) ? opacity * 0.4 : 0, "dotted", false, cAxis,
        ));

        // Contributor merged — editable analysis line, controlled by shownContributorIds
        const mergedIsActive = activeEditSeries === "merged";
        datasets.push(makeDataset(
          contributor.meta?.name ?? contributor.name,
          mergedIsActive
            ? toFullPoints(contributor.mergedDataValues, timeAxis)
            : toPoints(contributor.mergedDataValues),
          color, opacity, "solid", mergedIsActive, cAxis,
          mergedIsActive ? contributor.dataId : undefined,
        ));

        // Weight
        if (shownWeightIds.size > 0) {
          axisRegistry.set("y_ratio", { unit: "ratio", denomination: 1 });
          const isActive = activeEditSeries === "weight";
          datasets.push(makeDataset(
            "Weight",
            isActive ? toFullPoints(contributor.weightValues, timeAxis) : toStepPoints(contributor.weightValues, timeAxis),
            METRIC_COLORS.weight, 1, "dashed", isActive, "y_ratio",
            isActive ? contributor.dataId : undefined,
          ));
        }

        // Lag
        if (shownLagIds.size > 0) {
          axisRegistry.set("y_days", { unit: "days", denomination: 1 });
          const isActive = activeEditSeries === "lag";
          datasets.push(makeDataset(
            "Lag",
            isActive ? toFullPoints(contributor.lagValues, timeAxis) : toStepPoints(contributor.lagValues, timeAxis),
            METRIC_COLORS.lag, 1, "dashed", isActive, "y_days",
            isActive ? contributor.dataId : undefined,
          ));
        }

        // Correlation
        if (shownCorrelationIds.size > 0) {
          axisRegistry.set("y_correlation", { unit: "correlation", denomination: 1 });
          const isActive = activeEditSeries === "correlation";
          datasets.push(makeDataset(
            "Correlation to Story",
            isActive ? toFullPoints(contributor.correlationValues, timeAxis) : toStepPoints(contributor.correlationValues, timeAxis),
            METRIC_COLORS.correlation, 1, "dashed", isActive, "y_correlation",
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

    // ── Highlight selected points ─────────────────────────────────────────────
    if (selectedPoints.size > 0) {
      selectedPoints.forEach((_val, key) => {
        const [dsIdx, ptIdx] = key.split(":").map(Number);
        const ds = datasets[dsIdx] as any;
        if (!ds) return;
        const len = (ds.data as any[]).length;
        if (!Array.isArray(ds.pointBackgroundColor)) {
          ds.pointBackgroundColor = Array(len).fill(ds.pointBackgroundColor);
        }
        if (!Array.isArray(ds.pointRadius)) {
          ds.pointRadius = Array(len).fill(ds.pointRadius ?? 4);
        }
        if (ptIdx < len) {
          ds.pointBackgroundColor[ptIdx] = "#ffffff";
          ds.pointRadius[ptIdx] = 8;
        }
      });
    }

    return { timeAxis, datasets, axisRegistry};
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
    shownCorrelationIds,
    shownAnalysisIds,
    activeEditSeries,
  ]);

  // ── Compute pixel x of the next future point for the floating + button ───────
  useEffect(() => {
    if (activeView !== "contributor") { setNextPointPx(null); return; }
    const chart    = chartRef.current;
    const wrapRect = chartWrapperRef.current?.getBoundingClientRect();
    const canvRect = chart?.canvas.getBoundingClientRect();
    if (!chart || !wrapRect || !canvRect) return;

    const activeDs = datasetsRef.current.find((ds: any) => ds.dragData) as any;
    if (!activeDs) return;
    const points = (activeDs.data as any[]).filter((p: any) => p.y !== null && p.y !== undefined);
    if (points.length === 0) return;

    const lastTs    = (points[points.length - 1] as any).x as string;
    const frequency = assembledStory?.meta?.frequency ?? "monthly";
    const nextTs    = nextTimestamp(lastTs, frequency);

    const canvasPx  = chart.scales.x.getPixelForValue(new Date(nextTs).getTime());
    const relX      = canvRect.left - wrapRect.left + canvasPx;
    setNextPointPx(relX);
  }, [datasets, activeView, assembledStory?.meta?.frequency]);

  // Keep refs in sync with latest render values
  datasetsRef.current       = datasets;
  selectedPointsRef.current = selectedPoints;

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
        round: 2,
        showTooltip: true,
        onDragStart: (_e: any, _datasetIndex: number, _index: number, value: any) => {
          isDraggingPoint.current = true;
          dragStartValue.current  = typeof value === "object" ? value?.y : value;
        },
        onDragEnd: (_e: any, datasetIndex: number, index: number, value: any) => {
          setTimeout(() => { isDraggingPoint.current = false; }, 50);

          const numericValue = typeof value === "object" && value !== null ? value.y : value;
          const ds = datasets[datasetIndex];
          if (!ds?.dragData) return;

          const point = (ds.data as { x: string; y: number | null }[])[index];
          if (!point?.x) return;
          const timestamp = normalizeTs(point.x);
          const dataId    = (ds as any)._dataId as string | undefined;
          if (!dataId) return;

          const series          = activeEditSeriesRef.current;
          const key             = `${datasetIndex}:${index}`;
          const currentSelected = selectedPointsRef.current;
          const isMultiDrag     = currentSelected.has(key) && currentSelected.size > 1;

          if (isMultiDrag && dragStartValue.current !== null) {
            // Apply same delta to all selected points
            const delta = numericValue - dragStartValue.current;
            currentSelected.forEach((currentVal, selKey) => {
              const [selDsIdx, selPtIdx] = selKey.split(":").map(Number);
              const selDs = datasetsRef.current[selDsIdx] as any;
              if (!selDs?._dataId) return;
              const selPoint = (selDs.data as any[])[selPtIdx];
              if (!selPoint?.x) return;
              writePoint(series, selDs._dataId, normalizeTs(selPoint.x),
                clampForSeries(series, currentVal + delta));
            });
            setSelectedPoints(prev => {
              const next = new Map(prev);
              next.forEach((val, k) => next.set(k, clampForSeries(series, val + delta)));
              return next;
            });
          } else {
            // Single point drag
            const clamped = clampForSeries(series, numericValue);
            writePoint(series, dataId, timestamp, clamped);
            if (currentSelected.has(key)) {
              setSelectedPoints(prev => new Map(prev).set(key, clamped));
            }
            setInputValue(clamped.toFixed(2));
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
  }), [datasets, allDataValues, setAllDataValues, allWeightValues, setAllWeightValues, allLagValues, setAllLagValues, allCorrelationValues, axisRegistry, yScales, writePoint, selectedPoints]);
  
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
      <GraphToolbar viewState={viewState} onAddNextPoint={addNextPoint} />

      <div
        ref={chartWrapperRef}
        className="flex-1 min-h-0 px-2 pt-1 relative"
        onMouseMove={e => {
          const rect = chartWrapperRef.current?.getBoundingClientRect();
          if (rect) setMouseX(e.clientX - rect.left);
        }}
        onMouseLeave={() => setMouseX(null)}
      >
        <Line
          key={activeView}
          ref={chartRef}
          data={chartData}
          options={options}
        />

        {/* ── Floating next-point button ──────────────────────────────────────── */}
        {activeView === "contributor" &&
        nextPointPx !== null &&
        mouseX !== null &&
        Math.abs(mouseX - nextPointPx) < 20 && (
          <button
            onClick={addNextPoint}
            style={{
              left: nextPointPx,
              top:  "50%",
              transform: "translate(-50%, -50%)",
            }}
            className="absolute z-20 w-7 h-7 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md transition-colors text-lg leading-none"
            title="Add next point"
          >
            +
          </button>
        )}

        {/* ── Point selection overlay ────────────────────────────────────────── */}
        {overlayAnchor && selectedPoints.size > 0 && (
          <div
            className="absolute z-20 bg-white rounded-xl shadow-lg border border-zinc-200 p-3 flex flex-col gap-2 min-w-[148px]"
            style={{
              left:      overlayAnchor.x,
              top:       Math.max(4, overlayAnchor.y - 100),
              transform: "translateX(-50%)",
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            {selectedPoints.size === 1 ? (
              <>
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                  {({ merged: "Data Value", weight: "Weight", lag: "Lag (days)", correlation: "Correlation" } as any)[activeEditSeries] ?? "Value"}
                </p>
                <input
                  type="number"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter")  applyInputValue();
                    if (e.key === "Escape") { setSelectedPoints(new Map()); setOverlayAnchor(null); }
                  }}
                  className="w-full text-sm font-medium text-zinc-800 border border-zinc-200 rounded-md px-2 py-1.5 outline-none focus:border-indigo-400"
                  step="0.01"
                  autoFocus
                />
                <p className="text-[10px] text-zinc-400">Enter to apply · Esc to dismiss</p>
                <button
                  onClick={selectAllPoints}
                  className="text-xs text-zinc-400 hover:text-indigo-500 transition-colors text-left"
                >
                  Select all points
                </button>
              </>
            ) : (
              <>
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                  {selectedPoints.size} points selected
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500 shrink-0">+/−</span>
                  <input
                    type="number"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter")  applyInputValue();
                      if (e.key === "Escape") { setSelectedPoints(new Map()); setOverlayAnchor(null); }
                    }}
                    className="flex-1 text-sm font-medium text-zinc-800 border border-zinc-200 rounded-md px-2 py-1.5 outline-none focus:border-indigo-400"
                    step="0.01"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <button
                  onClick={applyInputValue}
                  className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-md px-2 py-1.5 transition-colors"
                >
                  Apply to all
                </button>
                <p className="text-[10px] text-zinc-400">Enter to apply · Esc to dismiss</p>
                <button
                  onClick={selectAllPoints}
                  className="text-xs text-zinc-400 hover:text-indigo-500 transition-colors text-left"
                >
                  Reselect all
                </button>
              </>
            )}
          </div>
        )}
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