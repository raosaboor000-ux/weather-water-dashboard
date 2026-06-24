import { NextResponse } from "next/server";
import { googleSheetsStorage } from "@/lib/google-sheets-storage";
import { logger } from "@/lib/logger";
import { weatherAPI } from "@/lib/weather-wu";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

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
    return NextResponse.json({ error: message }, { status: 502, headers: noStore });
  }
}
