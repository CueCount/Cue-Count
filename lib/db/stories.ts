// lib/db/stories.ts
// ─────────────────────────────────────────────────────────────────────────────
// Query functions for Stories.
//
// RIGHT NOW: reads from local mock JSON files (data/mock/)
// LATER: swap imports for real Postgres queries — callers stay the same.
// ─────────────────────────────────────────────────────────────────────────────

import type { StoryRow, VariantRow } from "@/types/db";
import mockStories  from "@/data/mock/stories.json";
import mockVariants from "@/data/mock/variants.json";

const stories  = mockStories  as StoryRow[];
// CHANGED: variants imported here because they are scoped to a root story —
// loading them alongside the story is the natural fetch boundary.
const variants = mockVariants as VariantRow[];

// Get all stories belonging to a perspective — used on the perspective page
export async function getStoriesByPerspectiveId(perspectiveId: string): Promise<StoryRow[]> {
  return stories.filter((s) => s.perspectiveId === perspectiveId);
}

// Get a single story by ID — used on the story/graph page
export async function getStoryById(id: string): Promise<StoryRow | null> {
  return stories.find((s) => s.id === id) ?? null;
}

// ADDED: load all variants scoped to a root story.
// storyId must always be the root focal story ID — variants are never
// scoped to contributor stories. DataState enforces this on write;
// this function just reads what's there.
export async function getVariantsByStoryId(storyId: string): Promise<VariantRow[]> {
  return variants
    .filter((v) => v.storyId === storyId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}