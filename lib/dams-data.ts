import { appConfig } from "@/lib/config";
import { loadDamsDataset } from "@/lib/dams-csv";
import {
  damsSheetsMeta,
  isDamsSheetsConfigured,
  loadDamsDatasetFromSheets,
} from "@/lib/dams-sheets";
import {
  buildSnapshots,
  buildSnapshotsLatestPerDam,
  latestPerDam,
  overviewFromSnapshots,
  trendOverRange,
} from "@/lib/dams-status";
import { logger } from "@/lib/logger";
import type { DamReading, DamSnapshot, DamsDataset } from "@/lib/dams-types";

export async function getDamsDataset(): Promise<DamsDataset> {
  if (isDamsSheetsConfigured()) {
    try {
      return await loadDamsDatasetFromSheets();
    } catch (err) {
      logger.error("Dams Google Sheet load failed — falling back to CSV", {
        err: String(err),
      });
    }
  }

  return loadDamsDataset(appConfig.waterLevels.csvPath);
}

export function getDamsDataSource(): "google_sheets" | "csv" {
  return isDamsSheetsConfigured() ? "google_sheets" : "csv";
}

export function getDamsDataMeta() {
  if (isDamsSheetsConfigured()) {
    return {
      source: "google_sheets" as const,
      ...damsSheetsMeta(),
    };
  }
  return {
    source: "csv" as const,
    csvPath: appConfig.waterLevels.csvPath,
  };
}

export async function getSnapshotsForDate(
  date: string,
  latestOnly = false
): Promise<{ date: string; snapshots: DamSnapshot[]; latestOnly: boolean }> {
  const dataset = await getDamsDataset();

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

export async function getReadingsForDam(
  location: string,
  from?: string,
  to?: string
): Promise<DamReading[]> {
  const { readings } = await getDamsDataset();
  return readings
    .filter((r) => {
      if (r.location !== location) return false;
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getWaterOverview(date: string, latestOnly = false) {
  const { date: effectiveDate, snapshots } = await getSnapshotsForDate(
    date,
    latestOnly
  );
  return {
    date: effectiveDate,
    snapshots,
    overview: overviewFromSnapshots(snapshots),
  };
}

export async function getTrendSummary(
  location: string,
  from: string,
  to: string
) {
  const { readings } = await getDamsDataset();
  return trendOverRange(readings, location, from, to);
}

export { latestPerDam };
