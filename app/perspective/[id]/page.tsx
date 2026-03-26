"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import HorizontalCard from "@/components/HorizontalCard";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import Breadcrumb from "@/components/Breadcrumb";
import mockPerspectives from "@/data/mock/perspectives.json";
import mockStories from "@/data/mock/stories.json";
import type { PerspectiveRow, StoryRow } from "@/types/db";

export default function PerspectivePage() {
  const params = useParams();
  const perspectiveId = params.id as string;

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Look up perspective metadata from mock JSON
  const perspective = (mockPerspectives as PerspectiveRow[]).find(
    (p) => p.id === perspectiveId
  );

  // Get all stories belonging to this perspective
  const allStories = (mockStories as StoryRow[]).filter(
    (s) => s.perspectiveId === perspectiveId
  );

  return (
    <div className="flex min-h-screen w-full">

      {/* Sidebar */}
      <aside className="w-96 shrink-0 border-r border-zinc-100 bg-white px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Breadcrumb items={[
            { label: "Home", href: "/" },
            { label: "Perspectives", href: "/" },
            { label: perspective?.name ?? "Perspective" },
          ]} />
          {/* rest of your existing sidebar header content */}
        </div>
        <WorkspaceSidebar
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
        />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1">

        <main className="flex-1 px-8 py-6 flex flex-col gap-6">
          {allStories.length > 0 ? (
            <div className="flex flex-col">
              {allStories.map((story) => (
                <HorizontalCard
                  key={story.id}
                  type="story"
                  data={story}
                  href={`/story/${story.id}`}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
              No stories found for this perspective.
            </div>
          )}
        </main>

      </div>

    </div>
  );
}