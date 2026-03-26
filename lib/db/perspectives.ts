// lib/db/perspectives.ts
// ─────────────────────────────────────────────────────────────────────────────
// Query functions for Perspectives.
//
// RIGHT NOW: reads from local mock JSON files (data/mock/)
// LATER: swap the import lines to hit your real Postgres via your ORM/SDK
//        Everything that calls these functions stays exactly the same.
// ─────────────────────────────────────────────────────────────────────────────

import type { PerspectiveRow } from "@/types/db";
import mockPerspectives from "@/data/mock/perspectives.json";

const perspectives = mockPerspectives as PerspectiveRow[];

export async function getAllPerspectives(): Promise<PerspectiveRow[]> {
  return perspectives;
}

export async function getPerspectiveById(id: string): Promise<PerspectiveRow | null> {
  return perspectives.find((p) => p.id === id) ?? null;
}

export async function getPerspectiveBySlug(slug: string): Promise<PerspectiveRow | null> {
  return perspectives.find((p) => p.slug === slug) ?? null;
}