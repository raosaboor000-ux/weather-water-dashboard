import { NextResponse } from "next/server";
import { getWeatherHistory } from "@/lib/history-merge";
import { logger } from "@/lib/logger";
import { syncApiHistoryToSheet } from "@/lib/weather-sheet-sync";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

/** On load/refresh: WU API → append unsaved rows → return sheet history. */
export async function GET() {
  try {
    const sync = await syncApiHistoryToSheet();
    if (sync.rowsAffected && sync.rowsAffected > 0) {
      logger.info("API history saved to Google Sheets", {
        rowsAffected: sync.rowsAffected,
      });
    }

    const { rows, source } = await getWeatherHistory();
    logger.info("History weather served", { count: rows.length, source });
    return NextResponse.json({ rows, source }, { headers: noStore });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to fetch historical weather";
    logger.error("History weather failed", { error: message });
    return NextResponse.json({ error: message }, { status: 502, headers: noStore });
  }
}
