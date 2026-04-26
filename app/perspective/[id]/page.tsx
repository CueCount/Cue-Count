"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import HorizontalCard from "@/components/HorizontalCard";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import Breadcrumb from "@/components/Breadcrumb";
import type { PerspectiveDocument, StoryDocument } from "@/types/db";

export default function PerspectivePage() {
  const params = useParams();
  const perspectiveId = params.id as string;

  const [selectedTag,  setSelectedTag]  = useState<string | null>(null);
  const [perspective,  setPerspective]  = useState<PerspectiveDocument | null>(null);
  const [stories,      setStories]      = useState<StoryDocument[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!perspectiveId) return;

    async function load() {
      setLoading(true);
      try {
        const [perspectiveSnap, storiesSnap] = await Promise.all([
          getDoc(doc(db, "perspectives", perspectiveId)),
          getDocs(query(
            collection(db, "stories"),
            where("perspectiveId", "==", perspectiveId)
          )),
        ]);

        if (perspectiveSnap.exists()) {
          setPerspective({ id: perspectiveSnap.id, ...perspectiveSnap.data() } as PerspectiveDocument);
        }
        setStories(storiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as StoryDocument));
      } catch (err) {
        console.error("[PerspectivePage] fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [perspectiveId]);

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
        </div>
        <WorkspaceSidebar
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
        />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1">
        <main className="flex-1 px-8 py-6 flex flex-col gap-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
              Loading stories...
            </div>
          ) : stories.length > 0 ? (
            <div className="flex flex-col">
              {stories.map((story) => (
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