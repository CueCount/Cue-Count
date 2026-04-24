// scripts/fetchAndStage.ts
// Single file for all data pipeline operations.
// Two subcommands, both operate on the same sources and TrendRows.
//
// ── SCOUT ─────────────────────────────────────────────────────────────────
// Explores a series from any supported source. Prints metadata + sample
// values. Nothing is written anywhere. Use this to browse series and
// decide what's worth adding as a Trend.
//
//   npx ts-node scripts/fetchAndStage.ts scout FRED UNRATE
//   npx ts-node scripts/fetchAndStage.ts scout BLS LNS14000000
//   npx ts-node scripts/fetchAndStage.ts scout "World Bank" NY.GDP.MKTP.CD:US
//
// ── FETCH ─────────────────────────────────────────────────────────────────
// Fetches data for an existing TrendRow, shows a terminal preview,
// lets you confirm metadata, then writes directly to TrendData on approval.
// On subsequent runs, only fetches data newer than the last sync.
//
//   npx ts-node scripts/fetchAndStage.ts fetch trenddata-abc123
//   npx ts-node scripts/fetchAndStage.ts fetch trenddata-abc123 --force

import * as readline from "readline";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "crypto";
import { dispatch } from "./dispatch";
import { TrendRow, RawPair } from "./types";
import { normalizeTimestamp } from "./utils/normalizeTimestamp";
import { fetchWithRetry } from "./utils/fetchWithRetry";
import {
  getTrendByTrendDataId,
  getLatestTrendDataTimestamp,
  upsertTrendData,
  updateTrend,
} from "@dataconnect/generated";

// ─── Firebase initialization ───────────────────────────────────────────────
// The DataConnect generated SDK wraps the Firebase client SDK.
// In Next.js, Firebase is initialized automatically. In a standalone Node
// script it must be done manually before any SDK calls are made.
import { initializeApp, getApps } from "firebase/app";
 
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? "",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? "",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? "",
};
 
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

// ─── API Keys ──────────────────────────────────────────────────────────────
// Read from .env.local — never hardcoded
const FRED_KEY   = process.env.FRED_API_KEY   ?? "";
const BLS_KEY    = process.env.BLS_API_KEY    ?? "";
const BEA_KEY    = process.env.BEA_API_KEY    ?? "";
const EIA_KEY    = process.env.EIA_API_KEY    ?? "";
const CENSUS_KEY = process.env.CENSUS_API_KEY ?? "";

// ─── Types ─────────────────────────────────────────────────────────────────
// TrendRow and RawPair are imported from ./types
// StagedRow and ScoutResult are local to this file only

// StagedRow — a RawPair that has been normalized and is ready to write.
// Has a UUID, the trendDataId join key, a full ISO timestamp, and a
// scaled value (denomination already applied).
type StagedRow = {
  id: string;
  trendDataId: string;
  timestamp: string;
  value: number;
};

// ScoutResult — everything the scout functions return.
// Used to print the terminal preview in runScout().
type ScoutResult = {
  title: string;
  rawUnits: string;
  frequency: string;
  lastUpdated: string | null;
  description: string | null;
  samples: { date: string; value: number }[];
  suggestedUnit: string;
  suggestedDenomination: number;
};

