import { NextResponse } from "next/server";
import { getMergedWeatherHistory } from "@/lib/history-merge";
import { logger } from "@/lib/logger";
import { weatherAPI } from "@/lib/weather-wu";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") ?? "history";

    if (mode === "hourly") {
      const rows = await weatherAPI.getHourly();
      return NextResponse.json({ rows, source: "api" }, { headers: noStore });
    }
    if (mode === "daily") {
      const rows = await weatherAPI.getDaily();
      return NextResponse.json({ rows, source: "api" }, { headers: noStore });
    }

    const { rows, source } = await getMergedWeatherHistory();
    logger.info("History weather served", { mode, count: rows.length, source });
    return NextResponse.json({ rows, source }, { headers: noStore });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to fetch historical weather";
    logger.error("History weather failed", { error: message });
    return NextResponse.json({ error: message }, { status: 502, headers: noStore });
  }
}
