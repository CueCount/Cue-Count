// scripts/utils/normalizeTimestamp.ts
// Converts partial date strings from various APIs into full ISO timestamps.
// Each API has its own date format — this handles all known variants.

export function normalizeTimestamp(raw: string, frequency: string): string {
  const trimmed = raw.trim();

  // Already a full ISO string — return as-is
  // e.g. "2024-01-15T00:00:00Z"
  if (trimmed.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return trimmed;
  }

  // Full date without time — e.g. "2024-01-15" (FRED, Census, most REST APIs)
  if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return `${trimmed}T00:00:00Z`;
  }

  // Year + month only — e.g. "2024-01" (BLS monthly, EIA monthly)
  if (trimmed.match(/^\d{4}-\d{2}$/)) {
    return `${trimmed}-01T00:00:00Z`;
  }

  // BLS period format — e.g. year="2024" period="M01" → monthly
  // Handled by the BLS adapter before reaching here, but as a fallback:
  if (trimmed.match(/^\d{4}M\d{2}$/)) {
    const year = trimmed.slice(0, 4);
    const month = trimmed.slice(5).padStart(2, "0");
    return `${year}-${month}-01T00:00:00Z`;
  }

  // Quarterly — e.g. "2024Q1" or "2024-Q1" (BEA, OECD, World Bank)
  const quarterMatch = trimmed.match(/^(\d{4})-?Q(\d)$/);
  if (quarterMatch) {
    const year = quarterMatch[1];
    const quarter = parseInt(quarterMatch[2], 10);
    const month = String((quarter - 1) * 3 + 1).padStart(2, "0");
    return `${year}-${month}-01T00:00:00Z`;
  }

  // Annual — e.g. "2024" (World Bank annual, UN Data)
  if (trimmed.match(/^\d{4}$/)) {
    return `${trimmed}-01-01T00:00:00Z`;
  }

  // IMF format — e.g. "2024" for annual, already handled above
  // WHO format — e.g. "2024" for annual, already handled above

  // Fallback — log and return a best-effort parse
  console.warn(`[normalizeTimestamp] Unrecognized date format: "${raw}" (frequency: ${frequency})`);
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  throw new Error(`Cannot parse date string: "${raw}"`);
}
