"use client";

import { useParams } from "next/navigation";
import { DataProvider } from "@/contexts/DataState";
import { UIProvider } from "@/contexts/UIState";
import StorySidebar from "@/components/StorySidebar";
import StoryGraph from "@/components/StoryGraph";

// ── Outer shell ────────────────────────────────────────────────────────
// Mounts providers and composes the two main panels.
// All data access and UI logic lives inside StorySidebar and StoryGraph
// via useData() and useUI() — nothing is threaded through props here.

export default function StoryPage() {
  const params  = useParams();
  const storyId = params.id as string;

  return (
    <DataProvider storyId={storyId}>
      <UIProvider>
        <div className="flex min-h-screen w-full">
          <aside className="w-96 shrink-0 border-r border-zinc-100 px-5 py-6 overflow-y-auto">
            <StorySidebar />
          </aside>
          <div className="flex flex-col flex-1">
            <main className="flex-1 overflow-hidden">
              <StoryGraph />
            </main>
          </div>
        </div>
      </UIProvider>
    </DataProvider>
  );
}