// ══════════════════════════════════════════════════════════════════════════
// ENTRY POINT — main()
// Reads the subcommand from argv and routes to commandScout or commandFetch.
// All other functions are called from those two.
// ══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const subcommand = args[0];

  if (subcommand === "scout") {
    await commandScout(args.slice(1));
  } else if (subcommand === "fetch") {
    await commandFetch(args.slice(1));
  } else {
    printUsage();
    process.exit(1);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// COMMAND: commandScout(args)
//
// Handles: npx ts-node scripts/fetchAndStage.ts scout <source> <apiDataId>
//
// What it does:
//   1. Parses source + apiDataId from args
//   2. Calls runScout() to hit the API's metadata endpoint
//   3. Calls printScoutResult() to display everything in the terminal
//   4. Exits — nothing written, no prompts
// ══════════════════════════════════════════════════════════════════════════

async function commandScout(args: string[]) {
  const source = args[0];
  const apiDataId = args[1];

  if (!source || !apiDataId) {
    console.error(
      "\nUsage: npx ts-node scripts/fetchAndStage.ts scout <source> <apiDataId>\n\n" +
      "Examples:\n" +
      "  npx ts-node scripts/fetchAndStage.ts scout FRED UNRATE\n" +
      "  npx ts-node scripts/fetchAndStage.ts scout BLS LNS14000000\n" +
      '  npx ts-node scripts/fetchAndStage.ts scout "World Bank" NY.GDP.MKTP.CD:US\n'
    );
    process.exit(1);
  }

  console.log(`\nScouting ${source} — ${apiDataId}...\n`);

  const result = await runScout(source, apiDataId);
  printScoutResult(source, apiDataId, result);
}

// ══════════════════════════════════════════════════════════════════════════
// COMMAND: commandFetch(args)
//
// Handles: npx ts-node scripts/fetchAndStage.ts fetch <trendDataId> [--force]
//
// What it does:
//   1. Loads the TrendRow by trendDataId — this gives us source + apiDataId
//      (the TrendRow is the routing table AND the destination reference)
//   2. Calls getLatestTrendDataTimestamp() to determine the fetch window
//      — if rows exist: fetch only data newer than the latest timestamp
//      — if no rows exist: fetch the full series (initial load)
//      — if --force: always fetch the full series regardless
//   3. Calls dispatch() to hit the right adapter for this source
//   4. Filters nulls, detects frequency, applies denomination
//   5. Builds StagedRows (normalized, scaled, ready to write)
//   6. Calls printFetchPreview() to show stats + samples in terminal
//   7. Prompts to confirm/edit frequency, unit, denomination
//   8. Prompts approve / reject
//   9. On approval: calls upsertBatch() to write to TrendData,
//      then calls updateTrend() to stamp the TrendRow with confirmed metadata
// ══════════════════════════════════════════════════════════════════════════

async function commandFetch(args: string[]) {
  const force = args.includes("--force");
  const trendDataId = args.find((a) => !a.startsWith("--"));

  if (!trendDataId) {
    console.error(
      "\nUsage: npx ts-node scripts/fetchAndStage.ts fetch <trendDataId> [--force]\n\n" +
      "Examples:\n" +
      "  npx ts-node scripts/fetchAndStage.ts fetch trenddata-abc123\n" +
      "  npx ts-node scripts/fetchAndStage.ts fetch trenddata-abc123 --force\n"
    );
    process.exit(1);
  }

  // Step 1 — Load TrendRow
  // The TrendRow contains everything we need:
  //   .source + .apiDataId → tells dispatch() which API to call and what to request
  //   .trendDataId         → becomes the dataId join key on every written row
  //   .frequency / .unit / .denomination → used during normalization if already set
  const trendResult = await getTrendByTrendDataId({ trendDataId });
  const trend = trendResult?.data?.trends?.[0] as TrendRow | null;

  if (!trend) {
    console.error(`\nNo TrendRow found for trendDataId: "${trendDataId}"\n`);
    process.exit(1);
  }

  if (!trend.apiDataId) {
    console.error(`\nTrend "${trend.name}" has no apiDataId — cannot fetch from external source.\n`);
    process.exit(1);
  }

  const SEP = "─".repeat(58);
  console.log(`\n${SEP}`);
  console.log(`Trend        : ${trend.name}`);
  console.log(`Source       : ${trend.source}`);
  console.log(`API ID       : ${trend.apiDataId}`);
  console.log(`TrendRow set : freq=${trend.frequency ?? "?"} unit=${trend.unit ?? "?"} denom=${trend.denomination ?? "?"}`);
  console.log(SEP);

  // Step 2 — Determine fetch window
  // If TrendData rows already exist for this trendDataId, only fetch
  // observations newer than the latest one. This makes the same command
  // work for both initial loads and incremental updates.
  let since: string | undefined;
  let isInitialLoad = true;

  if (!force) {
    const latestResult = await getLatestTrendDataTimestamp({ trendDataId });
    const latest = latestResult?.data?.trendDatas?.[0]?.timestamp ?? null;
    if (latest) {
      since = latest;
      isInitialLoad = false;
      console.log(`\nMode         : incremental (since ${since.slice(0, 10)})`);
    } else {
      console.log(`\nMode         : initial load`);
    }
  } else {
    console.log(`\nMode         : forced full re-fetch`);
  }

  // Step 3 — Fetch via dispatch
  // dispatch() reads trend.source → calls the right adapter
  // The adapter returns RawPair[] — just { date, value } pairs
  console.log(`Fetching from ${trend.source}...`);
  const rawPairs = await dispatch(trend, since);

  if (rawPairs.length === 0) {
    console.log(`\nNo new data returned — already up to date.\n`);
    process.exit(0);
  }

  // Step 4 — Filter nulls
  const validPairs = rawPairs.filter(
    (p) => p.value !== null && p.value !== undefined && isFinite(p.value as number)
  );
  console.log(`Fetched      : ${rawPairs.length} raw  →  ${validPairs.length} valid`);

  // Step 5 — Detect frequency from the timestamp gaps in the incoming data
  // Uses detectFrequency() which looks at the median gap between dates.
  // We compare this against TrendRow.frequency if already set.
  const detectedFreq = detectFrequency(validPairs.map((p) => p.date));
  const freqToUse = trend.frequency ?? detectedFreq;

  // Step 6 — Apply denomination
  // If TrendRow.denomination is set, divide every value by it now.
  // This converts raw API units (e.g. "Thousands of Persons: 258000")
  // into display units (e.g. "people: 258000000") before writing.
  const divisor = trend.denomination && trend.denomination !== 1
    ? trend.denomination : 1;

  // Step 7 — Build StagedRows
  // Each RawPair becomes a StagedRow with:
  //   .id           → fresh UUID for the TrendData row
  //   .trendDataId  → the join key linking it back to this TrendRow
  //   .timestamp    → full ISO string (normalizeTimestamp handles partial dates)
  //   .value        → raw value divided by denomination
  const stagedRows: StagedRow[] = validPairs.map((p) => ({
    id: randomUUID(),
    trendDataId,
    timestamp: normalizeTimestamp(p.date, freqToUse),
    value: (p.value as number) / divisor,
  }));

  // Step 8 — Print preview in terminal
  printFetchPreview({
    trend,
    stagedRows,
    isInitialLoad,
    detectedFreq,
    divisor,
  });

  // Step 9 — Confirm metadata interactively
  console.log(`\n${SEP}`);
  console.log(`CONFIRM TREND METADATA`);
  console.log(`Press enter to keep the current value, or type a new one.`);
  console.log(SEP);

  const confirmedFreq = await promptWithDefault(
    `  frequency    [${trend.frequency ?? detectedFreq}]: `,
    trend.frequency ?? detectedFreq
  );
  const confirmedUnit = await promptWithDefault(
    `  unit         [${trend.unit ?? ""}]: `,
    trend.unit ?? ""
  );
  const confirmedDenomStr = await promptWithDefault(
    `  denomination [${trend.denomination ?? 1}]: `,
    String(trend.denomination ?? 1)
  );
  const confirmedDenomination = parseFloat(confirmedDenomStr) || 1;

  // Step 10 — Approve / reject
  console.log(`\n${SEP}`);
  const decision = await prompt("Approve and write to TrendData? (y / n / cancel): ");

  if (decision.toLowerCase() === "cancel" || decision.toLowerCase() === "c") {
    console.log("\nCancelled — nothing written.\n");
    process.exit(0);
  }

  if (decision.toLowerCase() !== "y") {
    console.log("\nRejected — nothing written.\n");
    process.exit(0);
  }

  // Step 11 — Write to TrendData
  // upsertBatch() writes in chunks of 500 to avoid overwhelming DataConnect
  console.log(`\nWriting ${stagedRows.length} rows to TrendData...`);
  await upsertBatch(stagedRows);

  // Step 12 — Update TrendRow with confirmed metadata
  // Stamps frequency, unit, denomination, and syncedAt onto the TrendRow
  // so future fetches and the app have accurate metadata.
  const now = new Date().toISOString();
  await updateTrend({
    trendDataId,
    frequency:    confirmedFreq,
    unit:         confirmedUnit || null,
    denomination: confirmedDenomination,
    syncedAt:     now,
    updatedAt:    now,
  });

  console.log(`\n${SEP}`);
  console.log(`✓  ${stagedRows.length} rows written to TrendData`);
  console.log(`✓  TrendRow updated`);
  console.log(`   frequency    : ${confirmedFreq}`);
  console.log(`   unit         : ${confirmedUnit || "(unchanged)"}`);
  console.log(`   denomination : ${confirmedDenomination}`);
  console.log(`   syncedAt     : ${now.slice(0, 10)}`);
  console.log(`\nTo undo: see PITR rollback instructions in promote.ts`);
  console.log(`${SEP}\n`);
}

// ══════════════════════════════════════════════════════════════════════════
// runScout(source, apiDataId)
//
// Routes to the correct per-source scout function.
// Each source has its own scout function below because the metadata
// endpoint, response shape, and unit/frequency conventions differ per API.
// Returns a ScoutResult — a normalized summary regardless of source.
// ══════════════════════════════════════════════════════════════════════════

async function runScout(source: string, apiDataId: string): Promise<ScoutResult> {
  switch (source) {
    case "FRED":        return scoutFRED(apiDataId);
    case "BLS":         return scoutBLS(apiDataId);
    case "BEA":         return scoutBEA(apiDataId);
    case "EIA":         return scoutEIA(apiDataId);
    case "Census":      return scoutCensus(apiDataId);
    case "World Bank":  return scoutWorldBank(apiDataId);
    case "IMF":         return scoutIMF(apiDataId);
    case "OECD":        return scoutOECD(apiDataId);
    case "WHO":         return scoutWHO(apiDataId);
    case "OpenAlex":    return scoutOpenAlex(apiDataId);
    default:
      throw new Error(
        `Unknown source "${source}".\n` +
        `Valid: FRED, BLS, BEA, EIA, Census, "World Bank", IMF, OECD, WHO, OpenAlex`
      );
  }
}

// ══════════════════════════════════════════════════════════════════════════
// printScoutResult(source, apiDataId, result)
//
// Formats and prints the ScoutResult to the terminal.
// Shows metadata, sample values, and a suggested TrendRow configuration.
// Called only by commandScout — fetch has its own preview printer.
// ══════════════════════════════════════════════════════════════════════════

function printScoutResult(source: string, apiDataId: string, r: ScoutResult) {
  const SEP = "─".repeat(58);
  console.log(SEP);
  console.log(`Source      : ${source}`);
  console.log(`API ID      : ${apiDataId}`);
  console.log(`Title       : ${r.title}`);
  console.log(`Raw units   : ${r.rawUnits}`);
  console.log(`Frequency   : ${r.frequency}`);
  if (r.lastUpdated) console.log(`Updated     : ${r.lastUpdated}`);
  if (r.description) {
    const d = r.description.length > 120 ? r.description.slice(0, 120) + "..." : r.description;
    console.log(`Notes       : ${d}`);
  }
  console.log(`\nSample values (recent):`);
  if (r.samples.length === 0) {
    console.log(`  (none returned)`);
  } else {
    r.samples.forEach((s) => console.log(`  ${String(s.date).padEnd(14)} ${s.value}`));
  }
  console.log(`\nSuggested TrendRow:`);
  console.log(`  name         : "${r.title}"`);
  console.log(`  unit         : "${r.suggestedUnit}"`);
  console.log(`  denomination : ${r.suggestedDenomination}`);
  console.log(`  frequency    : "${r.frequency}"`);
  console.log(`  source       : "${source}"`);
  console.log(`  apiDataId    : "${apiDataId}"`);
  console.log(`\nWhen ready to fetch, create the TrendRow in your DB then run:`);
  console.log(`  npx ts-node scripts/fetchAndStage.ts fetch <trendDataId>`);
  console.log(SEP + "\n");
}

// ══════════════════════════════════════════════════════════════════════════
// printFetchPreview({ trend, stagedRows, isInitialLoad, detectedFreq, divisor })
//
// Prints the terminal review screen shown before approve/reject.
// Shows: row count, date range, frequency comparison, stats, and
// a sample of the first and last 5 rows so you can spot obvious issues.
// ══════════════════════════════════════════════════════════════════════════

function printFetchPreview({
  trend, stagedRows, isInitialLoad, detectedFreq, divisor,
}: {
  trend: TrendRow;
  stagedRows: StagedRow[];
  isInitialLoad: boolean;
  detectedFreq: string;
  divisor: number;
}) {
  const SEP = "─".repeat(58);
  const values = stagedRows.map((r) => r.value);
  const stats = computeStats(values);
  const timestamps = stagedRows.map((r) => r.timestamp).sort();
  const freqMatch = trend.frequency
    ? trend.frequency === detectedFreq ? "✓ match" : "⚠  MISMATCH — review before approving"
    : "(not set on TrendRow yet)";

  console.log(`\n${SEP}`);
  console.log(`PREVIEW — ${trend.name}`);
  console.log(SEP);
  console.log(`Rows         : ${stagedRows.length}`);
  console.log(`Type         : ${isInitialLoad ? "Initial load" : "Incremental update"}`);
  console.log(`Date range   : ${timestamps[0]?.slice(0, 10)} → ${timestamps[timestamps.length - 1]?.slice(0, 10)}`);
  console.log(`\nFrequency`);
  console.log(`  Detected   : ${detectedFreq}`);
  console.log(`  TrendRow   : ${trend.frequency ?? "(not set)"}  ${freqMatch}`);
  console.log(`\nValues`);
  console.log(`  Min        : ${stats.min}`);
  console.log(`  Max        : ${stats.max}`);
  console.log(`  Mean       : ${stats.mean}`);
  if (divisor !== 1) console.log(`  Denom ÷${divisor} : applied to all values`);
  console.log(`\nFirst 5 rows:`);
  stagedRows.slice(0, 5).forEach((r) =>
    console.log(`  ${r.timestamp.slice(0, 10).padEnd(14)} ${r.value}`)
  );
  console.log(`\nLast 5 rows:`);
  stagedRows.slice(-5).forEach((r) =>
    console.log(`  ${r.timestamp.slice(0, 10).padEnd(14)} ${r.value}`)
  );
}

// ══════════════════════════════════════════════════════════════════════════
// detectFrequency(rawDates)
//
// Infers the frequency of a series by looking at the median gap between
// consecutive timestamps. Uses median (not mean) so that a few missing
// periods in an otherwise monthly series don't skew the result.
// Returns: "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "unknown"
// ══════════════════════════════════════════════════════════════════════════

function detectFrequency(rawDates: string[]): string {
  if (rawDates.length < 2) return "unknown";

  const ms = rawDates
    .map((d) => {
      let s = d.trim();
      if (s.match(/^\d{4}$/))      s = `${s}-01-01`;
      if (s.match(/^\d{4}-\d{2}$/)) s = `${s}-01`;
      if (s.match(/^\d{4}Q\d$/)) {
        const [y, q] = s.split("Q");
        s = `${y}-${String((parseInt(q) - 1) * 3 + 1).padStart(2, "0")}-01`;
      }
      return new Date(s).getTime();
    })
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  if (ms.length < 2) return "unknown";

  const gaps = ms.slice(1).map((t, i) => t - ms[i]);
  const median = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
  const days = median / 86_400_000;

  if (days <= 2)   return "daily";
  if (days <= 10)  return "weekly";
  if (days <= 35)  return "monthly";
  if (days <= 100) return "quarterly";
  return "annual";
}

// ══════════════════════════════════════════════════════════════════════════
// upsertBatch(rows)
//
// Writes StagedRows to TrendData in chunks of 500.
// Chunking avoids overwhelming DataConnect with a single massive request.
// Uses Promise.all within each chunk for parallel writes per chunk.
// ══════════════════════════════════════════════════════════════════════════

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 100;
 
async function upsertBatch(rows: StagedRow[]): Promise<void> {
  const total = rows.length;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
 
    // Sequential within each chunk — one at a time, no parallel pressure
    for (const row of chunk) {
      await upsertTrendData({
        trendDataId: row.trendDataId,
        timestamp:   row.timestamp,
        value:       row.value,
      });
    }
 
    // Progress indicator so you can see it working
    const done = Math.min(i + BATCH_SIZE, total);
    process.stdout.write(`\r  ${done}/${total} rows written...`);
 
    // Small delay between chunks to avoid overwhelming DataConnect
    if (i + BATCH_SIZE < total) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
  process.stdout.write(`\r  ${total}/${total} rows written.   \n`);
}

// ══════════════════════════════════════════════════════════════════════════
// computeStats(values)
//
// Returns min, max, and mean for the preview screen.
// Quick sanity check — if min/max look wildly wrong you know to reject.
// ══════════════════════════════════════════════════════════════════════════

function computeStats(values: number[]) {
  return {
    min:  Math.min(...values),
    max:  Math.max(...values),
    mean: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(4)),
  };
}

