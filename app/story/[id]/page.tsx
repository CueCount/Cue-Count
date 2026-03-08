"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { getStoryWithTrends } from "@/lib/db/trends";
import { getStoryById } from "@/lib/db/stories";
import WorkspaceGraphSidebar, { getTrendColor } from "@/components/WorkspaceGraphSidebar";
import type { EChartsOption, SeriesOption } from "echarts";
import Breadcrumb from "@/components/Breadcrumb";
import mockPerspectives from "@/data/mock/perspectives.json";
import type { StoryWithTrends, PerspectiveRow } from "@/types/db";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export default function StoryPage() {
  const params = useParams();
  const storyId = params.id as string;

  const [storyData, setStoryData] = useState<StoryWithTrends | null>(null);
  const [activeTrendId, setActiveTrendId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load story + all trend data from lib/db/trends.ts
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

  // Look up parent perspective for breadcrumb
  const perspective = (mockPerspectives as PerspectiveRow[]).find(
    (p) => p.id === storyData?.perspectiveId
  );

  // Build ECharts series from focal trend + variants
  const chartOptions: EChartsOption = useMemo(() => {
    if (!storyData) return {};

    const allTrends = [
      storyData.focalTrend,
      ...storyData.variants.map((v) => v.trend),
    ];

    const series: SeriesOption[] = allTrends.map((trend, index) => {
      const isPrimary = trend.id === storyData.focalTrendId;
      const isHovered = activeTrendId === trend.id;
      const isDimmed = activeTrendId !== null && !isPrimary && activeTrendId !== trend.id;
      const color = getTrendColor(index);

      return {
        name: trend.name,
        type: "line" as const,
        smooth: true,
        data: trend.values.map((v) => v.value),
        symbol: isPrimary ? "circle" : "none",
        symbolSize: 8,
        lineStyle: {
          color,
          width: isPrimary ? 3 : isHovered ? 2.5 : 1.5,
          opacity: isDimmed ? 0.15 : isPrimary ? 1 : 0.5,
        },
        itemStyle: { color },
        emphasis: {
          focus: "series" as const,
          lineStyle: { width: 3 },
        },
      } as SeriesOption;
    });

    // X axis labels from the focal trend's timestamps
    const xLabels = storyData.focalTrend.values.map((v) =>
      v.timestamp.slice(0, 7) // "YYYY-MM"
    );

    return {
      backgroundColor: "transparent",
      grid: { top: 10, right: 10, bottom: 10, left: 10 },
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
    };
  }, [storyData, activeTrendId]);

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
    <div className="flex flex-col min-h-screen bg-white">

      <Breadcrumb items={[
        { label: "Home", href: "/" },
        { label: "Perspectives", href: "/" },
        { label: perspective?.name ?? "Perspective", href: `/perspective/${storyData.perspectiveId}` },
        { label: storyData.name },
      ]} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-zinc-100 px-5 py-6 overflow-y-auto">
          <WorkspaceGraphSidebar
            title={storyData.name}
            yesPercent={0}
            projections={0}
            contributors={0}
            focalTrend={storyData.focalTrend}
            variantTrends={storyData.variants.map((v) => v.trend)}
            activeTrendId={activeTrendId}
            onTrendHover={setActiveTrendId}
          />
        </aside>
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