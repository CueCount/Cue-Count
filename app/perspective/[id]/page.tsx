"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import WorkspaceCard from "@/components/WorkspaceCard";
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
    <div className="flex flex-col min-h-screen">

      <Breadcrumb items={[
        { label: "Home", href: "/" },
        { label: "Perspectives", href: "/" },
        { label: perspective?.name ?? "Perspective" },
      ]} />

      <div className="flex flex-1">

        <aside className="w-56 shrink-0 border-r border-zinc-100 bg-white px-4 py-6">
          <WorkspaceSidebar
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
          />
        </aside>

        <main className="flex-1 px-8 py-6 flex flex-col gap-6">
          {allStories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {allStories.map((story, index) => (
                <WorkspaceCard
                  key={story.id}
                  workspace={{
                    id: story.id,
                    title: story.name,
                    projections: 0,
                    contributors: 0,
                    hasNewData: false,
                    tags: [],
                  }}
                  index={index}
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