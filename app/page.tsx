"use client";

import { useState } from "react";
import mockPerspectives from "@/data/mock/perspectives.json";
import type { PerspectiveRow } from "@/types/db";
import HorizontalCard from "@/components/HorizontalCard";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import Breadcrumb from "@/components/Breadcrumb";

const perspectives = mockPerspectives as PerspectiveRow[];

export default function HomePage() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen w-full">

      {/* Sidebar */}
      <aside className="w-96 shrink-0 border-r border-zinc-100 bg-white px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Breadcrumb items={[
            { label: "Home", href: "/" },
            { label: "Perspectives" },
          ]} />
        </div>
        <WorkspaceSidebar
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
        />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1">

        <main className="flex-1 px-8 py-6 flex flex-col gap-6">
          {perspectives.length > 0 ? (
            <div className="flex flex-col">
              {perspectives.map((perspective) => (
                <HorizontalCard
                  key={perspective.id}
                  type="perspective"
                  data={perspective}        // ✅ pass the raw data directly — no remapping
                  href={`/perspective/${perspective.id}`}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
              No perspectives found.
            </div>
          )}
        </main>
      </div>

    </div>
  );
}