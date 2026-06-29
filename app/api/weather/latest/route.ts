import { NextResponse } from "next/server";
import { googleSheetsStorage } from "@/lib/google-sheets-storage";
import { logger } from "@/lib/logger";
import { historyRowToLatest } from "@/lib/weather-map";
import { weatherAPI } from "@/lib/weather-wu";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

async function loadLatestFromSheet() {
  if (!googleSheetsStorage.isConfigured()) return null;

  const rows = await googleSheetsStorage.loadWeather();
  if (rows.length === 0) return null;

  const latest = historyRowToLatest(rows[rows.length - 1]!);
  latest.online = false;
  return latest;
}

export async function GET() {
  try {
    const data = await weatherAPI.getCurrent();
    logger.info("Latest weather served", {
      stationId: data.stationId,
      lastUpdated: data.lastUpdated,
    });

    if (googleSheetsStorage.isConfigured()) {
      const result = await googleSheetsStorage.saveWeather(data);
      if (result.success && result.rowsAffected) {
        data.sheetSyncedAt = data.lastUpdated;
        logger.info("Latest synced to Google Sheets", {
          rowsAffected: result.rowsAffected,
        });
      } else if (!result.success) {
        logger.warn("Google Sheets sync skipped", { message: result.message });
      }
    }

    return NextResponse.json(data, { headers: noStore });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to fetch latest weather";
    logger.error("Latest weather failed", { error: message });

    try {
      const sheetLatest = await loadLatestFromSheet();
      if (sheetLatest) {
        logger.info("Serving latest weather from Google Sheets fallback", {
          lastUpdated: sheetLatest.lastUpdated,
        });
        return NextResponse.json(sheetLatest, { headers: noStore });
      }
    } catch (sheetErr) {
      logger.warn("Sheet fallback failed", { err: String(sheetErr) });
    }

    return NextResponse.json({ error: message }, { status: 502, headers: noStore });
  }
}
