/**
 * Merges Google Sheets history with Weather Underground API history.
 */

import { googleSheetsStorage } from "@/lib/google-sheets-storage";
import { logger } from "@/lib/logger";
import type { WeatherHistoryRow } from "@/lib/types";
import { weatherAPI } from "@/lib/weather-wu";

export async function getMergedWeatherHistory(): Promise<{
  rows: WeatherHistoryRow[];
  source: "sheet" | "api" | "merged";
}> {
  let sheetRows: WeatherHistoryRow[] = [];
  if (googleSheetsStorage.isConfigured()) {
    try {
      sheetRows = await googleSheetsStorage.loadWeather();
    } catch (err) {
      logger.warn("Sheet history load failed, using API only", { err: String(err) });
    }
  }

  let apiRows: WeatherHistoryRow[] = [];
  try {
    apiRows = await weatherAPI.getHistory();
  } catch (err) {
    logger.warn("API history load failed", { err: String(err) });
  }

  if (sheetRows.length === 0 && apiRows.length === 0) {
    return { rows: [], source: "api" };
  }
  if (sheetRows.length === 0) {
    return { rows: apiRows, source: "api" };
  }
  if (apiRows.length === 0) {
    return { rows: sheetRows, source: "sheet" };
  }

  const map = new Map<string, WeatherHistoryRow>();
  for (const r of apiRows) {
    if (r.timestampIso) map.set(r.timestampIso, r);
  }
  for (const r of sheetRows) {
    if (r.timestampIso) map.set(r.timestampIso, r);
  }

  const merged = Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
  );

  return { rows: merged, source: "merged" };
}
