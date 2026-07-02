import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import {
  getDamsDataMeta,
  getDamsDataset,
  getReadingsForDam,
  getTrendSummary,
  getWaterOverview,
} from "@/lib/dams-data";
import { invalidateDamsSheetsCache } from "@/lib/dams-sheets";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  if (!appConfig.waterLevels.enabled) {
    return NextResponse.json(
      { error: "Water levels are disabled" },
      { status: 503, headers: noStore }
    );
  }

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") ?? "overview";
    const refresh = url.searchParams.get("refresh") === "true";

    if (refresh) {
      invalidateDamsSheetsCache();
    }

    if (mode === "meta") {
      const dataset = await getDamsDataset();
      return NextResponse.json(
        {
          dams: dataset.dams,
          dates: dataset.dates,
          latestDate: dataset.latestDate,
          ...getDamsDataMeta(),
        },
        { headers: noStore }
      );
    }

    if (mode === "readings") {
      const location = url.searchParams.get("location");
      if (!location) {
        return NextResponse.json(
          { error: "location is required" },
          { status: 400, headers: noStore }
        );
      }
      const from = url.searchParams.get("from") ?? undefined;
      const to = url.searchParams.get("to") ?? undefined;
      const readings = await getReadingsForDam(location, from, to);
      const trend =
        from && to
          ? await getTrendSummary(location, from, to)
          : undefined;
      return NextResponse.json(
        { location, from, to, readings, trend },
        { headers: noStore }
      );
    }

    const date = url.searchParams.get("date") ?? "";
    const latestOnly = url.searchParams.get("latestOnly") === "true";
    const payload = await getWaterOverview(date, latestOnly);

    logger.info("Water levels served", {
      date: payload.date,
      count: payload.snapshots.length,
      latestOnly,
      source: getDamsDataMeta().source,
    });

    return NextResponse.json(payload, { headers: noStore });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to load water level data";
    logger.error("Water levels failed", { error: message });
    return NextResponse.json(
      { error: message },
      { status: 502, headers: noStore }
    );
  }
}
