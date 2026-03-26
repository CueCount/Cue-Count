"use client";

import { useState } from "react";
import mockPerspectives from "@/data/mock/perspectives.json";

function BarChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="4" height="18" rx="1" />
      <rect x="10" y="8" width="4" height="13" rx="1" />
      <rect x="17" y="5" width="4" height="16" rx="1" />
    </svg>
  );
}

type Props = {
  onTagSelect: (tagId: string | null) => void;
  selectedTag: string | null;
};

export default function WorkspaceSidebar({ onTagSelect, selectedTag }: Props) {
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col gap-6">

      {/* Workspace count */}
      <div className="flex items-center gap-2 text-pink-500 font-semibold text-sm">
        <BarChartIcon />
        <span>{mockPerspectives.length} Workspaces</span>
      </div>

      {/* Search box */}
      <input
        type="text"
        placeholder="Search Box"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="
          w-full px-3 py-2 text-sm
          bg-zinc-100 rounded-lg border border-transparent
          focus:outline-none focus:border-pink-300 focus:bg-white
          transition-all placeholder:text-zinc-400
        "
      />

      {/* Tags list */}
      <div className="flex flex-col gap-1">
        {/* All option */}
        <button
          onClick={() => onTagSelect(null)}
          className={`
            flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left
            transition-colors
            ${selectedTag === null
              ? "text-pink-500 bg-pink-50 font-medium"
              : "text-zinc-500 hover:text-pink-400 hover:bg-pink-50"
            }
          `}
        >
          <BarChartIcon />
          All Tags
        </button>
      
      </div>
    </div>
  );
}
