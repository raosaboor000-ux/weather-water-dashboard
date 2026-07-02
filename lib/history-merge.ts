/**
 * Historical weather — Google Sheets is the source of truth.
 * On each visit, syncMissingWeatherToSheet() backfills gaps from WU first.
 */

import { googleSheetsStorage } from "@/lib/google-sheets-storage";
import { logger } from "@/lib/logger";
import type { WeatherHistoryRow } from "@/lib/types";
import { weatherAPI } from "@/lib/weather-wu";

function sortNewestFirst(rows: WeatherHistoryRow[]): WeatherHistoryRow[] {
  return [...rows].sort(
    (a, b) =>
      new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
  );
}

export async function getWeatherHistory(): Promise<{
  rows: WeatherHistoryRow[];
  source: "sheet" | "api";
}> {
  if (googleSheetsStorage.isConfigured()) {
    try {
      const sheetRows = await googleSheetsStorage.loadWeather();
      if (sheetRows.length > 0) {
        return { rows: sortNewestFirst(sheetRows), source: "sheet" };
      }
    } catch (err) {
      logger.warn("Sheet history load failed", { err: String(err) });
    }
  }

  // Empty sheet — show today's readings until rows accumulate (no 7-day API calls).
  const apiRows = await weatherAPI.getDaily();
  return { rows: apiRows, source: "api" };
}
