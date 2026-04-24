"use client";

import { useState, useEffect, useCallback } from "react";
import { useData } from "@/contexts/DataState";
import { searchContributors, type ContributorSearchResult } from "@/lib/searchContributors";

// ── Icons ─────────────────────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function StoryIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── Dummy tags ────────────────────────────────────────────────────────────────
const DUMMY_TAGS = ["Yours", "Stock Data", "Macro", "Country", "Sector", "Custom"];

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({
  result,
  onAdd,
  adding,
}: {
  result:  ContributorSearchResult;
  onAdd:   (result: ContributorSearchResult) => void;
  adding:  boolean;
}) {
  const isTrend = result.type === "trend";

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 border-b border-zinc-100 last:border-0">
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 ${isTrend ? "text-indigo-400" : "text-fuchsia-400"}`}>
          {isTrend ? <TrendIcon /> : <StoryIcon />}
        </span>
        <p className="text-sm text-zinc-800 leading-snug flex-1">{result.name}</p>
      </div>

      <div className="flex items-center gap-3 pl-5">
        {isTrend ? (
          <>
            {result.unit && (
              <span className="text-xs text-zinc-400">{result.unit}</span>
            )}
            {result.source && (
              <span className="text-xs text-zinc-400">{result.source}</span>
            )}
          </>
        ) : (
          <>
            <span className="text-xs text-zinc-400">
              {result.analysisNumber} analyses
            </span>
            <span className="text-xs text-zinc-400">
              {result.contributorNumber} contributors
            </span>
          </>
        )}

        <button
          onClick={() => onAdd(result)}
          disabled={adding}
          className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {adding ? "Adding..." : "Add Contributor"}
          {!adding && <span>+</span>}
        </button>
      </div>
    </div>
  );
}

// ── AddContributorModal ───────────────────────────────────────────────────────
export default function AddContributorModal({ onClose }: { onClose: () => void }) {
  const { linkContributor } = useData();
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<ContributorSearchResult[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [activeTag,  setActiveTag]  = useState<string | null>(null);
  const [addingId,   setAddingId]   = useState<string | null>(null);
  const [addedIds,   setAddedIds]   = useState<Set<string>>(new Set());

  // Debounced async search — runs whenever query changes
  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await searchContributors(q);
      setResults(data);
    } catch (err) {
      console.error("[AddContributor] search failed:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce: wait 300ms after the user stops typing before querying
  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  // Initial load — fetch all results on mount
  useEffect(() => { runSearch(""); }, [runSearch]);

  async function handleAdd(result: ContributorSearchResult) {
    if (addedIds.has(result.id)) return;
    setAddingId(result.id);
    try {
      // For trends, use the business-key trendId — NOT the Postgres row UUID (result.id).
      // For storyReferences, there is no trendId; fall back to result.id (story reference PK).
      const trendId = result.type === "trend"
        ? result.trendId
        : result.id;
 
      if (!trendId) {
        console.error("[AddContributor] missing trendId on result:", result);
        return;
      }
 
      await linkContributor(result.name, trendId);
      setAddedIds(prev => new Set(prev).add(result.id));
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <ChevronLeftIcon />
          </button>
          <p className="text-sm font-semibold text-zinc-800 flex-1 text-center">
            Add Contributor
          </p>
          <div className="w-5" />
        </div>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-zinc-100">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100">
            <span className="text-zinc-400"><SearchIcon /></span>
            <input
              autoFocus
              type="text"
              placeholder="Search trends and stories"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-zinc-800 placeholder:text-zinc-400 outline-none"
            />
            {loading && (
              <span className="text-zinc-300 text-xs">searching...</span>
            )}
          </div>
        </div>

        {/* ── Tag pills ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-100 overflow-x-auto scrollbar-hide">
          {DUMMY_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeTag === tag
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                  : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
              }`}
            >
              <span className="text-[10px]">⬡</span>
              {tag}
            </button>
          ))}
        </div>

        {/* ── Results ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
              Loading...
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
              No results found
            </div>
          ) : (
            results.map(result => (
              <ResultCard
                key={result.id}
                result={result}
                onAdd={handleAdd}
                adding={addingId === result.id}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}