// ══════════════════════════════════════════════════════════════════════════
// parseUnits(rawUnits)
//
// Attempts to extract a clean unit string and denomination from the raw
// units string returned by the API (e.g. "Thousands of Persons").
// Used by scout functions to generate suggested TrendRow values.
// Not perfect — it's a starting point for manual review.
// ══════════════════════════════════════════════════════════════════════════

function parseUnits(raw: string): { unit: string; denomination: number } {
  const lower = raw.toLowerCase();
  const denomination =
    lower.includes("billion")  ? 1_000_000_000 :
    lower.includes("million")  ? 1_000_000 :
    lower.includes("thousand") ? 1_000 : 1;
  const unit =
    lower.includes("percent") || lower.includes("%")      ? "%" :
    lower.includes("dollar")  || lower.includes("usd")    ? "USD" :
    lower.includes("person")  || lower.includes("worker") ||
    lower.includes("people")  || lower.includes("employ") ? "people" :
    lower.includes("barrel")                              ? "barrels" :
    lower.includes("index")                               ? "index" :
    lower.includes("rate")                                ? "rate" :
    raw;
  return { unit, denomination };
}

// ══════════════════════════════════════════════════════════════════════════
// normalizeFreq(raw)
//
// Converts API-specific frequency strings ("M", "Monthly", "monthly")
// to the standard strings your TrendRow.frequency field expects.
// ══════════════════════════════════════════════════════════════════════════

