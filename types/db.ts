// types/db.ts
// ─────────────────────────────────────────────────────────────────────────────
// These types mirror the Postgres schema exactly — one type per table.
// "Row" types represent a single record as returned by a DB query, with
// foreign keys as plain ID strings (not nested objects).
//
// Key structural decisions:
//   - Relationship IS the contributor link (no separate StoryContributor table)
//   - Relationship owns the contributor trend directly via trendId — there is
//     no contributorStoryId. A trend becomes a contributor purely by being
//     referenced from a Relationship row.
//   - name on RelationshipRow is the display label for the contributor
//   - variantId = null on any row means it belongs to the base/canonical state
//   - Variants are always scoped to the root focal story (never a contributor)
//   - Trends can be overridden per-variant via variantId + baseTrendId
//   - Stories are now purely focal stories — no story exists solely to be a
//     contributor. Contributor identity lives on the Relationship row.
// ─────────────────────────────────────────────────────────────────────────────

// Perspective — top-level container, like a folder for related stories
export type PerspectiveRow = {
  id: string;
  name: string;
  slug: string;        // URL-safe identifier e.g. "us-macro-trends"
  createdBy: string;   // Firebase UID
  plan: string;        // "free" | "pro" | "enterprise"
  createdAt: string;   // ISO timestamp
};

// Trend — metadata for a data series. Can be:
//   - A base trend (variantId = null, baseTrendId = null): sourced from API or created manually
//   - A variant override (variantId set, baseTrendId set): replaces the base trend
//     when the referenced variant is active in the UI
export type TrendRow = {
  id: string;
  name: string;
  unit: string | null;
  denomination: number | null; // e.g. 1000 = values are in thousands
  description: string | null;
  source: string;
  frequency: string;           // "monthly" | "quarterly" | "annual"
  externalId: string | null;   // ID in external source system if API-sourced
  variantId: string | null;    // FK → Variant.id — null if this is base data
  baseTrendId: string | null;  // FK → Trend.id — the trend this overrides (null if base)
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

// TrendValue — one data point in a trend's time series.
export type TrendValueRow = {
  id: string;
  trendId: string;  // FK → Trend.id
  value: number;
  timestamp: string;
};

// Story — a question or analysis inside a Perspective.
// Stories are purely focal — they represent the question being asked and
// own the primary trend line on the graph. Contributors are not stories;
// they are Relationship rows that point directly to a Trend.
export type StoryRow = {
  id: string;
  perspectiveId: string; // FK → Perspective.id
  focalTrendId: string;  // FK → Trend.id — the primary line rendered on the graph
  name: string;
  status: string;        // "active" | "archived" | "draft" — reserved for future use
  createdAt: string;
  updatedAt: string;
};

// Contributor — the link between a focal story and a contributor trend.
// Replaces the old Relationship table. Flat — every contributor belongs
// directly to a focal story. The contributor owns its trend via trendId.
export type ContributorRow = {
  id: string;
  focalStoryId: string; // FK → Story.id
  trendId: string;      // FK → Trend.id
  name: string;         // display label
  type: string;         // "direct" | "inverse" | "correlated" | "lagged"
  createdAt: string;
};

// ── Weight ────────────────────────────────────────────────────────────────────

// WeightRow — header that owns a weight series for a contributor.
// analysisId = null → base weights, always shown by default.
// analysisId set   → these weights only apply when that analysis is active.
export type WeightRow = {
  id: string;
  analysisId: string | null; // FK → Analysis.id — null = base
  contributorId: string;     // FK → Contributor.id
};

// WeightValueRow — one data point in a weight series.
export type WeightValueRow = {
  id: string;
  weightId: string;  // FK → Weight.id
  value: number;     // 0.0–1.0 correlation strength
  timestamp: string;
};

// ── Lag ───────────────────────────────────────────────────────────────────────

// LagRow — header that owns a lag series for a contributor.
// analysisId = null → base lag values.
export type LagRow = {
  id: string;
  analysisId: string | null; // FK → Analysis.id — null = base
  contributorId: string;     // FK → Contributor.id
};

// LagValueRow — one data point in a lag series.
export type LagValueRow = {
  id: string;
  lagId: string;     // FK → Lag.id
  value: number;     // periods offset — positive = contributor leads focal story
  timestamp: string;
};

// ── RelationshipValue ─────────────────────────────────────────────────────────

// RelationshipRow — header that owns a relationship-value series for a contributor.
// analysisId = null → base relationship values.
export type RelationshipRow = {
  id: string;
  analysisId: string | null; // FK → Analysis.id — null = base
  contributorId: string;     // FK → Contributor.id
};

// RelationshipValueRow — one data point in a relationship-value series.
export type RelationshipValueRow = {
  id: string;
  relationshipId: string; // FK → Relationship.id
  value: number;
  timestamp: string;
};

// Analysis — a named alternative state for a root focal story.
export type AnalysisRow = {
  id: string;
  storyId: string;      // FK → Story.id — always the ROOT focal story
  name: string | null;
  isDefault: boolean;   // true = the story's permanent default analysis
  createdAt: string;
  updatedAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Composed types — assembled by query functions, NOT raw DB rows.
// ─────────────────────────────────────────────────────────────────────────────

// A Trend with its value series attached — renders one line on the graph
export type TrendWithValues = TrendRow & {
  values: TrendValueRow[];
};

// A Story with its focal trend + values attached — base unit for display
export type StoryWithTrend = StoryRow & {
  focalTrend: TrendWithValues;
};

// A fully assembled contributor — ContributorRow with its trend values,
// and all time series headers + their data points attached.
export type ContributorWithDetail = ContributorRow & {
  trend: TrendWithValues;
  weights: (WeightRow & { values: WeightValueRow[] })[];
  lags: (LagRow & { values: LagValueRow[] })[];
  relationships: (RelationshipRow & { values: RelationshipValueRow[] })[];
};

// A full focal story with all base contributors assembled, ready to render.
export type StoryWithContributors = StoryWithTrend & {
  contributors: ContributorWithDetail[];
};