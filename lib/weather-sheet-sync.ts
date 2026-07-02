/**
 * Sync WU API history into Google Sheets — append any reading not already stored.
 */

import { googleSheetsStorage } from "@/lib/google-sheets-storage";
import { logger } from "@/lib/logger";
import type { StorageResult } from "@/lib/sheet-types";
import { parseObservationTimeMs } from "@/lib/weather-timestamp";
import { weatherAPI } from "@/lib/weather-wu";

let syncInFlight: Promise<StorageResult> | null = null;

export async function syncApiHistoryToSheet(): Promise<StorageResult> {
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

      if (apiRows.length === 0) {
        logger.info("Sheet sync skipped — no API history");
        return {
          success: true,
          message: "No API history returned.",
          rowsAffected: 0,
        };
      }

      const result = await googleSheetsStorage.syncMissingRows(apiRows);
      if (result.rowsAffected && result.rowsAffected > 0) {
        logger.info("Sheet sync appended rows", {
          rowsAffected: result.rowsAffected,
          latest: apiRows
            .sort(
              (a, b) =>
                parseObservationTimeMs(b.timestampIso) -
                parseObservationTimeMs(a.timestampIso)
            )[0]?.timestampIso,
        });
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn("API → sheet sync failed", { error: message });
      return {
        success: false,
        message: `Sync failed: ${message}`,
        rowsAffected: 0,
      };
    }
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}