function normalizeFreq(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.startsWith("m")) return "monthly";
  if (lower.startsWith("q")) return "quarterly";
  if (lower.startsWith("a")) return "annual";
  if (lower.startsWith("w")) return "weekly";
  if (lower.startsWith("d")) return "daily";
  return lower;
}

// ══════════════════════════════════════════════════════════════════════════
// Per-source scout functions
// scoutFRED / scoutBLS / scoutBEA / scoutEIA / scoutCensus /
// scoutWorldBank / scoutIMF / scoutOECD / scoutWHO / scoutOpenAlex
//
// Each one:
//   1. Calls the source's metadata endpoint (where available)
//   2. Fetches a small sample of recent data points
//   3. Returns a ScoutResult with normalized fields
//
// They all return the same ScoutResult shape so printScoutResult()
// can display them identically regardless of source.
// ══════════════════════════════════════════════════════════════════════════

async function scoutFRED(seriesId: string): Promise<ScoutResult> {
  const metaRes = await fetchWithRetry(
    `https://api.stlouisfed.org/fred/series?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json`
  );
  const meta = (await metaRes.json())?.seriess?.[0];
  if (!meta) throw new Error(`FRED: series "${seriesId}" not found`);
  const obsRes = await fetchWithRetry(
    `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=5`
  );
  const samples = ((await obsRes.json())?.observations ?? [])
    .filter((o: { value: string }) => o.value !== ".")
    .map((o: { date: string; value: string }) => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
  const { unit, denomination } = parseUnits(meta.units ?? "");
  return {
    title: meta.title, rawUnits: meta.units ?? "",
    frequency: normalizeFreq(meta.frequency_short ?? "M"),
    lastUpdated: meta.last_updated ?? null, description: meta.notes ?? null,
    samples, suggestedUnit: unit, suggestedDenomination: denomination,
  };
}

async function scoutBLS(seriesId: string): Promise<ScoutResult> {
  const body = JSON.stringify({
    seriesid: [seriesId], catalog: true, registrationkey: BLS_KEY,
    startyear: String(new Date().getFullYear() - 1),
    endyear: String(new Date().getFullYear()),
  });
  const res = await fetchWithRetry("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST", headers: { "Content-Type": "application/json" }, body,
  });
  const data = await res.json();
  const series = data?.Results?.series?.[0];
  const catalog = series?.catalog ?? {};
  const samples = (series?.data ?? []).slice(0, 5)
    .map((p: { year: string; period: string; value: string }) => ({
      date: `${p.year}-${p.period.slice(1).padStart(2, "0")}`,
      value: parseFloat(p.value),
    })).reverse();
  const { unit, denomination } = parseUnits(catalog.measure_data_type ?? "");
  return {
    title: catalog.series_title ?? seriesId, rawUnits: catalog.measure_data_type ?? "See BLS docs",
    frequency: "monthly", lastUpdated: null, description: catalog.survey_name ?? null,
    samples, suggestedUnit: unit, suggestedDenomination: denomination,
  };
}

