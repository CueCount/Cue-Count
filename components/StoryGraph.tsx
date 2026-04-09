"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useData } from "@/contexts/DataState";
import { getTrendColor } from "@/components/StorySidebar";
import type { StoryViewState } from "@/app/story/[id]/page";
import type { EChartsOption, SeriesOption } from "echarts";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const METRIC_COLORS = {
  weight:       "#f59e0b",
  lag:          "#06b6d4",
  relationship: "#10b981",
};

// ── Helper: build a consistent line series ────────────────────────────────────
// opacity: 0 keeps the series registered (stable indices for tooltip) but
// invisible — preferred over conditionally omitting entries.
function makeSeries(
  name:     string,
  data:     number[],
  color:    string,
  opacity:  number,
  lineType: "solid" | "dashed" | "dotted" = "solid",
  width = 2,
): SeriesOption {
  return {
    name,
    type:   "line",
    smooth: true,
    data,
    symbol: "none",
    lineStyle: { color, width, opacity, type: lineType },
    itemStyle: { color },
    emphasis:  { focus: "series", lineStyle: { width: width + 1 } },
  } as SeriesOption;
}

// ─────────────────────────────────────────────────────────────────────────────
// StoryGraph
//
// Three view modes driven by viewState.activeView:
//
//   "story"       — Story: two independent lines (TrendData solid,
//                   analysis DataValues dashed), gated by shownStoryTrend /
//                   shownStoryAnalysis. Contributors: one solid+dashed pair
//                   per contributor, gated as a unit by shownContributorIds.
//
//   "contributor" — Same story pair. Selected contributor pair + metric series.
//
//   "analysis"    — Story TrendData as base. One DataValues series per
//                   analysis entry, toggled by shownAnalysisIds.
//
// All data comes pre-assembled from assembledStory (DataState useMemo).
// This component owns no data logic.
// ─────────────────────────────────────────────────────────────────────────────

