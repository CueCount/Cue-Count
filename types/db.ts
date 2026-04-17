// types/db.ts
// ─────────────────────────────────────────────────────────────────────────────
// All raw row types mirror the database schema exactly.
// All value tables share the same shape: { id, timestamp, value, dataId }
// dataId is the universal join key linking every Postgres row back to its
// owner in the Firebase document hierarchy.
// ─────────────────────────────────────────────────────────────────────────────

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