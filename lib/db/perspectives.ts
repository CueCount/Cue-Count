// lib/db/perspectives.ts
// ─────────────────────────────────────────────────────────────────────────────
// Query functions for Perspectives.
//
// RIGHT NOW: reads from local mock JSON files (data/mock/)
// LATER: swap the import lines to hit your real Postgres via your ORM/SDK
//        e.g. import { db } from "@/lib/postgres" and run db.query(...)
//        Everything that calls these functions stays exactly the same.
// ─────────────────────────────────────────────────────────────────────────────

import type { PerspectiveRow } from "@/types/db";
import mockPerspectives from "@/data/mock/perspectives.json";

// Cast the raw JSON import to your typed row shape
const perspectives = mockPerspectives as PerspectiveRow[];

// Get all perspectives — used on the home page card grid
export async function getAllPerspectives(): Promise<PerspectiveRow[]> {
  return perspectives;
}

// Get a single perspective by ID — used in breadcrumbs and page headers
export async function getPerspectiveById(id: string): Promise<PerspectiveRow | null> {
  return perspectives.find((p) => p.id === id) ?? null;
}

// Get a single perspective by slug — useful for SEO-friendly URLs later
export async function getPerspectiveBySlug(slug: string): Promise<PerspectiveRow | null> {
  return perspectives.find((p) => p.slug === slug) ?? null;
}