export default function StoryGraph({ viewState }: { viewState: StoryViewState }) {
  const {
    assembledStory,
    activeStoryDoc,
    activeAnalysisId,
    allDataValues,
  } = useData();

  const {
    activeView,
    shownStoryTrend,
    shownStoryAnalysis,
    shownContributorIds,
    shownWeightIds,
    shownLagIds,
    shownRelationshipIds,
    shownAnalysisIds,
  } = viewState;

  const chartOptions: EChartsOption = useMemo(() => {
    if (!assembledStory) return {};

    const xLabels    = assembledStory.trendDataValues.map((v) => v.timestamp.slice(0, 7));
    const series: SeriesOption[] = [];
    const storyColor = getTrendColor(0);

    // Get numeric values for a DataId from the flat allDataValues slice
    function dataValuesFor(dataId: string | undefined): number[] {
      if (!dataId) return [];
      return allDataValues.filter((v) => v.dataId === dataId).map((v) => v.value);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STORY VIEW
    //
    // Story:        TrendData (solid) + active analysis DataValues (dashed)
    //               Each independently toggled.
    // Contributors: TrendData (solid) + active analysis DataValues (dashed)
    //               Toggled as one unit per contributor.
    // ─────────────────────────────────────────────────────────────────────────
    if (activeView === "story") {

      // Story TrendData — independent toggle
      series.push(makeSeries(
        assembledStory.meta?.name ?? assembledStory.name,
        assembledStory.trendDataValues.map((v) => v.value),
        storyColor,
        shownStoryTrend ? 1 : 0,
        "solid",
      ));

      // Story analysis DataValues — independent toggle
      // assembledStory.dataValues is pre-filtered for activeAnalysisId
      series.push(makeSeries(
        "Analyzed",
        assembledStory.dataValues.map((v) => v.value),
        storyColor,
        shownStoryAnalysis ? 0.75 : 0,
        "dashed",
      ));

      // Contributor pairs — one toggle controls both lines
      assembledStory.contributors.forEach((c, i) => {
        const color   = getTrendColor(i + 1);
        const opacity = shownContributorIds.has(c.id) ? 1 : 0;

        series.push(makeSeries(
          c.meta?.name ?? c.name,
          c.trendDataValues.map((v) => v.value),
          color, opacity, "solid",
        ));

        series.push(makeSeries(
          `${c.meta?.name ?? c.name} (Analyzed)`,
          c.dataValues.map((v) => v.value),
          color, opacity * 0.75, "dashed",
        ));
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONTRIBUTOR (RELATIONSHIP) VIEW
    //
    // Story pair always present (respects its own toggles).
    // Selected contributor pair + weight/lag/relationship metric series.
    // ─────────────────────────────────────────────────────────────────────────
    if (activeView === "contributor") {

      // Story TrendData
      series.push(makeSeries(
        assembledStory.meta?.name ?? assembledStory.name,
        assembledStory.trendDataValues.map((v) => v.value),
        storyColor, shownStoryTrend ? 1 : 0, "solid",
      ));

      // Story analysis DataValues
      series.push(makeSeries(
        "Analyzed",
        assembledStory.dataValues.map((v) => v.value),
        storyColor, shownStoryAnalysis ? 0.75 : 0, "dashed",
      ));

      const contributor = assembledStory.contributors.find((c) =>
        shownContributorIds.has(c.id)
      );

      if (contributor) {
        const contribColor = getTrendColor(1);
        const opacity      = shownContributorIds.has(contributor.id) ? 1 : 0;

        // Contributor TrendData
        series.push(makeSeries(
          contributor.meta?.name ?? contributor.name,
          contributor.trendDataValues.map((v) => v.value),
          contribColor, opacity, "solid",
        ));

        // Contributor analysis DataValues overlay
        series.push(makeSeries(
          `${contributor.meta?.name ?? contributor.name} (Analyzed)`,
          contributor.dataValues.map((v) => v.value),
          contribColor, opacity * 0.75, "dashed",
        ));

        // Metric series
        contributor.weightValues
          .filter((w) => shownWeightIds.has(w.id))
          .forEach((w) => series.push(
            makeSeries("Weight", [w.value], METRIC_COLORS.weight, 1, "dashed")
          ));

        contributor.lagValues
          .filter((l) => shownLagIds.has(l.id))
          .forEach((l) => series.push(
            makeSeries("Lag", [l.value], METRIC_COLORS.lag, 1, "dashed")
          ));

        contributor.relationshipValues
          .filter((r) => shownRelationshipIds.has(r.id))
          .forEach((r) => series.push(
            makeSeries("Relationship", [r.value], METRIC_COLORS.relationship, 1, "dashed")
          ));
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANALYSIS VIEW
    //
    // Story TrendData as fixed base (respects shownStoryTrend).
    // One DataValues series per analysis entry, toggled by shownAnalysisIds.
    // RootAnalysis = solid, child analyses = dashed.
    // ─────────────────────────────────────────────────────────────────────────
    if (activeView === "analysis") {

      series.push(makeSeries(
        assembledStory.meta?.name ?? assembledStory.name,
        assembledStory.trendDataValues.map((v) => v.value),
        storyColor, shownStoryTrend ? 1 : 0, "solid",
      ));

      const analysisEntries = Object.entries(activeStoryDoc?.Analysis ?? {}) as [string, any][];
      analysisEntries
        .sort(([a]) => a === "RootAnalysis" ? -1 : 1)
        .forEach(([analysisId, entry], i) => {
          const color   = getTrendColor(i + 1);
          const isShown = shownAnalysisIds.has(analysisId);
          const data    = dataValuesFor(entry?.Story?.DataId);

          if (data.length > 0) {
            series.push(makeSeries(
              entry?.Name ?? analysisId,
              data,
              color,
              isShown ? 1 : 0,
              analysisId === "RootAnalysis" ? "solid" : "dashed",
            ));
          }
        });
    }

    // ── Shared chart config ───────────────────────────────────────────────────
    return {
      backgroundColor: "transparent",
      grid: { top: 10, right: 10, bottom: 60, left: 10 },
      xAxis: {
        type:        "category",
        data:        xLabels,
        boundaryGap: false,
        axisLine:    { show: false },
        axisTick:    { show: true, lineStyle: { color: "#e4e4e7" } },
        axisLabel:   { show: false },
        splitLine:   { show: false },
      },
      yAxis: {
        type:      "value",
        axisLabel: { show: false },
        splitLine: { show: false },
        axisLine:  { show: false },
        axisTick:  { show: false },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type:       "cross",
          crossStyle: { color: "#c026d3", width: 1, opacity: 0.4 },
          lineStyle:  { color: "#c026d3", width: 1, opacity: 0.3, type: "dashed" },
          label:      { show: false },
          snap:       true,
        },
        backgroundColor: "white",
        borderColor:     "#f3e8ff",
        borderWidth:     1,
        textStyle:       { color: "#3f3f46", fontSize: 12 },
        formatter: (params: any) => {
          const date = params[0]?.axisValue;
          const rows = params
            .filter((p: any) => p.value !== null && p.value !== undefined)
            .map((p: any) => `
              <div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                  background:${p.color}"></span>
                <span>${p.seriesName}</span>
                <span style="margin-left:auto;padding-left:12px">${Number(p.value).toLocaleString()}</span>
              </div>
            `)
            .join("");
          return `
            <div style="min-width:220px">
              <div style="color:#a1a1aa;font-size:11px;margin-bottom:6px">${date}</div>
              ${rows}
            </div>
          `;
        },
      },
      series,
      dataZoom: [
        {
          type:            "slider",
          xAxisIndex:      0,
          start:           0,
          end:             100,
          height:          24,
          bottom:          8,
          borderColor:     "transparent",
          backgroundColor: "#f4f4f5",
          fillerColor:     "rgba(192, 38, 211, 0.08)",
          handleStyle:     { color: "#c026d3", borderColor: "#c026d3" },
          textStyle:       { color: "#a1a1aa", fontSize: 10 },
        },
        { type: "inside", xAxisIndex: 0, start: 0, end: 100 },
      ],
    };
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
  ]);

  if (!assembledStory) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <ReactECharts
      option={chartOptions}
      notMerge={true}
      style={{ width: "100%", height: "100%" }}
      opts={{ renderer: "canvas" }}
    />
  );
}