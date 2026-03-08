// types/db.ts
// ─────────────────────────────────────────────────────────────────────────────
// These types mirror your Postgres schema exactly — one type per table.
// A "Row" type represents a single record as it comes back from a DB query,
// with foreign keys stored as plain ID strings (not nested objects).
// ─────────────────────────────────────────────────────────────────────────────

// Perspective — top-level container, like a folder for a question
export type PerspectiveRow = {
  id: string;           // UUID
  name: string;
  slug: string;         // URL-safe unique identifier e.g. "abcellera-q2"
  createdBy: string;    // Firebase user ID
  plan: string;         // "free" | "pro" | "enterprise"
  createdAt: string;    // ISO timestamp
};

// PerspectiveMember — who has access to a perspective and at what role
export type PerspectiveMemberRow = {
  perspectiveId: string;  // FK → Perspective.id
  userId: string;         // Firebase user ID
  role: string;           // "owner" | "editor" | "viewer"
  createdAt: string;
};

// Trend — metadata about a data series (not the values themselves)
export type TrendRow = {
  id: string;           // UUID
  name: string;         // e.g. "US Total Population"
  unit: string | null;  // e.g. "thousands", "%" , "USD"
  description: string | null;
  source: string;       // e.g. "US Census Bureau"
  frequency: string;    // "monthly" | "quarterly" | "annual"
  externalId: string | null;  // ID in the external source system if applicable
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

// TrendValue — a single data point in a Trend's time series
export type TrendValueRow = {
  id: string;         // UUID
  trendId: string;    // FK → Trend.id
  index: number;      // sequential position (0, 1, 2...) for ordering
  value: number;      // the actual number
  timestamp: string;  // ISO timestamp — the date this value represents
};

// Story — a question or analysis living inside a Perspective
export type StoryRow = {
  id: string;             // UUID
  perspectiveId: string;  // FK → Perspective.id
  focalTrendId: string;   // FK → Trend.id — the primary/bold line on the graph
  name: string;           // the question e.g. "Should I invest in AbCellera?"
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

// Variant — a supporting/comparison trend attached to a Story
export type VariantRow = {
  id: string;         // UUID
  storyId: string;    // FK → Story.id
  trendId: string;    // FK → Trend.id — which trend this variant uses
  name: string | null;  // optional display override for this trend in context
  createdBy: string;
  createdAt: string;
};

// VariantValue — a single data point for a Variant's version of a trend
// (Variants can have their own value overrides separate from the base Trend)
export type VariantValueRow = {
  id: string;         // UUID
  variantId: string;  // FK → Variant.id
  index: number;
  value: number;
  timestamp: string;
};

// Connection — a relationship between two trends or connections within a Story
// Used for correlation/causation graph logic
export type ConnectionRow = {
  id: string;                       // UUID
  storyId: string;                  // FK → Story.id
  sourceType: string;               // "trend" | "connection"
  sourceTrendId: string | null;     // FK → Trend.id (if sourceType = "trend")
  sourceConnectionId: string | null;// FK → Connection.id (if sourceType = "connection")
  targetType: string;               // "trend" | "connection"
  targetTrendId: string | null;
  targetConnectionId: string | null;
  direction: string;                // "unidirectional" | "bidirectional"
  weight: number;                   // correlation strength 0.0–1.0
  createdAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Composed types — these are NOT DB rows, they're what your UI actually needs
// after joining tables together. Think of these as what your query functions
// return after assembling data from multiple tables.
// ─────────────────────────────────────────────────────────────────────────────

// A Trend with its values attached — used to render a single line on a graph
export type TrendWithValues = TrendRow & {
  values: TrendValueRow[];
};

// A full Story with its focal trend + all variants, ready to render
export type StoryWithTrends = StoryRow & {
  focalTrend: TrendWithValues;
  variants: (VariantRow & { trend: TrendWithValues })[];
};