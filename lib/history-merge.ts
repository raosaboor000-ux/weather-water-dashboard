/**
 * Historical weather — served from Google Sheets after API catch-up sync.
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
      return { rows: sortNewestFirst(sheetRows), source: "sheet" };
    } catch (err) {
      logger.warn("Sheet history load failed", { err: String(err) });
    }
  }

  const apiRows = await weatherAPI.getCatchUpHistory();
  return { rows: sortNewestFirst(apiRows), source: "api" };
}
