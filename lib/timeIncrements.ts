// ─────────────────────────────────────────────────────────────────────────────
// lib/timeIncrements.ts
//
// Pure utility module — no React, no app imports. Frequency-aware timestamp
// arithmetic that's used in three places:
//   • DataState.initStory   — extending the view domain past the trend's last
//                             point by FUTURE_INCREMENTS_BY_FREQUENCY[freq].
//   • storyCalculation.ts   — interpolating modifier values at any timestamp.
//   • StoryGraph.tsx        — click-to-add snapping and ghost marker.
//
// All timestamps are normalized to ISO date strings (`YYYY-MM-DD`). Time
// information is stripped — these helpers operate at increment granularity,
// which is always whole-day or larger.
// ─────────────────────────────────────────────────────────────────────────────

export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "annual" | string;

// How many future increments past the trend's last point are reachable in the
// view domain. Stretches the chart and click-to-add target zone past the data
// without persisting any placeholder rows in Postgres.
//
// Tuned to roughly equivalent calendar windows across frequencies:
//   daily:    30 days   (~1 month ahead)
//   weekly:   12 weeks  (~3 months ahead)
//   monthly:  6 months
//   quarterly: 4 quarters (1 year)
//   yearly:   2 years
export const FUTURE_INCREMENTS_BY_FREQUENCY: Record<string, number> = {
  daily:     30,
  weekly:    12,
  monthly:   6,
  quarterly: 4,
  yearly:    2,
  annual:    2,
};

// ── nextTimestamp ─────────────────────────────────────────────────────────────
// Advance one frequency increment forward. Falls back to monthly for unknown
// frequency strings (defensive — Trend rows from older imports may have null).
export function nextTimestamp(ts: string, frequency: Frequency): string {
  const d = new Date(ts.slice(0, 10) + "T00:00:00Z");
  switch (frequency.toLowerCase()) {
    case "daily":     d.setUTCDate(d.getUTCDate() + 1);          break;
    case "weekly":    d.setUTCDate(d.getUTCDate() + 7);          break;
    case "monthly":   d.setUTCMonth(d.getUTCMonth() + 1);        break;
    case "quarterly": d.setUTCMonth(d.getUTCMonth() + 3);        break;
    case "annual":
    case "yearly":    d.setUTCFullYear(d.getUTCFullYear() + 1);  break;
    default:          d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

// ── previousTimestamp ─────────────────────────────────────────────────────────
// Mirror of nextTimestamp — useful for click-to-add when snapping a cursor to
// the nearest increment (need both the next and previous to find the closer).
export function previousTimestamp(ts: string, frequency: Frequency): string {
  const d = new Date(ts.slice(0, 10) + "T00:00:00Z");
  switch (frequency.toLowerCase()) {
    case "daily":     d.setUTCDate(d.getUTCDate() - 1);          break;
    case "weekly":    d.setUTCDate(d.getUTCDate() - 7);          break;
    case "monthly":   d.setUTCMonth(d.getUTCMonth() - 1);        break;
    case "quarterly": d.setUTCMonth(d.getUTCMonth() - 3);        break;
    case "annual":
    case "yearly":    d.setUTCFullYear(d.getUTCFullYear() - 1);  break;
    default:          d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return d.toISOString().slice(0, 10);
}

// ── addIncrements ─────────────────────────────────────────────────────────────
// Advance N frequency increments. Negative count walks backward.
export function addIncrements(ts: string, frequency: Frequency, count: number): string {
  if (count === 0) return ts.slice(0, 10);
  const step = count > 0 ? nextTimestamp : previousTimestamp;
  const n    = Math.abs(count);
  let current = ts;
  for (let i = 0; i < n; i++) current = step(current, frequency);
  return current;
}

// ── futureIncrements ──────────────────────────────────────────────────────────
// Generate the N timestamps following lastTs, exclusive of lastTs itself.
// Useful for building synthetic display points or future-target lists.
export function futureIncrements(lastTs: string, count: number, frequency: Frequency): string[] {
  const result: string[] = [];
  let current = lastTs;
  for (let i = 0; i < count; i++) {
    current = nextTimestamp(current, frequency);
    result.push(current);
  }
  return result;
}

// ── snapToFrequency ───────────────────────────────────────────────────────────
// Given an arbitrary timestamp (e.g. from a mouse-position-to-time mapping),
// return the nearest valid increment ON the frequency grid. Used by the
// click-to-add ghost marker so the new point lands at a clean position rather
// than mid-month/mid-week.
//
// Algorithm: pick the nearest of (previousTimestamp, nextTimestamp) by
// absolute distance in milliseconds. Reference is the grid's start — we
// snap relative to the originStart anchor, which should be the trend data's
// first timestamp so all snapped points land on the same monthly/weekly grid.
export function snapToFrequency(
  ts: string,
  frequency: Frequency,
  originStart: string,
): string {
  const targetMs = new Date(ts.slice(0, 10) + "T00:00:00Z").getTime();
  const startMs  = new Date(originStart.slice(0, 10) + "T00:00:00Z").getTime();

  // Walk forward from origin in `frequency` steps, return the closest one.
  // For long ranges this is wasteful (could compute analytically per
  // frequency), but in practice the loop runs at most a few hundred times
  // for a human-scale chart and keeps the logic uniform across frequencies.
  let best   = originStart.slice(0, 10);
  let bestDt = Math.abs(startMs - targetMs);
  let cur    = originStart;
  let curMs  = startMs;
  // Cap iterations to prevent runaway in degenerate cases (e.g. wrong origin).
  for (let i = 0; i < 5000; i++) {
    if (curMs > targetMs) {
      // We've passed the target; check this candidate too then bail.
      const dt = Math.abs(curMs - targetMs);
      if (dt < bestDt) { best = cur.slice(0, 10); bestDt = dt; }
      break;
    }
    const dt = Math.abs(curMs - targetMs);
    if (dt < bestDt) { best = cur.slice(0, 10); bestDt = dt; }
    cur   = nextTimestamp(cur, frequency);
    curMs = new Date(cur + "T00:00:00Z").getTime();
  }
  return best;
}