async function scoutBEA(apiDataId: string): Promise<ScoutResult> {
  const [datasetName, tableName, frequency, lineNumber] = apiDataId.split(":");
  const year = new Date().getFullYear();
  const params = new URLSearchParams({
    UserID: BEA_KEY, method: "GetData", DataSetName: datasetName,
    TableName: tableName, Frequency: frequency ?? "A",
    Year: `${year - 2},${year - 1},${year}`, ResultFormat: "JSON",
  });
  const res = await fetchWithRetry(`https://apps.bea.gov/api/data/?${params}`);
  const rows = (await res.json())?.BEAAPI?.Results?.Data ?? [];
  const filtered = lineNumber
    ? rows.filter((r: { LineNumber: string }) => r.LineNumber === lineNumber)
    : rows;
  const samples = filtered.slice(0, 5).map((r: { TimePeriod: string; DataValue: string }) => ({
    date: r.TimePeriod, value: parseFloat(r.DataValue.replace(/,/g, "")),
  }));
  return {
    title: `${datasetName} ${tableName}${lineNumber ? ` Line ${lineNumber}` : ""}`,
    rawUnits: "See BEA table documentation",
    frequency: normalizeFreq(frequency ?? "A"),
    lastUpdated: null, description: null, samples,
    suggestedUnit: "USD", suggestedDenomination: 1_000_000,
  };
}

