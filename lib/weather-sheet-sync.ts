/**
 * On each visit, backfill any WU readings not yet stored in Google Sheets.
 */

import { googleSheetsStorage } from "@/lib/google-sheets-storage";
import { logger } from "@/lib/logger";
import type { StorageResult } from "@/lib/sheet-types";
import { weatherAPI } from "@/lib/weather-wu";

let syncInFlight: Promise<StorageResult> | null = null;

export async function syncMissingWeatherToSheet(): Promise<StorageResult> {
  if (!googleSheetsStorage.isConfigured()) {
    return {
      success: false,
      message: "Google Sheets not configured.",
      rowsAffected: 0,
    };
  }

  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const apiRows = await weatherAPI.getCatchUpHistory();
      return await googleSheetsStorage.syncMissingRows(apiRows);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn("Weather catch-up sync failed", { error: message });
      return {
        success: false,
        message: `Catch-up failed: ${message}`,
        rowsAffected: 0,
      };
    }
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}
