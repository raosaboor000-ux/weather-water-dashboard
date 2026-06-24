import { appConfig } from "@/lib/config";
import { loadDamsDataset } from "@/lib/dams-csv";
import {
  buildSnapshots,
  buildSnapshotsLatestPerDam,
  latestPerDam,
  overviewFromSnapshots,
  trendOverRange,
} from "@/lib/dams-status";
import type { DamReading, DamSnapshot, DamsDataset } from "@/lib/dams-types";

export function getDamsDataset(): DamsDataset {
  return loadDamsDataset(appConfig.waterLevels.csvPath);
}

export function getSnapshotsForDate(
  date: string,
  latestOnly = false
): { date: string; snapshots: DamSnapshot[]; latestOnly: boolean } {
  const dataset = getDamsDataset();

  if (latestOnly) {
    const snapshots = buildSnapshotsLatestPerDam(dataset.dams, dataset.readings);
    return { date: "", snapshots, latestOnly: true };
  }

  const effectiveDate = date || dataset.latestDate;
  const snapshots = buildSnapshots(
    dataset.dams,
    dataset.readings,
    effectiveDate
  );

  return { date: effectiveDate, snapshots, latestOnly: false };
}

export function getReadingsForDam(
  location: string,
  from?: string,
  to?: string
): DamReading[] {
  const { readings } = getDamsDataset();
  return readings
    .filter((r) => {
      if (r.location !== location) return false;
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getWaterOverview(date: string, latestOnly = false) {
  const { date: effectiveDate, snapshots } = getSnapshotsForDate(
    date,
    latestOnly
  );
  return {
    date: effectiveDate,
    snapshots,
    overview: overviewFromSnapshots(snapshots),
  };
}

export function getTrendSummary(
  location: string,
  from: string,
  to: string
) {
  const { readings } = getDamsDataset();
  return trendOverRange(readings, location, from, to);
}

export { latestPerDam };
