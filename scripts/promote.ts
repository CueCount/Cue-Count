// scripts/promote.ts
// Promotes an approved SyncBatch into TrendData.
// Called by the /admin/sync UI when you hit Approve — but can also be run
// directly from the terminal if needed.
//
// What it does:
//   1. Loads the SyncBatch and confirms it is approved
//   2. Snapshots existing TrendData rows for this trendDataId (enables rollback)
//   3. Upserts the staged rows into TrendData
//   4. Updates TrendRow with frequency/denomination/unit if they were set during review
//   5. Marks the batch as promoted
//
// Rollback:
//   npx ts-node scripts/promote.ts --rollback <batchId>
//   npx ts-node scripts/promote.ts --rollback last
//
// Nuclear option (full DB restore) — see PITR instructions at bottom of file

import {
  getSyncBatch,
  getLatestApprovedSyncBatch,
  upsertSyncBatch,
  getTrendDataByTrendDataId,
  upsertTrendData,
  deleteTrendDataByIds,
  updateTrend,
} from "@dataconnect/generated";

// ─── Types ─────────────────────────────────────────────────────────────────

type StagedRow = {
  id: string;
  trendDataId: string;
  timestamp: string;
  value: number;
};

type SyncBatch = {
  id: string;
  trendDataId: string;
  trendName: string;
  source: string;
  status: string;
  rowCount: number;
  isInitialLoad: boolean;
  stagedRows: string;             // JSON string of StagedRow[]
  detectedFrequency: string;
  trendFrequency: string | null;
  trendUnit: string | null;
  trendDenomination: number | null;
  firstTimestamp: string;
  lastTimestamp: string;
  statMin: number;
  statMax: number;
  statMean: number;
  importedAt: string;
  reviewedAt: string | null;
  promotedAt: string | null;
  notes: string | null;
  // Fields written during review approval in the UI
  approvedFrequency?: string | null;
  approvedUnit?: string | null;
  approvedDenomination?: number | null;
  snapshotBefore?: string | null;  // JSON snapshot of previous TrendData rows
};

// ─── Main promote function ─────────────────────────────────────────────────
// Called by the review UI on approval — receives the batchId

export async function promote(batchId: string): Promise<void> {
  console.log(`\n[promote] Loading batch: ${batchId}`);

  const batchResult = await getSyncBatch({ id: batchId });
  const batch = batchResult?.data?.syncBatch as SyncBatch | null;

  if (!batch) {
    throw new Error(`No SyncBatch found for id: "${batchId}"`);
  }

  // Guard — only promote approved batches
  if (batch.status !== "approved") {
    throw new Error(
      `Batch "${batchId}" has status "${batch.status}" — only "approved" batches can be promoted`
    );
  }

  console.log(`[promote] "${batch.trendName}" — ${batch.rowCount} rows`);

  const stagedRows: StagedRow[] = JSON.parse(batch.stagedRows);
  const now = new Date().toISOString();

  // 1. Snapshot existing TrendData rows before writing (enables app-level rollback)
  const existingResult = await getTrendDataByTrendDataId({ trendDataId: batch.trendDataId });
  const existingRows = existingResult?.data?.trendDatas ?? [];
  const snapshot = JSON.stringify(existingRows);

  console.log(`[promote] Snapshot saved — ${existingRows.length} existing rows`);

  // Store snapshot on the batch itself before writing
  await upsertSyncBatch({ ...batch, snapshotBefore: snapshot });

  // 2. Upsert staged rows into TrendData
  await upsertBatch(stagedRows);
  console.log(`[promote] ✓ Wrote ${stagedRows.length} rows to TrendData`);

  // 3. Update TrendRow with any metadata confirmed during review
  //    Only updates fields that were explicitly set during approval
  const metaUpdates: Record<string, unknown> = {};
  if (batch.approvedFrequency)    metaUpdates.frequency    = batch.approvedFrequency;
  if (batch.approvedUnit)         metaUpdates.unit         = batch.approvedUnit;
  if (batch.approvedDenomination) metaUpdates.denomination = batch.approvedDenomination;
  metaUpdates.syncedAt = now;
  metaUpdates.updatedAt = now;

  await updateTrend({ trendDataId: batch.trendDataId, ...metaUpdates });

  const updatedFields = Object.keys(metaUpdates).filter(k => k !== "syncedAt" && k !== "updatedAt");
  if (updatedFields.length > 0) {
    console.log(`[promote] Updated TrendRow fields: ${updatedFields.join(", ")}`);
  }

  // 4. Mark batch as promoted
  await upsertSyncBatch({
    ...batch,
    status: "promoted",
    promotedAt: now,
    snapshotBefore: snapshot,
  });

  console.log(`[promote] ✓ Batch promoted successfully`);
  console.log(`[promote] To undo: npx ts-node scripts/promote.ts --rollback ${batchId}\n`);
}

