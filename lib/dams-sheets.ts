/**
 * Load dams water-level data from Google Sheets (live source).
 */

import { parseDamsSheetValues } from "@/lib/dams-csv";
import {
  DEFAULT_DAMS_SPREADSHEET_ID,
  DEFAULT_DAMS_WORKSHEET_NAME,
} from "@/lib/dams-sheet-config";
import { appConfig } from "@/lib/config";
import {
  getSheetsClient,
  isGoogleSheetsConfigured,
  quoteSheetName,
} from "@/lib/google-sheets-auth";
import { logger } from "@/lib/logger";
import type { DamsDataset } from "@/lib/dams-types";

let cached: DamsDataset | null = null;
let cachedAt = 0;

const CACHE_TTL_MS = Number(process.env.DAMS_SHEETS_CACHE_TTL_MS ?? "120000");

function spreadsheetId(): string {
  return (
    appConfig.waterLevels.googleSheet.spreadsheetId ||
    DEFAULT_DAMS_SPREADSHEET_ID
  );
}

function worksheetName(): string {
  return (
    appConfig.waterLevels.googleSheet.worksheetName ||
    DEFAULT_DAMS_WORKSHEET_NAME
  );
}

export function isDamsSheetsConfigured(): boolean {
  return (
    appConfig.waterLevels.source === "sheets" && isGoogleSheetsConfigured()
  );
}

export function invalidateDamsSheetsCache(): void {
  cached = null;
  cachedAt = 0;
}

export async function loadDamsDatasetFromSheets(
  forceRefresh = false
): Promise<DamsDataset> {
  if (
    !forceRefresh &&
    cached &&
    Date.now() - cachedAt < CACHE_TTL_MS
  ) {
    return cached;
  }

  const sheets = await getSheetsClient();
  if (!sheets) {
    throw new Error("Google Sheets credentials are not configured.");
  }

  const id = spreadsheetId();
  const tab = worksheetName();
  const range = `${quoteSheetName(tab)}!A:R`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const values = (res.data.values ?? []) as string[][];
  if (values.length < 2) {
    throw new Error("Dams Google Sheet has no data rows.");
  }

  const dataset = parseDamsSheetValues(values);
  if (dataset.readings.length === 0) {
    throw new Error("No valid dam readings found in Google Sheet.");
  }

  cached = dataset;
  cachedAt = Date.now();

  logger.info("Dams dataset loaded from Google Sheets", {
    spreadsheetId: id,
    worksheet: tab,
    dams: dataset.dams.length,
    readings: dataset.readings.length,
    latestDate: dataset.latestDate,
  });

  return dataset;
}

export function damsSheetsMeta() {
  const id = spreadsheetId();
  return {
    spreadsheetId: id,
    worksheetName: worksheetName(),
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
  };
}
