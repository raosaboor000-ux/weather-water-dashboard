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

import type { sheets_v4 } from "googleapis";

let cached: DamsDataset | null = null;
let cachedAt = 0;
let resolvedWorksheetName: string | null = null;

const CACHE_TTL_MS = Number(process.env.DAMS_SHEETS_CACHE_TTL_MS ?? "120000");

function spreadsheetId(): string {
  return (
    appConfig.waterLevels.googleSheet.spreadsheetId ||
    DEFAULT_DAMS_SPREADSHEET_ID
  );
}

function preferredWorksheetName(): string {
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
  resolvedWorksheetName = null;
}

async function resolveDamsWorksheet(
  sheets: sheets_v4.Sheets,
  id: string
): Promise<string> {
  if (resolvedWorksheetName) return resolvedWorksheetName;

  const preferred = preferredWorksheetName();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
  const titles =
    meta.data.sheets
      ?.map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t?.trim())) ?? [];

  if (titles.includes(preferred)) {
    resolvedWorksheetName = preferred;
    return preferred;
  }

  if (titles.length > 0) {
    resolvedWorksheetName = titles[0]!;
    logger.warn("Dams worksheet not found — using first tab", {
      preferred,
      using: resolvedWorksheetName,
      available: titles,
    });
    return resolvedWorksheetName;
  }

  resolvedWorksheetName = preferred;
  return preferred;
}

async function fetchDamsSheetValues(
  sheets: sheets_v4.Sheets,
  id: string,
  tab: string
): Promise<string[][]> {
  const quoted = quoteSheetName(tab);
  const ranges = [`${quoted}!A:R`, `${quoted}!A:Z`, quoted];

  let lastError: unknown;
  for (const range of ranges) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: id,
        range,
        valueRenderOption: "FORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      });
      return (res.data.values ?? []) as string[][];
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
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
  const tab = await resolveDamsWorksheet(sheets, id);
  const values = await fetchDamsSheetValues(sheets, id, tab);

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
    worksheetName: resolvedWorksheetName ?? preferredWorksheetName(),
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
  };
}
