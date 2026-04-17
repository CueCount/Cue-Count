// ─────────────────────────────────────────────────────────────────────────────
// storyCalculation.ts
//
// Pure calculation layer — no React, no imports from the app.
// Takes assembled contributor data and story baseline, returns calculated
// story values. Called inside DataState's assembledStory useMemo.
//
// Formula per timestamp t:
//   storyValue(t) = trendValue(t)
//     + Σ contributors:
//         contributorMergedValue(t - lagDays)   ← snapped to nearest point
//         × (weight / 100)                       ← weight is stored as 0–100
//         × correlation                          ← signed -1.0 to 1.0; negative = inverse, positive = direct
// ─────────────────────────────────────────────────────────────────────────────

type TimeSeriesPoint = { timestamp: string; value: number };
type AnyValuePoint   = { timestamp: string; value: any };

// ── Subtract N days from a YYYY-MM-DD timestamp ───────────────────────────────
function subtractDays(timestamp: string, days: number): string {
  const d = new Date(timestamp);
  d.setDate(d.getDate() - Math.round(days));
  return d.toISOString().slice(0, 10);
}

// ── Get the most recent value at or before a timestamp (step function) ────────
// Used for weight, lag, relationship, relationshipType — these are sparse and
// we want the last known value to apply forward until the next edit.
function getLatestAtOrBefore(values: AnyValuePoint[], timestamp: string, defaultValue: any): any {
  let best: AnyValuePoint | null = null;
  for (const v of values) {
    if (v.timestamp <= timestamp) {
      if (!best || v.timestamp > best.timestamp) best = v;
    }
  }
  return best?.value ?? defaultValue;
}

// ── Snap to nearest timestamp in a list ──────────────────────────────────────
// Used for finding the contributor value at (t - lag) where an exact match
// may not exist.
function snapToNearest(values: TimeSeriesPoint[], targetTs: string): TimeSeriesPoint | null {
  if (values.length === 0) return null;
  const targetMs = new Date(targetTs).getTime();
  return values.reduce((nearest, v) => {
    const vDiff = Math.abs(new Date(v.timestamp).getTime() - targetMs);
    const nDiff = Math.abs(new Date(nearest.timestamp).getTime() - targetMs);
    return vDiff < nDiff ? v : nearest;
  });
}

// ── ContributorForCalc ────────────────────────────────────────────────────────
// Matches the shape of AssembledContributor — only the fields we need.
export type ContributorForCalc = {
  mergedDataValues: TimeSeriesPoint[];
  weightValues:     AnyValuePoint[];
  lagValues:        AnyValuePoint[];
  correlationValues: AnyValuePoint[];
};

// ── calculateStoryValues ──────────────────────────────────────────────────────
// Main export. Takes the story's baseline trend values and all assembled
// contributors. Returns a new time series representing the calculated story.
export function calculateStoryValues(
  storyTrendValues: TimeSeriesPoint[],
  contributors:     ContributorForCalc[],
): TimeSeriesPoint[] {
  return storyTrendValues.map(({ timestamp, value: baselineValue }) => {
    let totalEffect = 0;

    for (const contributor of contributors) {
      // Weight stored as 0–100, convert to 0–1 scalar
      const weight = getLatestAtOrBefore(contributor.weightValues, timestamp, 0) / 100;

      // Skip this contributor entirely if weight is 0 — default state
      if (weight === 0) continue;

      const lagDays    = getLatestAtOrBefore(contributor.lagValues,          timestamp, 0);
      const correlation = getLatestAtOrBefore(contributor.correlationValues, timestamp, 0);

      // Shift the lookup timestamp back by lag, snap to nearest contributor point
      const laggedTs  = lagDays > 0 ? subtractDays(timestamp, lagDays) : timestamp;
      const nearest   = snapToNearest(contributor.mergedDataValues, laggedTs);
      if (!nearest) continue;

      totalEffect += nearest.value * weight * correlation;
    }

    return { timestamp, value: baselineValue + totalEffect };
  });
}