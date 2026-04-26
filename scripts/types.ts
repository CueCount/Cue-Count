// scripts/types.ts
// Shared types used across all pipeline scripts.
// Kept separate from types/db.ts so scripts can run as standalone
// Node processes without importing anything from the Next.js app.

export type RawPair = {
  date: string;        // raw date string from the source API — normalized downstream
  value: number | null;
};

export type TrendRow = {
  id: string;
  trendDataId: string;      // join key — links all TrendData rows back to this trend
  name: string;
  unit: string | null;
  denomination: number | null;
  frequency: string | null;
  source: string;            // must match a case in dispatch.ts
  apiDataId: string | null;  // the series ID used by the external API
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;   // last time data was fetched for this trend
};