async function scoutEIA(apiDataId: string): Promise<ScoutResult> {
  const [route, seriesId, freqCode] = apiDataId.split(":");
  const freqMap: Record<string, string> = {
    M: "monthly", Q: "quarterly", A: "annual", W: "weekly", D: "daily",
  };
  const params = new URLSearchParams({
    api_key: EIA_KEY, frequency: freqMap[freqCode?.toUpperCase()] ?? "monthly",
    "data[]": "value", [`facets[series][]`]: seriesId,
    "sort[0][column]": "period", "sort[0][direction]": "desc", length: "5",
  });
  const res = await fetchWithRetry(`https://api.eia.gov/v2/${route}/data/?${params}`);
  const rows = (await res.json())?.response?.data ?? [];
  const samples = rows.map((r: { period: string; value: number }) => ({
    date: String(r.period), value: Number(r.value),
  })).reverse();
  const { unit, denomination } = parseUnits(rows[0]?.units ?? "");
  return {
    title: rows[0]?.["series-description"] ?? seriesId,
    rawUnits: rows[0]?.units ?? "See EIA docs",
    frequency: normalizeFreq(freqCode ?? "M"),
    lastUpdated: null, description: null, samples,
    suggestedUnit: unit, suggestedDenomination: denomination,
  };
}

