import type { WeatherHistoryRow } from "@/lib/types";

/** Parse ISO, Google Sheets serial numbers, and common date strings to epoch ms. */
export function parseObservationTimeMs(raw: string): number {
  const s = raw.trim();
  if (!s) return NaN;

  if (/^\d+(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial > 20_000 && serial < 200_000) {
      const utcMs = (serial - 25_569) * 86_400_000;
      if (!Number.isNaN(utcMs)) return utcMs;
    }
  }

  const t = new Date(s).getTime();
  return Number.isNaN(t) ? NaN : t;
}

/** Exact observation instant — used for sheet dedup. */
export function observationTimeKey(iso: string): string | null {
  const t = parseObservationTimeMs(iso);
  if (Number.isNaN(t)) return null;
  return String(t);
}

function dedupeByExactKey(rows: WeatherHistoryRow[]): WeatherHistoryRow[] {
  const map = new Map<string, WeatherHistoryRow>();
  for (const row of rows) {
    const key = observationTimeKey(row.timestampIso);
    if (!key) continue;
    map.set(key, row);
  }
  return Array.from(map.values());
}

/**
 * Append every API row whose exact timestamp is not already in the sheet.
 */
export function selectRowsToAppend(
  candidates: WeatherHistoryRow[],
  existingIsoStrings: string[]
): WeatherHistoryRow[] {
  const existingExact = new Set(
    existingIsoStrings
      .map(observationTimeKey)
      .filter((k): k is string => Boolean(k))
  );

  const sorted = dedupeByExactKey(candidates).sort(
    (a, b) =>
      parseObservationTimeMs(a.timestampIso) -
      parseObservationTimeMs(b.timestampIso)
  );

  const seen = new Set(existingExact);
  const result: WeatherHistoryRow[] = [];

  for (const row of sorted) {
    const iso = row.timestampIso?.trim();
    if (!iso) continue;
    const key = observationTimeKey(iso);
    if (!key || seen.has(key)) continue;
    result.push(row);
    seen.add(key);
  }

  return result;
}

/** True when this exact timestamp is not already stored. */
export function canAppendObservation(
  iso: string,
  existingIsoStrings: string[]
): boolean {
  const key = observationTimeKey(iso);
  if (!key) return false;
  return !existingIsoStrings.some(
    (existing) => observationTimeKey(existing) === key
  );
}

/** Collapse duplicate sheet rows for display (same instant → keep newest). */
export function dedupeHistoryForDisplay(
  rows: WeatherHistoryRow[]
): WeatherHistoryRow[] {
  const byKey = new Map<string, WeatherHistoryRow>();

  for (const row of rows) {
    const key = observationTimeKey(row.timestampIso);
    if (!key) continue;

    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }

    const t = parseObservationTimeMs(row.timestampIso);
    const prevT = parseObservationTimeMs(prev.timestampIso);
    if (!Number.isNaN(t) && (Number.isNaN(prevT) || t >= prevT)) {
      byKey.set(key, row);
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) =>
      parseObservationTimeMs(a.timestampIso) -
      parseObservationTimeMs(b.timestampIso)
  );
}
