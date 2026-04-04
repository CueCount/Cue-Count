// lib/db/stories.ts
// ─────────────────────────────────────────────────────────────────────────────
// Query functions for Stories.
//
// RIGHT NOW: reads from local mock JSON files (data/mock/)
// LATER: swap imports for real Postgres queries — callers stay the same.
// ─────────────────────────────────────────────────────────────────────────────

import type { StoryRow, AnalysisRow } from "@/types/db";
import mockStories  from "@/data/mock/stories.json";
import mockAnalysis from "@/data/mock/analysis.json";

const stories  = mockStories  as StoryRow[];
// CHANGED: variants imported here because they are scoped to a root story —
// loading them alongside the story is the natural fetch boundary.
const analyses = mockAnalysis as AnalysisRow[];

// Get all stories belonging to a perspective — used on the perspective page
export async function getStoriesByPerspectiveId(perspectiveId: string): Promise<StoryRow[]> {
  return stories.filter((s) => s.perspectiveId === perspectiveId);
}

// Get a single story by ID — used on the story/graph page
export async function getStoryById(id: string): Promise<StoryRow | null> {
  return stories.find((s) => s.id === id) ?? null;
}

// Returns all analyses scoped to a root story, sorted oldest-first.
// storyId must always be the root focal story ID — analyses are never
// scoped to contributors.
export async function getAnalysesByStoryId(storyId: string): Promise<AnalysisRow[]> {
  return analyses
    .filter((a) => a.storyId === storyId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}