"use client";

import { useState, useEffect } from "react";

// ── Icons ─────────────────────────────────────────────────────────────────────
function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DetailsModal
//
// Shared rename modal — reused across Analysis, Story, Contributor flows.
//
// Presentational only. Callers pass `title` (modal header), `fieldLabel`
// (subtle label above the input), `initialValue`, and an `onSave` callback
// that receives the new value. The modal handles input state internally and
// closes itself after a successful save.
//
// `onSave` may be sync or async. If async, the Save button shows a busy
// state and disables further clicks until the promise resolves. Errors
// thrown by onSave bubble up — caller decides whether to surface them.
// ─────────────────────────────────────────────────────────────────────────────

export default function DetailsModal({
  title,
  fieldLabel,
  initialValue,
  onSave,
  onClose,
}: {
  title:        string;
  fieldLabel:   string;
  initialValue: string;
  onSave:       (newValue: string) => void | Promise<void>;
  onClose:      () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [busy,  setBusy]  = useState(false);

  // Reset state when initialValue changes (modal reused across different
  // entities). React mounts/unmounts modals on conditional render so this
  // is mostly defensive but cheap.
  useEffect(() => { setValue(initialValue); }, [initialValue]);

  async function handleSave() {
    if (busy) return;
    const trimmed = value.trim();
    if (!trimmed || trimmed === initialValue) {
      // No-op for empty or unchanged values — just close.
      onClose();
      return;
    }
    setBusy(true);
    try {
      await onSave(trimmed);
      onClose();
    } catch (err) {
      console.error("[DetailsModal] save failed:", err);
      // Leave the modal open so the user can retry. busy resets so the
      // button is clickable again.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <ChevronLeftIcon />
          </button>
          <p className="text-sm text-zinc-800 flex-1 text-center">{title}</p>
          <button className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <HelpIcon />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="px-6 py-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400 leading-tight">{fieldLabel}</span>
            <input
              autoFocus
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") onClose();
              }}
              className="border-b border-zinc-200 focus:border-indigo-400 outline-none py-1 text-sm text-zinc-800 placeholder:text-zinc-400 transition-colors"
            />
          </label>

          <div className="flex justify-center pt-2">
            <button
              onClick={handleSave}
              disabled={busy || !value.trim() || value.trim() === initialValue}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-500 hover:text-indigo-700 disabled:text-zinc-300 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? "Saving..." : "Save"}
              {!busy && <SaveIcon />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}