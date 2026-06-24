/**
 * Storage fill, spill alerts, and 7-day trend — aligned with Streamlit dashboard logic.
 */

import type {
  DamMetadata,
  DamReading,
  DamSnapshot,
  SpillStatus,
  StorageStatus,
  TrendDirection,
} from "@/lib/dams-types";

const SPILL_WATCH_FT = 2;
const TREND_THRESHOLD_FT = 0.25;

export function fillPct(
  level: number,
  dsl?: number,
  npl?: number
): number | null {
  if (dsl == null || npl == null || npl <= dsl) return null;
  const pct = ((level - dsl) / (npl - dsl)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function storageStatus(
  level: number,
  dsl?: number,
  npl?: number
): StorageStatus {
  if (dsl != null && level < dsl) return "below_dead";
  const pct = fillPct(level, dsl, npl);
  if (pct == null) return "low";
  if (pct < 30) return "low";
  if (pct < 70) return "medium";
  return "high";
}

export function spillStatus(level: number, npl?: number): SpillStatus {
  if (npl == null) return "none";
  if (level > npl) return "spilling";
  if (level >= npl) return "anytime";
  if (npl - level <= SPILL_WATCH_FT) return "watch";
  return "none";
}

export function trendDirection(
  current: number,
  prior: number | undefined
): TrendDirection {
  if (prior == null) return "stable";
  const d = current - prior;
  if (Math.abs(d) < TREND_THRESHOLD_FT) return "stable";
  return d > 0 ? "rising" : "falling";
}

export function storageStatusLabel(s: StorageStatus): string {
  switch (s) {
    case "below_dead":
      return "Below Dead Level";
    case "low":
      return "Low Storage";
    case "medium":
      return "Medium Storage";
    case "high":
      return "High Storage";
  }
}

export function spillStatusLabel(s: SpillStatus): string {
  switch (s) {
    case "watch":
      return "Spill Watch";
    case "anytime":
      return "Spill Anytime";
    case "spilling":
      return "Spilling";
    default:
      return "";
  }
}

export function trendLabel(t: TrendDirection): string {
  switch (t) {
    case "rising":
      return "▲ Rising";
    case "falling":
      return "▼ Falling";
    default:
      return "▬ Stable";
  }
}

export function storageStatusColor(s: StorageStatus): string {
  switch (s) {
    case "below_dead":
      return "#eab308";
    case "low":
      return "#ef4444";
    case "medium":
      return "#f97316";
    case "high":
      return "#22c55e";
  }
}

export function spillStatusColor(s: SpillStatus): string {
  if (s === "none") return "";
  return "#3b82f6";
}

function readingOnOrBefore(
  byLoc: Map<string, DamReading[]>,
  location: string,
  date: string
): DamReading | undefined {
  const rows = byLoc.get(location);
  if (!rows?.length) return undefined;
  let best: DamReading | undefined;
  for (const r of rows) {
    if (r.date <= date && (!best || r.date > best.date)) {
      best = r;
    }
  }
  return best;
}

function readingDaysAgo(
  byLoc: Map<string, DamReading[]>,
  location: string,
  date: string,
  days: number
): DamReading | undefined {
  const rows = byLoc.get(location);
  if (!rows?.length) return undefined;
  const target = new Date(`${date}T12:00:00Z`);
  target.setUTCDate(target.getUTCDate() - days);
  const targetYmd = target.toISOString().slice(0, 10);
  return readingOnOrBefore(byLoc, location, targetYmd);
}

export function buildSnapshots(
  dams: DamMetadata[],
  readings: DamReading[],
  date: string
): DamSnapshot[] {
  const byLoc = indexReadingsByLocation(readings);
  const metaByLoc = new Map(dams.map((d) => [d.location, d]));
  const snaps: DamSnapshot[] = [];

  for (const [location, rows] of byLoc) {
    const onDate = rows.find((r) => r.date === date);
    const reading = onDate ?? readingOnOrBefore(byLoc, location, date);
    if (!reading) continue;
    snaps.push(snapshotFromReading(location, reading, metaByLoc, byLoc));
  }

  return snaps.sort((a, b) => a.location.localeCompare(b.location));
}

/** Each dam uses its own most recent reading (Streamlit “latest per dam” mode). */
export function buildSnapshotsLatestPerDam(
  dams: DamMetadata[],
  readings: DamReading[]
): DamSnapshot[] {
  const byLoc = indexReadingsByLocation(readings);
  const metaByLoc = new Map(dams.map((d) => [d.location, d]));
  const snaps: DamSnapshot[] = [];

  for (const [location, rows] of byLoc) {
    const reading = rows[rows.length - 1];
    if (!reading) continue;
    snaps.push(snapshotFromReading(location, reading, metaByLoc, byLoc));
  }

  return snaps.sort((a, b) => a.location.localeCompare(b.location));
}

function indexReadingsByLocation(
  readings: DamReading[]
): Map<string, DamReading[]> {
  const byLoc = new Map<string, DamReading[]>();
  for (const r of readings) {
    if (!byLoc.has(r.location)) byLoc.set(r.location, []);
    byLoc.get(r.location)!.push(r);
  }
  for (const rows of byLoc.values()) {
    rows.sort((a, b) => a.date.localeCompare(b.date));
  }
  return byLoc;
}

function snapshotFromReading(
  location: string,
  reading: DamReading,
  metaByLoc: Map<string, DamMetadata>,
  byLoc: Map<string, DamReading[]>
): DamSnapshot {
  const meta = metaByLoc.get(location) ?? { location };
  const prior7 = readingDaysAgo(byLoc, location, reading.date, 7);
  return {
    ...meta,
    date: reading.date,
    waterLevelFt: reading.waterLevelFt,
    fillPct: fillPct(reading.waterLevelFt, meta.dslFt, meta.nplFt),
    storageStatus: storageStatus(
      reading.waterLevelFt,
      meta.dslFt,
      meta.nplFt
    ),
    spillStatus: spillStatus(reading.waterLevelFt, meta.nplFt),
    trend7d: trendDirection(reading.waterLevelFt, prior7?.waterLevelFt),
  };
}

export function latestPerDam(
  readings: DamReading[]
): Map<string, DamReading> {
  const map = new Map<string, DamReading>();
  for (const r of readings) {
    const prev = map.get(r.location);
    if (!prev || r.date > prev.date) {
      map.set(r.location, r);
    }
  }
  return map;
}

export function overviewFromSnapshots(snaps: DamSnapshot[]) {
  const withFill = snaps.filter((s) => s.fillPct != null);
  const maxStorage =
    withFill.length > 0
      ? [...withFill].sort((a, b) => (b.fillPct ?? 0) - (a.fillPct ?? 0))[0]
      : undefined;
  const lowestStorage =
    withFill.length > 0
      ? [...withFill].sort((a, b) => (a.fillPct ?? 0) - (b.fillPct ?? 0))[0]
      : undefined;
  const belowDead = snaps.filter((s) => s.storageStatus === "below_dead");
  const spillAlerts = snaps.filter((s) => s.spillStatus !== "none");

  return { maxStorage, lowestStorage, belowDead, spillAlerts };
}

export function trendOverRange(
  readings: DamReading[],
  location: string,
  from: string,
  to: string
): TrendDirection {
  const rows = readings
    .filter((r) => r.location === location && r.date >= from && r.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length < 2) return "stable";
  return trendDirection(rows[rows.length - 1].waterLevelFt, rows[0].waterLevelFt);
}
