"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useData } from "@/contexts/DataState";
import { useUI } from "@/contexts/UIState";
import { getTrendColor } from "@/components/StorySidebar";
import type { EChartsOption, SeriesOption } from "echarts";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// ── Metric series colors ───────────────────────────────────────────────
const METRIC_COLORS = {
  weight:       "#f59e0b", // amber
  lag:          "#06b6d4", // cyan
  relationship: "#10b981", // emerald
};

// ─────────────────────────────────────────────────────────────────────────────
// StoryGraph
//
// Reads rootStory from DataState and all visibility state from UIState.
// Builds ECharts options and renders the chart.
// Owns the activateStoryView() call on load — the graph is the primary
// output of the story page, so it's responsible for initialising the view.
// ─────────────────────────────────────────────────────────────────────────────

export default function StoryGraph() {
  const { rootStory } = useData();

  const {
    activeView,
    contributorView,
    isStoryShown,
    isWeightShown,
    isLagShown,
    isRelationshipShown,
    activateStoryView,
  } = useUI();

  // Initialise story view once data is available.
  useEffect(() => {
    if (rootStory) activateStoryView();
  }, [rootStory]);

  const chartOptions: EChartsOption = useMemo(() => {
    if (!rootStory) return {};

    // ── Story trend series ─────────────────────────────────────────────
    // Parallel arrays so seriesIndex in tooltip maps back to the right ID.
    const allTrends = [
      rootStory.focalTrend,
      ...rootStory.contributors.map((c) => c.trend),
    ];
    const allIds = [
      rootStory.id,
      ...rootStory.contributors.map((c) => c.id),
    ];

    const storySeries: SeriesOption[] = allTrends.map((trend, index) => {
      const id      = allIds[index];
      const isShown = isStoryShown(id);
      const color   = getTrendColor(index);

      return {
        name: trend.name,
        type: "line" as const,
        smooth: true,
        data: trend.values.map((v) => v.value),
        symbol: "none",
        lineStyle: {
          color,
          width: 2,
          opacity: isShown ? 1 : 0,
        },
        itemStyle: { color },
        emphasis: { focus: "series" as const, lineStyle: { width: 3 } },
      } as SeriesOption;
    });

    // ── Contributor metric series ──────────────────────────────────────
    // Only rendered when in contributor view. Weights, lags, and
    // relationship values are plotted as dashed lines on the same axes.
    const metricSeries: SeriesOption[] = [];

    if (activeView === "contributor" && contributorView) {
      const contributor = rootStory.contributors.find(
        (c) => c.id === contributorView.contributorId
      );

      if (contributor) {
        // Weight series — one line per visible weight header, using its values
        const visibleWeights = contributor.weights.filter((w) => isWeightShown(w.id));
        visibleWeights.forEach((w) => {
          metricSeries.push({
            name: `Weight`,
            type: "line" as const,
            smooth: true,
            data: w.values.map((v) => v.value),
            symbol: "none",
            lineStyle: { color: METRIC_COLORS.weight, width: 2, type: "dashed" },
            itemStyle: { color: METRIC_COLORS.weight },
            emphasis: { focus: "series" as const },
          } as SeriesOption);
        });

        // Lag series
        const visibleLags = contributor.lags.filter((l) => isLagShown(l.id));
        visibleLags.forEach((l) => {
          metricSeries.push({
            name: `Lag`,
            type: "line" as const,
            smooth: true,
            data: l.values.map((v) => v.value),
            symbol: "none",
            lineStyle: { color: METRIC_COLORS.lag, width: 2, type: "dashed" },
            itemStyle: { color: METRIC_COLORS.lag },
            emphasis: { focus: "series" as const },
          } as SeriesOption);
        });

        // Relationship value series
        const visibleRelationships = contributor.relationships.filter((r) =>
          isRelationshipShown(r.id)
        );
        visibleRelationships.forEach((r) => {
          metricSeries.push({
            name: `Relationship Value`,
            type: "line" as const,
            smooth: true,
            data: r.values.map((v) => v.value),
            symbol: "none",
            lineStyle: { color: METRIC_COLORS.relationship, width: 2, type: "dashed" },
            itemStyle: { color: METRIC_COLORS.relationship },
            emphasis: { focus: "series" as const },
          } as SeriesOption);
        });
      }
    }

    const series = [...storySeries, ...metricSeries];
    const xLabels = rootStory.focalTrend.values.map((v) => v.timestamp.slice(0, 7));

    return {
      backgroundColor: "transparent",
      grid: { top: 10, right: 10, bottom: 60, left: 10 },
      xAxis: {
        type: "category",
        data: xLabels,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: true, lineStyle: { color: "#e4e4e7" } },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: { show: false },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          crossStyle: { color: "#c026d3", width: 1, opacity: 0.4 },
          lineStyle: { color: "#c026d3", width: 1, opacity: 0.3, type: "dashed" },
          label: { show: false },
          snap: true,
        },
        backgroundColor: "white",
        borderColor: "#f3e8ff",
        borderWidth: 1,
        textStyle: { color: "#3f3f46", fontSize: 12 },
        formatter: (params: any) => {
          const date = params[0]?.axisValue;
          const rows = params
            .filter((p: any) => {
              const id = allIds[p.seriesIndex];
              if (id) return isStoryShown(id);
              return true; // metric series always shown if in the array
            })
            .map((p: any) => {
              const isPrimary = allIds[p.seriesIndex] === rootStory.id;
              const val = Number(p.value).toLocaleString();
              return `
                <div style="display:flex;align-items:center;gap:6px;margin:2px 0;
                  ${isPrimary ? "font-weight:600" : "opacity:0.7"}">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                    background:${p.color}"></span>
                  <span>${p.seriesName}</span>
                  <span style="margin-left:auto;padding-left:12px">${val}</span>
                </div>
              `;
            })
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
          type: "slider",
          xAxisIndex: 0,
          start: 0,
          end: 100,
          height: 24,
          bottom: 8,
          borderColor: "transparent",
          backgroundColor: "#f4f4f5",
          fillerColor: "rgba(192, 38, 211, 0.08)",
          handleStyle: { color: "#c026d3", borderColor: "#c026d3" },
          textStyle: { color: "#a1a1aa", fontSize: 10 },
        },
        { type: "inside", xAxisIndex: 0, start: 0, end: 100 },
      ],
    };
  }, [
    rootStory,
    activeView,
    contributorView,
    isStoryShown,
    isWeightShown,
    isLagShown,
    isRelationshipShown,
  ]);

  if (!rootStory) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <ReactECharts
      option={chartOptions}
      style={{ width: "100%", height: "100%" }}
      opts={{ renderer: "canvas" }}
    />
  );
}