// ─── Rollback ──────────────────────────────────────────────────────────────
// Restores TrendData to its pre-promotion state using the stored snapshot.

export async function rollback(batchId: string): Promise<void> {
  console.log(`\n[rollback] Loading batch: ${batchId}`);

  const isLast = batchId === "last";
  const batchResult = isLast
    ? await getLatestApprovedSyncBatch({})
    : await getSyncBatch({ id: batchId });

  const batch = (
    isLast
      ? batchResult?.data?.syncBatches?.[0]
      : batchResult?.data?.syncBatch
  ) as SyncBatch | null;

  if (!batch) {
    throw new Error(`No batch found for: "${batchId}"`);
  }

  if (batch.status !== "promoted") {
    throw new Error(`Batch "${batch.id}" has status "${batch.status}" — can only roll back "promoted" batches`);
  }

  if (!batch.snapshotBefore) {
    throw new Error(`Batch "${batch.id}" has no snapshot — cannot roll back`);
  }

  console.log(`[rollback] "${batch.trendName}" promoted at ${batch.promotedAt}`);

  const previousRows: StagedRow[] = JSON.parse(batch.snapshotBefore);

  if (previousRows.length === 0) {
    // Initial load — delete all the rows that were promoted
    const promotedRows: StagedRow[] = JSON.parse(batch.stagedRows);
    const ids = promotedRows.map((r) => r.id);
    console.log(`[rollback] Initial load — deleting ${ids.length} promoted rows`);
    await deleteTrendDataByIds({ ids });
  } else {
    // Update — restore previous rows
    console.log(`[rollback] Restoring ${previousRows.length} previous rows`);
    await upsertBatch(previousRows);
  }

  // Mark batch as rolled back
  await upsertSyncBatch({ ...batch, status: "rolled_back" });

  console.log(`[rollback] ✓ Rollback complete for "${batch.trendName}"\n`);
}

// ─── Batch upsert ──────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

async function upsertBatch(rows: StagedRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map((row) =>
        upsertTrendData({
          id: row.id,
          dataId: row.trendDataId,
          timestamp: row.timestamp,
          value: row.value,
        })
      )
    );
  }
}

// ─── CLI entry point ───────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--rollback") {
    const batchId = args[1];
    if (!batchId) {
      console.error("Usage: npx ts-node scripts/promote.ts --rollback <batchId|last>");
      process.exit(1);
    }
    await rollback(batchId);
    return;
  }

  const batchId = args[0];
  if (!batchId) {
    console.error(
      "Usage:\n" +
      "  npx ts-node scripts/promote.ts <batchId>\n" +
      "  npx ts-node scripts/promote.ts --rollback <batchId|last>"
    );
    process.exit(1);
  }

  await promote(batchId);
}

// ─── Nuclear option — Cloud SQL PITR ──────────────────────────────────────
// For catastrophic failures affecting the whole database, not single batches.
// PITR always creates a new instance — takes ~30-60 minutes.
//
// Step 1: Note the UTC timestamp just before the bad operation
//         e.g. "2026-04-18T08:00:00.000Z"
//
// Step 2: Clone the instance to that point in time:
//   gcloud sql instances clone cue-count-instance cue-count-restored \
//     --point-in-time="2026-04-18T08:00:00.000Z"
//
// Step 3: Export the TrendData table from the clone:
//   gcloud sql export sql cue-count-restored gs://your-bucket/restore.sql \
//     --database=cue-count-database --table=TrendData
//
// Step 4: Import back into the live instance:
//   gcloud sql import sql cue-count-instance gs://your-bucket/restore.sql \
//     --database=cue-count-database
//
// Step 5: Delete the temporary clone:
//   gcloud sql instances delete cue-count-restored
//
// Full docs: https://cloud.google.com/sql/docs/postgres/backup-recovery/pitr

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});