async function scoutCensus(apiDataId: string): Promise<ScoutResult> {
  const [dataset, variable] = apiDataId.split(":");
  const year = new Date().getFullYear() - 1;
  const params = new URLSearchParams({ get: `${variable},NAME`, for: "us:1", key: CENSUS_KEY });
  const res = await fetchWithRetry(`https://api.census.gov/data/${year}/${dataset}?${params}`);
  const data = await res.json();
  const headers: string[] = data[0];
  const varIdx = headers.indexOf(variable);
  const samples = data.slice(1, 6).map((row: string[]) => ({
    date: String(year), value: parseFloat(row[varIdx]),
  }));
  return {
    title: variable, rawUnits: "See Census docs",
    frequency: "annual", lastUpdated: null,
    description: `Census variable ${variable} from ${dataset}`,
    samples, suggestedUnit: "people", suggestedDenomination: 1,
  };
}

async function scoutWorldBank(apiDataId: string): Promise<ScoutResult> {
  const [indicator, countryCode] = apiDataId.split(":");
  const country = countryCode ?? "WLD";
  const metaRes = await fetchWithRetry(
    `https://api.worldbank.org/v2/indicator/${indicator}?format=json`
  );
  const meta = (await metaRes.json())?.[1]?.[0];
  const dataRes = await fetchWithRetry(
    `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=5&mrv=5`
  );
  const rows = (await dataRes.json())?.[1] ?? [];
  const samples = rows
    .filter((r: { value: number | null }) => r.value !== null)
    .map((r: { date: string; value: number }) => ({ date: r.date, value: r.value }))
    .reverse();
  const { unit, denomination } = parseUnits(meta?.unit ?? "");
  return {
    title: meta?.name ?? indicator, rawUnits: meta?.unit ?? "See World Bank docs",
    frequency: "annual", lastUpdated: null, description: meta?.sourceNote ?? null,
    samples, suggestedUnit: unit, suggestedDenomination: denomination,
  };
}

async function scoutIMF(apiDataId: string): Promise<ScoutResult> {
  const [indicator, countryCode] = apiDataId.split(":");
  const country = countryCode ?? "USA";
  const metaRes = await fetchWithRetry(
    `https://www.imf.org/external/datamapper/api/v1/indicators/${indicator}`
  );
  const meta = (await metaRes.json())?.indicators?.[indicator];
  const dataRes = await fetchWithRetry(
    `https://www.imf.org/external/datamapper/api/v1/${indicator}/${country}`
  );
  const values: Record<string, number> =
    (await dataRes.json())?.values?.[indicator]?.[country] ?? {};
  const samples = Object.entries(values)
    .sort(([a], [b]) => b.localeCompare(a)).slice(0, 5)
    .map(([date, value]) => ({ date, value: value as number })).reverse();
  const { unit, denomination } = parseUnits(meta?.unit ?? "");
  return {
    title: meta?.label ?? indicator, rawUnits: meta?.unit ?? "See IMF docs",
    frequency: "annual", lastUpdated: null, description: meta?.description ?? null,
    samples, suggestedUnit: unit, suggestedDenomination: denomination,
  };
}

