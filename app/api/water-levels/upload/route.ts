import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { DAMS_CSV_HEADER, importDamsCsvContent } from "@/lib/dams-csv";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function POST(request: Request) {
  if (!appConfig.waterLevels.enabled) {
    return NextResponse.json(
      { error: "Water levels are disabled" },
      { status: 503, headers: noStore }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400, headers: noStore }
      );
    }

    const text = await file.text();
    const headerLine = text.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "";
    if (
      !headerLine.toLowerCase().includes("date") ||
      !headerLine.toLowerCase().includes("location") ||
      !headerLine.toLowerCase().includes("water_level")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid CSV format. Use the same columns as dams_data_new.csv",
        },
        { status: 400, headers: noStore }
      );
    }

    const result = importDamsCsvContent(
      appConfig.waterLevels.csvPath,
      text
    );

    logger.info("Dams CSV imported", {
      rowsAdded: result.rowsAdded,
      rowsUpdated: result.rowsUpdated,
      totalReadings: result.merged.readings.length,
    });

    return NextResponse.json(
      {
        ok: true,
        rowsAdded: result.rowsAdded,
        rowsUpdated: result.rowsUpdated,
        latestDate: result.merged.latestDate,
        damCount: result.merged.dams.length,
        expectedHeader: DAMS_CSV_HEADER,
      },
      { headers: noStore }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to import CSV";
    logger.error("Dams CSV import failed", { error: message });
    return NextResponse.json({ error: message }, { status: 400, headers: noStore });
  }
}
