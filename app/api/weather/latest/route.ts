import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { weatherAPI } from "@/lib/weather-wu";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

/** Current conditions from WU API (sheet sync runs via /api/weather/history). */
export async function GET() {
  try {
    const data = await weatherAPI.getCurrent();
    logger.info("Latest weather served", {
      stationId: data.stationId,
      lastUpdated: data.lastUpdated,
    });

    return NextResponse.json(data, { headers: noStore });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to fetch latest weather";
    logger.error("Latest weather failed", { error: message });

    try {
      const { googleSheetsStorage } = await import("@/lib/google-sheets-storage");
      const { historyRowToLatest } = await import("@/lib/weather-map");

      if (googleSheetsStorage.isConfigured()) {
        const rows = await googleSheetsStorage.loadWeather();
        if (rows.length > 0) {
          const sheetLatest = historyRowToLatest(rows[rows.length - 1]!);
          sheetLatest.online = false;
          logger.info("Serving latest weather from Google Sheets fallback", {
            lastUpdated: sheetLatest.lastUpdated,
          });
          return NextResponse.json(sheetLatest, { headers: noStore });
        }
      }
    } catch (sheetErr) {
      logger.warn("Sheet fallback failed", { err: String(sheetErr) });
    }

    return NextResponse.json({ error: message }, { status: 502, headers: noStore });
  }
}
