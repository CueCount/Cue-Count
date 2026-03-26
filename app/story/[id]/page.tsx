"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { getStoryWithTrends } from "@/lib/db/trends";
import { getStoryById } from "@/lib/db/stories";
import StorySidebar, { getTrendColor } from "@/components/StorySidebar";
import { UIProvider, useUI } from "@/contexts/UIState";
import { DataProvider } from "@/contexts/DataState";
import type { EChartsOption, SeriesOption } from "echarts";
import Breadcrumb from "@/components/Breadcrumb";
import mockPerspectives from "@/data/mock/perspectives.json";
import type { StoryWithContributors, PerspectiveRow } from "@/types/db";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// ── Outer shell ────────────────────────────────────────────────────────
// Renders UIProvider so the inner component can call useUI()
export default function StoryPage() {
  return (
    <DataProvider>
      <UIProvider>
        <StoryPageInner />
      </UIProvider>
    </DataProvider>
  );
}

// ── Inner component ────────────────────────────────────────────────────
// Lives inside UIProvider so it can read hiddenTrendIds and pass it
// into chartOptions — this is what makes the eye icons affect the graph.
function StoryPageInner() {
  const params  = useParams();
  const storyId = params.id as string;

  const [storyData, setStoryData]     = useState<StoryWithContributors | null>(null);
  const [activeTrendId, setActiveTrendId] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  // Graph visibility state — toggled by the eye icons in the sidebar
  const { hiddenTrendIds } = useUI();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const storyRow = await getStoryById(storyId);
      if (!storyRow) { setLoading(false); return; }
      const full = await getStoryWithTrends(storyRow);
      setStoryData(full);
      setLoading(false);
    }
    load();
  }, [storyId]);

  const perspective = (mockPerspectives as PerspectiveRow[]).find(
    (p) => p.id === storyData?.perspectiveId
  );

  const chartOptions: EChartsOption = useMemo(() => {
    if (!storyData) return {};

    const allTrends = [
      storyData.focalTrend,
      ...storyData.contributors.map((c) => c.contributorStory.focalTrend),
    ];

    const series: SeriesOption[] = allTrends.map((trend, index) => {
      const isPrimary = trend.id === storyData.focalTrendId;
      const isHovered = activeTrendId === trend.id;
      const isDimmed  = activeTrendId !== null && !isPrimary && activeTrendId !== trend.id;
      const isHidden  = hiddenTrendIds.has(trend.id); // ← reads from UIProvider
      const color     = getTrendColor(index);

      return {
        name: trend.name,
        type: "line" as const,
        smooth: true,
        data: trend.values.map((v) => v.value),
        symbol: "none",
        symbolSize: 8,
        lineStyle: {
          color,
          width: isHovered ? 3 : 2,
          // Hidden = fully transparent. Series stays in the array so
          // tooltip indices stay stable — the line just disappears visually.
          opacity: isHidden ? 0 : isDimmed ? 0.5 : 1,
        },
        itemStyle: { color },
        emphasis: {
          focus: "series" as const,
          lineStyle: { width: 3 },
        },
      } as SeriesOption;
    });

    const xLabels = storyData.focalTrend.values.map((v) =>
      v.timestamp.slice(0, 7)
    );

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
            // Also filter hidden trends out of the tooltip
            .filter((p: any) => !hiddenTrendIds.has(allTrends[p.seriesIndex]?.id))
            .map((p: any) => {
              const isPrimary = allTrends[p.seriesIndex]?.id === storyData.focalTrendId;
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
  }, [storyData, activeTrendId, hiddenTrendIds]); // ← hiddenTrendIds in deps array

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400 text-sm">
        Loading...
      </div>
    );
  }

  if (!storyData) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400 text-sm">
        Story not found.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">

      <aside className="w-96 shrink-0 border-r border-zinc-100 px-5 py-6 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Breadcrumb items={[
            { label: "Home", href: "/" },
            { label: "Perspectives", href: "/" },
            { label: perspective?.name ?? "Perspective", href: `/perspective/${storyData.perspectiveId}` },
            { label: storyData.name },
          ]} />
        </div>
        <StorySidebar
          title={storyData.name}
          storyId={storyData.id}
          focalTrend={storyData.focalTrend}
          contributors={storyData.contributors}
        />
      </aside>

      <div className="flex flex-col flex-1">

        <main className="flex-1 overflow-hidden">
          <ReactECharts
            option={chartOptions}
            style={{ width: "100%", height: "100%" }}
            opts={{ renderer: "canvas" }}
          />
        </main>
      </div>

    </div>
  );
}