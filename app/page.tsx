"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HorizontalCard from "@/components/HorizontalCard";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import Breadcrumb from "@/components/Breadcrumb";
import { DataProvider, useData } from "@/contexts/DataState";

function HomePageInner() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { perspectives, perspectivesLoading, fetchPerspectives } = useData();

  // Once Firebase resolves the authenticated user, fetch their perspectives.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) fetchPerspectives(user.uid);
    });
    return () => unsubscribe();
  }, [fetchPerspectives]);

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
          {perspectivesLoading ? (
            <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
              Loading perspectives...
            </div>
          ) : perspectives.length > 0 ? (
            <div className="flex flex-col">
              {perspectives.map((perspective) => (
                <HorizontalCard
                  key={perspective.id}
                  type="perspective"
                  data={perspective}
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

export default function HomePage() {
  return (
    <DataProvider>
      <HomePageInner />
    </DataProvider>
  );
}