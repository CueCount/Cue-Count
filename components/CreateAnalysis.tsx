"use client";

import { useState } from "react";
import { useData } from "@/contexts/DataState";

// ── Icons ─────────────────────────────────────────────────────────────────────
function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ── Picker row ────────────────────────────────────────────────────────────────
function PickerRow({
  label,
  sublabel,
  highlighted,
  onSelect,
}: {
  label:        string;
  sublabel?:    string;
  highlighted?: boolean;
  onSelect:     () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors w-full ${
        highlighted
          ? "bg-zinc-100 hover:bg-zinc-200"
          : "bg-zinc-50 hover:bg-zinc-100"
      }`}
    >
      <p className="text-sm text-zinc-800 flex-1">
        {label}
        {sublabel && (
          <span className="text-zinc-400 ml-2">{sublabel}</span>
        )}
      </p>
      <span className="text-indigo-500"><ArrowRightIcon /></span>
    </button>
  );
}

// ── CreateAnalysisModal ───────────────────────────────────────────────────────
//
// Picker modal — "Which Analysis do you want to base off of?"
//
// After the user picks a base (or "from scratch"), this modal closes and the
// shared details modal opens for name entry. The details modal is a separate
// component reused across Story / Contributor / Analysis creation flows; this
// component invokes it via the onProceed callback.
//
// onProceed receives `baseAnalysisId | null` — null means "from scratch".
// The parent is responsible for collecting the name and calling
// createAnalysis({ name, baseAnalysisId }).
//
export default function CreateAnalysisModal({
  onClose,
  onProceed,
}: {
  onClose:    () => void;
  onProceed:  (baseAnalysisId: string | null) => void;
}) {
  const { activeStoryDoc } = useData();
  const [busy, setBusy] = useState(false);

  // Build the analysis list from the active story's Analysis map.
  // Sorted alphabetically for stability — same convention as initStory's
  // default-pick logic.
  const analyses = Object.entries(activeStoryDoc?.Analysis ?? {})
    .map(([id, entry]: [string, any]) => ({
      id,
      name: entry?.Name ?? id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  function handleSelect(baseAnalysisId: string | null) {
    if (busy) return;
    setBusy(true);
    onProceed(baseAnalysisId);
    // Parent decides when to close — typically after the details modal flow
    // completes. We don't auto-close here because the picker → details
    // transition is part of the parent's coordination.
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <ChevronLeftIcon />
          </button>
          <p className="text-sm text-zinc-800 flex-1 text-center">
            Which Analysis do you want to base off of?
          </p>
          <button className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <HelpIcon />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {analyses.length === 0 ? (
            // Defensive: every story should have ≥1 analysis (createStory
            // guarantees), so this is only hit if Firebase is malformed.
            <div className="flex items-center justify-center py-8 text-zinc-400 text-sm">
              No analyses available
            </div>
          ) : (
            analyses.map((a) => (
              <PickerRow
                key={a.id}
                label={a.name}
                onSelect={() => handleSelect(a.id)}
              />
            ))
          )}
 
          {/* "From Scratch" — always last, visually distinct (slightly darker) */}
          <PickerRow
            label="New Analysis From Scratch"
            highlighted
            onSelect={() => handleSelect(null)}
          />
        </div>

      </div>
    </div>
  );
}