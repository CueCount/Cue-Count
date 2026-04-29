// types/db.ts
// ─────────────────────────────────────────────────────────────────────────────
// All raw row types mirror the database schema exactly.
// All value tables share the same shape: { id, timestamp, value, dataId }
// dataId is the universal join key linking every Postgres row back to its
// owner in the Firebase document hierarchy.
// ─────────────────────────────────────────────────────────────────────────────

export type StoryVisibility = "private" | "public_visible" | "public_usable";
 
// ViewerEntry — populated lazily. When the admin first designates an email,
// uid+name are null. When that user actually signs in and visits the story,
// we populate uid+name as a one-time write.
export type ViewerEntry = {
  uid:  string | null;     // populated on first authenticated visit
  name: string | null;     // populated on first authenticated visit (from displayName)
};
 
// Map keyed by lowercase email address. Using the email as key gives us:
//   • Direct lookup by auth email at story-load time
//   • Uniqueness for free
//   • The ability to designate viewers BEFORE they have an account
export type ViewersMap = { [email: string]: ViewerEntry };
 
export type StoryPermissions = {
  admin:      string;            // UID of the only editor
  visibility: StoryVisibility;
  viewers:    ViewersMap;
};

// ─────────────────────────────────────────────────────────────────────────────
// Firebase document types
// ─────────────────────────────────────────────────────────────────────────────

export type PerspectiveDocument = {
  id: string;
  name: string;
  perspectiveId: string;
  createdAt: string;
  updatedAt: string;
  permissions: {
    admin: string;
  };
};

// StoryDocument — the Firebase document for a story.
// Contains the full hierarchy of analyses and contributors as nested maps.
// Raw Postgres value rows are NOT stored here — only the DataIds used to
// fetch them from the flat Postgres tables.
export type StoryDocument = {
  id: string;
  name: string;
  perspectiveId: string;
  trendId: string;
  createdAt: string;
  updatedAt: string;
  permissions: StoryPermissions;
  Analysis: {
    [analysisId: string]: {
      Name: string;
      Story: {
        DataId: string; // join key → APIData or CreatedData table
      };
      Contributors: {
        [contributorId: string]: {
          DataId: string; // join key → all 5 value tables
        };
      };
    };
  };
  Contributors: {
    [contributorId: string]: {
      Name: string;
      trendId: string;
    };
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Postgres table row types
// ─────────────────────────────────────────────────────────────────────────────

// Trends — metadata for a data series.
// apiDataId is set for externally sourced trends, null for manually created ones.
export type TrendRow = {
  id: string;
  trendId: string;
  trendDataId: string;
  name: string;
  unit: string | null;
  denomination: number | null;
  frequency: string;
  source: string;
  apiDataId: string | null;
  createdAt: string;
  updatedAt: string;
};

// Data — time series values for trends.
export type TrendDataRow = {
  timestamp: string;
  value: number;
  trendDataId: string; // FK → TrendRow.dataId
};

// Data — time series values for trends.
export type DataRow = {
  timestamp: string;
  value: number;
  dataId: string;
};

// WeightData — contributor influence weight over time.
export type WeightRow = {
  timestamp: string;
  value: number; // 0.0–1.0
  dataId: string; // FK → StoryDocument contributor dataId
};

// LagData — contributor lag offset over time (in days).
export type LagRow = {
  timestamp: string;
  value: number;
  dataId: string; // FK → StoryDocument contributor dataId
};

export type CorrelationRow = {
  timestamp: string;
  value: number; // -1.0 to 1.0
  dataId: string; // FK → StoryDocument contributor dataId
};
 

// ─────────────────────────────────────────────────────────────────────────────
// Composed types — built by DataState, never stored in the DB
// ─────────────────────────────────────────────────────────────────────────────

// AssembledContributor — one contributor with all its value rows attached,
// scoped to the active analysis. Built inside assembledStory useMemo.
// Objects inside each array are references to flat slice rows — not copies.
export type MergedDataPoint = {
  timestamp: string;
  value: number;
  isOverride: boolean;  // true = came from dataValues (analysis), false = came from trendDataValues
};

export type AssembledContributor = {
  id: string;
  name: string;
  trendId: string | null;
  dataId: string;
  meta: TrendRow | null;
  trendDataValues: TrendDataRow[];
  dataValues: DataRow[];
  mergedDataValues: MergedDataPoint[];  // ← NEW
  weightValues: WeightRow[];
  lagValues: LagRow[];
  correlationValues: CorrelationRow[];
};

export type AssembledAnalysis = {
  id: string;
  name: string;
  dataId: string;
  dataValues: DataRow[];
};

// AssembledStory — the fully assembled story for the active analysis.
// Read-only derived view built by DataState's assembledStory useMemo.
// Components read from here. Edits go to the flat slices, not here.
export type AssembledStory = {
  id:               string;
  name:             string;
  trendId:          string;
  dataId:           string;
  activeAnalysisId: string;
  meta:             TrendRow | null;
  trendDataValues:  TrendDataRow[];
  dataValues:       DataRow[];
  contributors:     AssembledContributor[];
  analyses:         AssembledAnalysis[];
  calculatedDataValues: { timestamp: string; value: number }[];
};

// ─────────────────────────────────────────────────────────────────────────────
// StoryReference — Postgres row used as a searchable index for the
// AddContributor modal. Mirrors a small subset of fields from StoryDocument
// so we can filter by visibility/admin without doing N Firestore reads.
// NOTE: not yet wired into story create/update flow — TODO.
// ─────────────────────────────────────────────────────────────────────────────
export type StoryReferenceRow = {
  storyId:    string;
  name:       string;
  visibility: StoryVisibility;
  adminUid:   string;
};