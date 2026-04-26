// ─────────────────────────────────────────────────────────────────────────────
// storyCalculation.ts
//
// Pure calculation layer — no React, no imports from the app.
// Takes assembled contributor data and story baseline, returns calculated
// story values. Called inside DataState's assembledStory useMemo.
//
// Formula per timestamp t:
//   storyValue(t) = baseline(t)                  ← step-forward from last trend value if future
//     + Σ contributors:
//         contributorMergedValue(t - lagDays)     ← snapped to nearest point
//         × (weight / 100)                        ← weight is stored as 0–100
//         × correlation                           ← signed -1.0 to 1.0
//
// The timeline is the union of storyTrendValues timestamps + all contributor
// mergedDataValues timestamps, so future points automatically extend the calc.
// ─────────────────────────────────────────────────────────────────────────────

type TimeSeriesPoint = { timestamp: string; value: number };
type AnyValuePoint   = { timestamp: string; value: any };

function subtractDays(timestamp: string, days: number): string {
  const d = new Date(timestamp.slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - Math.round(days));
  return d.toISOString().slice(0, 10);
}

// ── Get the most recent value at or before a timestamp (step function) ────────
// Used for the story trend baseline only — trend data is dense (a value at
// every increment), so step semantics work and we don't pay the linear-search
// cost of finding the surrounding pair for interpolation.
function getLatestAtOrBefore(values: AnyValuePoint[], timestamp: string, defaultValue: any): any {
  let best: AnyValuePoint | null = null;
  for (const v of values) {
    if (v.timestamp <= timestamp) {
      if (!best || v.timestamp > best.timestamp) best = v;
    }
  }
  return best?.value ?? defaultValue;
}

// ── Get the linearly-interpolated value at a timestamp ───────────────────────
// Used for sparse series (weight, lag, correlation, contributor merged data
// when sparse). Algorithm:
//   • No points        → defaultValue
//   • Before first pt  → first point's value (hold backward — "this is the
//                        contributor's permanent value, applies before too")
//   • After last pt    → last point's value (hold forward — user's stated rule)
//   • Between pts      → linear blend by position-in-time
//
// Caller is responsible for sorting `values` chronologically. We sort
// defensively here too — cheap for the small arrays this gets called with.
function getInterpolatedAt(values: AnyValuePoint[], timestamp: string, defaultValue: any): any {
  if (values.length === 0) return defaultValue;

  const sorted = [...values].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Boundary cases — hold first/last values out past the data.
  if (timestamp <= sorted[0].timestamp)                 return sorted[0].value;
  if (timestamp >= sorted[sorted.length - 1].timestamp) return sorted[sorted.length - 1].value;

  // Find the surrounding pair.
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (timestamp >= a.timestamp && timestamp <= b.timestamp) {
      const aMs = new Date(a.timestamp).getTime();
      const bMs = new Date(b.timestamp).getTime();
      const tMs = new Date(timestamp).getTime();
      if (bMs === aMs) return a.value; // duplicate timestamps — defensive
      const ratio = (tMs - aMs) / (bMs - aMs);
      return a.value + ratio * (b.value - a.value);
    }
  }
  return defaultValue;
}

function snapToNearest(values: TimeSeriesPoint[], targetTs: string): TimeSeriesPoint | null {
  if (values.length === 0) return null;
  const targetMs = new Date(targetTs).getTime();
  return values.reduce((nearest, v) => {
    const vDiff = Math.abs(new Date(v.timestamp).getTime() - targetMs);
    const nDiff = Math.abs(new Date(nearest.timestamp).getTime() - targetMs);
    return vDiff < nDiff ? v : nearest;
  });
}

export type ContributorForCalc = {
  mergedDataValues:  TimeSeriesPoint[];
  weightValues:      AnyValuePoint[];
  lagValues:         AnyValuePoint[];
  correlationValues: AnyValuePoint[];
};

// ── calculateStoryValues ──────────────────────────────────────────────────────
// Iterates over the UNION of story trend timestamps and all contributor future
// timestamps so that newly created future points extend the calculation.
// For timestamps beyond the story trend, the last known trend value is held
// forward (step function).
export function calculateStoryValues(
  storyTrendValues: TimeSeriesPoint[],
  contributors:     ContributorForCalc[],
  frequency:        string = "monthly",
): TimeSeriesPoint[] {

  // Build merged timeline — story trend + any future contributor timestamps
  const allTs = new Set<string>(storyTrendValues.map(v => v.timestamp));
  for (const c of contributors) {
    for (const p of c.mergedDataValues) {
      allTs.add(p.timestamp.slice(0, 10));
    }
  }
  const sortedTs = Array.from(allTs).sort();

  // Pre-build story baseline map for O(1) lookup
  const storyValueMap = new Map<string, number>(
    storyTrendValues.map(v => [v.timestamp, v.value])
  );

  return sortedTs.map(timestamp => {
    // Step-forward baseline — trend data is dense, step semantics are correct
    // here. (We're not interpolating between trend points; we just need to
    // hold the last known trend value forward into the future buffer.)
    const baselineValue = storyValueMap.has(timestamp)
      ? storyValueMap.get(timestamp)!
      : getLatestAtOrBefore(storyTrendValues, timestamp, 0);

    let totalEffect = 0;

    for (const contributor of contributors) {
      // Modifier series are sparse — use linear interpolation so a contributor
      // with a few weight points produces smooth changes between them, not
      // sudden jumps. Default 0 = "no contribution before any weight set".
      const weight = getInterpolatedAt(contributor.weightValues, timestamp, 0) / 100;
      if (weight === 0) continue;

      const lagDays     = getInterpolatedAt(contributor.lagValues,         timestamp, 0);
      const correlation = getInterpolatedAt(contributor.correlationValues, timestamp, 0);

      const laggedTs = lagDays > 0 ? subtractDays(timestamp, lagDays) : timestamp;
      const nearest  = snapToNearest(contributor.mergedDataValues, laggedTs);
      if (!nearest) continue;

      totalEffect += nearest.value * weight * correlation;
    }

    return { timestamp, value: baselineValue + totalEffect };
  });
}