async function scoutOECD(apiDataId: string): Promise<ScoutResult> {
  const [dataset, filter] = apiDataId.split(":");
  const params = new URLSearchParams({
    contentType: "csv", startTime: String(new Date().getFullYear() - 4),
  });
  const res = await fetchWithRetry(
    `https://stats.oecd.org/SDMX-JSON/data/${dataset}/${filter}/all?${params}`
  );
  const text = await res.text();
  const lines = text.trim().split("\n").filter(Boolean);
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const timeIdx = headers.findIndex((h) => h === "TIME_PERIOD");
  const valIdx  = headers.findIndex((h) => h === "Value" || h === "OBS_VALUE");
  const samples = lines.slice(1, 6).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
    return { date: cols[timeIdx], value: parseFloat(cols[valIdx]) };
  });
  const { unit, denomination } = parseUnits(
    lines[1]?.split(",")?.[headers.findIndex((h) => h.includes("Unit"))] ?? ""
  );
  return {
    title: `${dataset} — ${filter}`, rawUnits: "See OECD docs",
    frequency: "annual", lastUpdated: null, description: null,
    samples, suggestedUnit: unit, suggestedDenomination: denomination,
  };
}

async function scoutWHO(apiDataId: string): Promise<ScoutResult> {
  const [indicatorCode, spatialDim] = apiDataId.split(":");
  const metaRes = await fetchWithRetry(
    `https://ghoapi.azureedge.net/api/Indicator?$filter=IndicatorCode eq '${indicatorCode}'`
  );
  const meta = (await metaRes.json())?.value?.[0];
  const year = new Date().getFullYear();
  const filters = [
    `TimeDim ge ${year - 5}`,
    ...(spatialDim ? [`SpatialDim eq '${spatialDim}'`] : []),
  ];
  const params = new URLSearchParams({
    "$filter": filters.join(" and "), "$select": "TimeDim,NumericValue",
    "$orderby": "TimeDim desc", "$top": "5",
  });
  const dataRes = await fetchWithRetry(
    `https://ghoapi.azureedge.net/api/${indicatorCode}?${params}`
  );
  const samples = ((await dataRes.json())?.value ?? [])
    .map((r: { TimeDim: number; NumericValue: number }) => ({
      date: String(r.TimeDim), value: r.NumericValue,
    })).reverse();
  return {
    title: meta?.IndicatorName ?? indicatorCode, rawUnits: "See WHO GHO docs",
    frequency: "annual", lastUpdated: null, description: null,
    samples, suggestedUnit: "rate", suggestedDenomination: 1,
  };
}

async function scoutOpenAlex(apiDataId: string): Promise<ScoutResult> {
  const [entity, filterField, filterId] = apiDataId.split(":");
  const email = process.env.OPENALEX_EMAIL ?? "";
  const year = new Date().getFullYear();
  const params = new URLSearchParams({
    filter: `${filterField}:${filterId},publication_year:${year - 5}-${year}`,
    group_by: "publication_year", mailto: email,
  });
  const res = await fetchWithRetry(`https://api.openalex.org/${entity}?${params}`);
  const groups = (await res.json())?.group_by ?? [];
  const samples = groups.slice(-5).map((g: { key: string; count: number }) => ({
    date: g.key, value: g.count,
  }));
  return {
    title: `${entity} count — ${filterId}`, rawUnits: "count",
    frequency: "annual", lastUpdated: null, description: null,
    samples, suggestedUnit: "publications", suggestedDenomination: 1,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// Terminal input helpers
//
// prompt(question)            — asks a question, returns the typed answer
// promptWithDefault(q, def)   — same but returns def if the user hits enter
// ══════════════════════════════════════════════════════════════════════════

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin, output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptWithDefault(question: string, defaultVal: string): Promise<string> {
  const answer = await prompt(question);
  return answer.trim() || defaultVal;
}

function printUsage() {
  console.log(`
Usage:
  npx ts-node scripts/fetchAndStage.ts scout <source> <apiDataId>
  npx ts-node scripts/fetchAndStage.ts fetch <trendDataId> [--force]

Scout (explore a series, nothing written):
  npx ts-node scripts/fetchAndStage.ts scout FRED UNRATE
  npx ts-node scripts/fetchAndStage.ts scout BLS LNS14000000
  npx ts-node scripts/fetchAndStage.ts scout "World Bank" NY.GDP.MKTP.CD:US

Fetch (load data for an existing TrendRow):
  npx ts-node scripts/fetchAndStage.ts fetch trenddata-abc123
  npx ts-node scripts/fetchAndStage.ts fetch trenddata-abc123 --force
  `);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});