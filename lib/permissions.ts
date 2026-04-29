// lib/permissions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Story permissions — visibility and email-based viewer designation.
//
// Visibility:
//   • "private"        — only admin + designated emails can see; only admin edits
//   • "public_visible" — anyone with the link can see; only admin edits
//   • "public_usable"  — anyone with the link can see AND use as a contributor
//
// Viewer model (private only):
//   The admin types in up to 10 email addresses. Anyone whose authenticated
//   email matches one of those addresses can view the story when they visit
//   the link. There are no special invite tokens or invitation links — the
//   admin just shares the regular /story/{id} URL.
//
// Data shape:
//   viewers: { [email: lowercase]: { uid: string|null, name: string|null } }
//   uid+name are populated lazily on the viewer's first authenticated visit.
//
// Why FieldPath: emails contain dots, which are Firestore field path
// delimiters when passed as strings. We use FieldPath() to safely target
// nested map keys regardless of their content.
// ─────────────────────────────────────────────────────────────────────────────

import {
  doc, getDoc, updateDoc, deleteField, FieldPath,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StoryDocument } from "@/types/db";
import type { StoryVisibility, ViewerEntry } from "@/types/db";

export type { StoryVisibility, ViewerEntry, ViewersMap, StoryPermissions } from "@/types/db";

// ─── GQL ↔ Firestore visibility mapping ────────────────────────────────────
// Firestore stores visibility as lowercase strings ("private"). The Postgres
// StoryReference table uses a GraphQL enum (PRIVATE). These helpers bridge
// the two formats — call them at the boundary whenever data crosses between
// Firestore and the StoryReference table.

export function visibilityToGql(v: StoryVisibility): string {
  return v.toUpperCase();
}

export function visibilityFromGql(v: string): StoryVisibility {
  return v.toLowerCase() as StoryVisibility;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const MAX_VIEWERS = 10;

// ─── Email helpers ──────────────────────────────────────────────────────────

/** Normalize an email for use as a map key. Always store/lookup lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Build a Firestore FieldPath that safely targets viewers[email]. */
function viewerPath(email: string): FieldPath {
  return new FieldPath("permissions", "viewers", email);
}

// ─── Visibility ─────────────────────────────────────────────────────────────

/**
 * Change a story's visibility. Admin only.
 * NOTE: also mirror this to the corresponding StoryReference row in Postgres
 * so the AddContributor search filter stays correct (TODO: wire up when the
 * reference table is hooked into the create/update flow).
 */
export async function updateStoryVisibility(
  storyId:    string,
  visibility: StoryVisibility,
): Promise<void> {
  const ref = doc(db, "stories", storyId);
  await updateDoc(ref, "permissions.visibility", visibility);
}

// ─── Viewer management ──────────────────────────────────────────────────────

/**
 * Designate an email as a viewer. The viewer is added immediately with
 * uid/name as null. They'll be populated automatically on that user's
 * first authenticated visit to the story (via populateViewerOnFirstVisit).
 */
export async function addViewerEmail(
  storyId: string,
  email:   string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error("Invalid email address");
  }

  const ref  = doc(db, "stories", storyId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error(`Story ${storyId} not found`);

  const story = snap.data() as StoryDocument;
  const perms = story.permissions;

  if (perms.viewers?.[normalized] !== undefined) {
    throw new Error("This email has already been added");
  }
  if (Object.keys(perms.viewers ?? {}).length >= MAX_VIEWERS) {
    throw new Error(`Viewer limit reached (${MAX_VIEWERS}). Remove a viewer first.`);
  }

  const entry: ViewerEntry = { uid: null, name: null };
  await updateDoc(ref, viewerPath(normalized), entry);
}

/** Remove a designated viewer by email. Admin only. */
export async function removeViewerEmail(
  storyId: string,
  email:   string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  const ref = doc(db, "stories", storyId);
  await updateDoc(ref, viewerPath(normalized), deleteField());
}

/**
 * Lazy-populate a viewer's uid and name when they first visit the story
 * while authenticated. Idempotent — safe to call on every visit.
 *
 * Called from the story page after the access check passes for a viewer
 * whose entry has null uid.
 */
export async function populateViewerOnFirstVisit(
  storyId: string,
  email:   string,
  user:    { uid: string; displayName: string | null },
): Promise<void> {
  const normalized = normalizeEmail(email);
  const ref = doc(db, "stories", storyId);
  await updateDoc(ref, viewerPath(normalized), {
    uid:  user.uid,
    name: user.displayName,
  });
}

// ─── Read helpers ───────────────────────────────────────────────────────────

/** Build the public, shareable URL for a story. */
export function getStoryShareLink(storyId: string): string {
  return `${appOrigin()}/story/${storyId}`;
}

/** Can this user edit the story content (contributors, weights, etc.)? */
export function canUserEditStory(
  story: StoryDocument,
  uid:   string | null,
): boolean {
  if (!uid) return false;
  return story.permissions.admin === uid;
}

/**
 * Can this user view the story at all?
 * Takes both uid and email — uid covers the admin case (admin is identified
 * by UID), email covers the designated-viewer case.
 */
export function canUserViewStory(
  story: StoryDocument,
  uid:   string | null,
  email: string | null,
): boolean {
  const v = story.permissions.visibility;
  if (v === "public_visible" || v === "public_usable") return true;

  // Private from here on.
  if (uid && story.permissions.admin === uid) return true;
  if (!email) return false;
  return story.permissions.viewers?.[normalizeEmail(email)] !== undefined;
}

/** Can this user use the story as a contributor in their own story? */
export function canUserUseStoryAsContributor(
  story: StoryDocument,
  uid:   string | null,
): boolean {
  if (story.permissions.visibility === "public_usable") return true;
  return uid === story.permissions.admin;
}

/**
 * Default permissions block for a newly created story. Use this in the
 * story-creation mutation to ensure the shape is always consistent.
 */
export function defaultStoryPermissions(adminUid: string) {
  return {
    admin:      adminUid,
    visibility: "private" as const,
    viewers:    {},
  };
}

// ─── Internal ───────────────────────────────────────────────────────────────

function appOrigin(): string {
  return typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "https://cuecount.io";
}