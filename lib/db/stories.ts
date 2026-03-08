// lib/db/stories.ts
// ─────────────────────────────────────────────────────────────────────────────
// Query functions for Stories.
//
// RIGHT NOW: reads from local mock JSON files (data/mock/)
// LATER: swap imports for real Postgres queries — callers stay the same.
// ─────────────────────────────────────────────────────────────────────────────

import type { StoryRow } from "@/types/db";
import mockStories from "@/data/mock/stories.json";

const stories = mockStories as StoryRow[];

// Get all stories belonging to a perspective — used on the perspective page
export async function getStoriesByPerspectiveId(perspectiveId: string): Promise<StoryRow[]> {
  return stories.filter((s) => s.perspectiveId === perspectiveId);
}

// Get a single story by ID — used on the story/graph page
export async function getStoryById(id: string): Promise<StoryRow | null> {
  return stories.find((s) => s.id === id) ?? null;
}
