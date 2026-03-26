"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useData } from "@/contexts/DataState";

// ── Types ──────────────────────────────────────────────────────────────
type UIState = {
  // Which trend lines are hidden on the graph.
  // Toggled by the eye icon in the sidebar.
  hiddenTrendIds: Set<string>;
  toggleTrendVisibility: (id: string) => void;
  isTrendHidden: (id: string) => boolean;

  // Which trend is currently hovered.
  // Replaces the activeTrendId prop that was being drilled through the page.
  // StorySidebar and the chart both read/write this directly via useUI().
  activeTrendId: string | null;
  setActiveTrendId: (id: string | null) => void;

  // Resets hidden trend state when switching variants.
  // Called automatically via useEffect when DataState's activeVariantId changes.
  // Hidden trend IDs from the previous variant are irrelevant — the new
  // variant may have a different set of trends entirely.
  resetForVariant: () => void;
};

// ── Context ────────────────────────────────────────────────────────────
const UIContext = createContext<UIState | null>(null);

// ── Provider ───────────────────────────────────────────────────────────
// Sits inside DataProvider, wraps StoryPage and its children.
// Both the graph and sidebar read from this — no prop drilling needed.
//
//   <DataProvider>
//     <UIProvider>
//       <StoryPage />
//     </UIProvider>
//   </DataProvider>
export function UIProvider({ children }: { children: React.ReactNode }) {
  const { activeVariantId } = useData();

  const [hiddenTrendIds, setHiddenTrendIds] = useState<Set<string>>(new Set());
  const [activeTrendId, setActiveTrendId]   = useState<string | null>(null);

  const toggleTrendVisibility = useCallback((id: string) => {
    setHiddenTrendIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const isTrendHidden = useCallback((id: string) => {
    return hiddenTrendIds.has(id);
  }, [hiddenTrendIds]);

  // Clears hidden trend state and active trend when the user switches variants.
  const resetForVariant = useCallback(() => {
    setHiddenTrendIds(new Set());
    setActiveTrendId(null);
  }, []);

  // Listen to DataState's activeVariantId — whenever it changes, reset
  // display state so stale hidden/active trends from the previous variant
  // don't bleed through.
  useEffect(() => {
    resetForVariant();
  }, [activeVariantId]);

  return (
    <UIContext.Provider
      value={{
        hiddenTrendIds,
        toggleTrendVisibility,
        isTrendHidden,
        activeTrendId,
        setActiveTrendId,
        resetForVariant,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────
export function useUI(): UIState {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within a <UIProvider>");
  return ctx;
}