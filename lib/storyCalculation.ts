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
function getLatestAtOrBefore(values: AnyValuePoint[], timestamp: string, defaultValue: any): any {
  let best: AnyValuePoint | null = null;
  for (const v of values) {
    if (v.timestamp <= timestamp) {
      if (!best || v.timestamp > best.timestamp) best = v;
    }
  }
  return best?.value ?? defaultValue;
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
    // Step-forward baseline: use exact value or last known story trend value
    const baselineValue = storyValueMap.has(timestamp)
      ? storyValueMap.get(timestamp)!
      : getLatestAtOrBefore(storyTrendValues, timestamp, 0);

    let totalEffect = 0;

    for (const contributor of contributors) {
      const weight = getLatestAtOrBefore(contributor.weightValues, timestamp, 0) / 100;
      if (weight === 0) continue;

      const lagDays     = getLatestAtOrBefore(contributor.lagValues,         timestamp, 0);
      const correlation = getLatestAtOrBefore(contributor.correlationValues, timestamp, 0);

      const laggedTs = lagDays > 0 ? subtractDays(timestamp, lagDays) : timestamp;
      const nearest  = snapToNearest(contributor.mergedDataValues, laggedTs);
      if (!nearest) continue;

      totalEffect += nearest.value * weight * correlation;
    }

    return { timestamp, value: baselineValue + totalEffect };
  });
}