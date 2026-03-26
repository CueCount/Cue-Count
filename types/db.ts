// types/db.ts
// ─────────────────────────────────────────────────────────────────────────────
// These types mirror the Postgres schema exactly — one type per table.
// "Row" types represent a single record as returned by a DB query, with
// foreign keys as plain ID strings (not nested objects).
//
// Key structural decisions:
//   - Relationship IS the contributor link (no separate StoryContributor table)
//   - variantId = null on any row means it belongs to the base/canonical state
//   - Variants are always scoped to the root focal story (never a contributor)
//   - Trends can be overridden per-variant via variantId + baseTrendId
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
// Override trends (variantId set on their parent TrendRow) have their own
// TrendValue rows — they don't mutate the base trend's values.
export type TrendValueRow = {
  id: string;
  trendId: string;  // FK → Trend.id
  value: number;
  timestamp: string; // ISO timestamp — the date this data point represents
};

// Story — a question or analysis inside a Perspective.
// Every trend used as a contributor gets promoted into its own Story,
// with that trend as focalTrendId.
export type StoryRow = {
  id: string;
  perspectiveId: string; // FK → Perspective.id
  focalTrendId: string;  // FK → Trend.id — the primary line rendered on the graph
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

// Relationship — the link between a focal story and a contributor story.
// This replaces the old StoryContributor + Relationship pair. Being a
// contributor IS the relationship. One row per (focal, contributor, variant)
// combination.
//
// variantId = null → base/canonical relationship, always present
// variantId set   → this row only applies when that variant is active.
//                   A variant only needs relationship rows for contributors
//                   whose type or weights differ from the base — all others
//                   fall through to their base row automatically.
export type RelationshipRow = {
  id: string;
  focalStoryId: string;       // FK → Story.id — the story being contributed to
  contributorStoryId: string; // FK → Story.id — the story doing the contributing
  variantId: string | null;   // FK → Variant.id — null = base
  type: string;               // "direct" | "inverse" | "correlated" | "lagged"
  createdBy: string;
  createdAt: string;
};

// Weight — one data point in the weight time series for a relationship.
// Represents how strongly a contributor relates to its focal story on a given date.
// Lives under a specific RelationshipRow, so variant weights are automatically
// separated (each variant's relationship row has its own weight series).
export type WeightRow = {
  id: string;
  relationshipId: string; // FK → Relationship.id
  value: number;          // 0.0–1.0 correlation strength
  timestamp: string;
};

// RelationshipValue — time-series modifier for a relationship.
// Used for type-specific quantitative data, e.g. lag days for a "lagged"
// relationship. Empty until the UI populates it for relevant relationship types.
export type RelationshipValueRow = {
  id: string;
  relationshipId: string; // FK → Relationship.id
  value: number;
  timestamp: string;
};

// LagValue — time-series lag offset for a relationship.
// Tracks how many periods the contributor leads or lags the focal story.
// Stored in its own table (not RelationshipValue) because lag is a distinct
// concept with different units and display semantics.
export type LagValueRow = {
  id: string;
  relationshipId: string; // FK → Relationship.id
  value: number;          // periods offset — positive = contributor leads focal story
  timestamp: string;
};

// Variant — a named alternative state for a root focal story.
// storyId ALWAYS references the root story at the top of the hierarchy,
// never a contributor story, regardless of how deep the edited relationship is.
// A variant has no data of its own — it's just an ID and label that relationship
// rows and override trends reference to declare which scenario they belong to.
export type VariantRow = {
  id: string;
  storyId: string;      // FK → Story.id — always the ROOT focal story
  name: string | null;  // e.g. "Bear case", "Stagflation scenario"
  createdBy: string;
  createdAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Composed types — assembled by query functions, NOT raw DB rows.
// These are what the UI actually consumes after joining across tables.
// ─────────────────────────────────────────────────────────────────────────────

// A Trend with its value series attached — renders one line on the graph
export type TrendWithValues = TrendRow & {
  values: TrendValueRow[];
};

// A Story with its focal trend + values attached — base unit for display
export type StoryWithTrend = StoryRow & {
  focalTrend: TrendWithValues;
};

// A Relationship with its modifier value series attached
export type RelationshipWithValues = RelationshipRow & {
  values: RelationshipValueRow[];
};

// A fully assembled contributor — the relationship row itself carries the
// contributor link, type, and variantId. Weights and modifier values hang
// off the relationship ID.
export type ContributorWithDetail = RelationshipRow & {
  contributorStory: StoryWithTrend;
  weights: WeightRow[];
  relationshipValues: RelationshipValueRow[];
  lagValues: RelationshipValueRow[];
};

// A full focal story with all base contributors assembled, ready to render.
// DataState's selectors handle variant filtering before building this type —
// components receive the already-resolved view, not raw mixed data.
export type StoryWithContributors = StoryWithTrend & {
  contributors: ContributorWithDetail[];
};