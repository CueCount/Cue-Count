// lib/stories/createStory.ts
// ─────────────────────────────────────────────────────────────────────────────
// createStory — one-shot writer that provisions a new story document in
// Firebase with a default analysis attached.
//
// Why this lives outside DataState:
//   • No active session exists at creation time (nothing in DataState to read
//     or patch).
//   • After creation the caller navigates to the new story, which triggers
//     initStory — that's where session state comes alive.
//   • Pure function, easy to test, easy to call from a modal or a route handler.
//
// What it does NOT do:
//   • Does not write any Postgres rows. The default analysis has zero
//     contributors, so there are no baseline weight/lag/correlation rows to
//     insert. The story's own DataId is reserved for the calc layer's output
//     on save — nothing to write yet.
//
// What it returns:
//   • storyId         — the new Firestore document id
//   • analysisId      — the default analysis's id (useful if caller wants to
//                       set activeAnalysisId directly before initStory runs)
//   • storyDataId     — the default analysis's Story.DataId (used by the calc
//                       layer on save)
// ─────────────────────────────────────────────────────────────────────────────

import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type CreateStoryParams = {
  name:          string;
  perspectiveId: string;
  trendId:       string;
};

export type CreateStoryResult = {
  storyId:     string;
  analysisId:  string;
  storyDataId: string;
};

export async function createStory(params: CreateStoryParams): Promise<CreateStoryResult> {
  const { name, perspectiveId, trendId } = params;

  // Generate all IDs up front so we can write a fully-formed doc in one call.
  const storyRef    = doc(collection(db, "stories"));
  const storyId     = storyRef.id;
  const analysisId  = `analysis-${crypto.randomUUID().slice(0, 8)}`;
  const storyDataId = `data-${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;

  const now = new Date().toISOString();

  await setDoc(storyRef, {
    name,
    perspectiveId,
    trendId,
    createdAt: now,
    updatedAt: now,
    Contributors: {},
    Analysis: {
      [analysisId]: {
        Name: "Default Analysis",
        Story: {
          DataId: storyDataId,
        },
        Contributors: {},
      },
    },
  });

  console.log(`[createStory] ✓ story "${name}" created — storyId: ${storyId}, default analysisId: ${analysisId}`);

  return { storyId, analysisId, storyDataId };
}