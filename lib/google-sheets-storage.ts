/**
 * Google Sheets storage for historical weather observations.
 *
 * Spreadsheet: AWS 6
 * https://docs.google.com/spreadsheets/d/1-L-gQMnd2i-ntLbevj9CIzt937ChxKwi6hemtWn_Fuw
 *
 * Share the sheet with the service account email (Editor access).
 */

import { appConfig } from "@/lib/config";
import {
  getSheetsClient,
  loadServiceAccountJson,
  quoteSheetName,
} from "@/lib/google-sheets-auth";
import { logger } from "@/lib/logger";
import { DEFAULT_SPREADSHEET_ID } from "@/lib/sheet-config";
import {
  headerRow,
  parseRowsFromValues,
  sheetRowToHistory,
  weatherLatestToSheetCells,
} from "@/lib/sheet-rows";
import type { SheetObservationRow, StorageResult } from "@/lib/sheet-types";
import type { WeatherHistoryRow, WeatherLatest } from "@/lib/types";

import type { sheets_v4 } from "googleapis";

type SheetsApi = sheets_v4.Sheets | null;

async function resolveSheetRange(sheets: sheets_v4.Sheets) {
  const spreadsheetId = appConfig.googleSheets.spreadsheetId || DEFAULT_SPREADSHEET_ID;
  const envTab = appConfig.googleSheets.worksheetName;
  let sheetName = envTab;

  if (!sheetName) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    sheetName = meta.data.sheets?.[0]?.properties?.title ?? "Sheet1";
  }

  const q = quoteSheetName(sheetName);
  return {
    spreadsheetId,
    dataRange: `${q}!A:N`,
    appendAnchor: `${q}!A1`,
    sheetName,
  };
}

function sheetHasTimestamp(values: string[][], iso: string): boolean {
  const headerOffset =
    values[0]?.[0]?.toLowerCase().includes("timestamp") ? 1 : 0;
  const want = iso.trim();
  for (let i = headerOffset; i < values.length; i++) {
    if ((values[i]?.[0] ?? "").trim() === want) return true;
  }
  return false;
}

function lastTimestampMs(values: string[][]): number | null {
  const headerOffset =
    values[0]?.[0]?.toLowerCase().includes("timestamp") ? 1 : 0;
  for (let i = values.length - 1; i >= headerOffset; i--) {
    const iso = (values[i]?.[0] ?? "").trim();
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

export class GoogleSheetsStorage {
  get spreadsheetId(): string {
    return appConfig.googleSheets.spreadsheetId || DEFAULT_SPREADSHEET_ID;
  }

  isConfigured(): boolean {
    if (!appConfig.googleSheets.enabled) return false;
    if (!this.spreadsheetId) return false;
    return Boolean(loadServiceAccountJson());
  }

  /**
   * Append the latest observation if this timestamp is not already stored.
   */
  async saveWeather(latest: WeatherLatest): Promise<StorageResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "Google Sheets not configured — add credentials and enable storage.",
      };
    }

    const sheets = await getSheetsClient();
    if (!sheets) {
      return { success: false, message: "Could not authenticate with Google Sheets." };
    }

    try {
      const { spreadsheetId, dataRange, appendAnchor } =
        await resolveSheetRange(sheets);

      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: dataRange,
      });
      const values = (existing.data.values ?? []) as string[][];
      const writeIso = latest.lastUpdated.trim();

      if (sheetHasTimestamp(values, writeIso)) {
        logger.info("Sheet save skipped — duplicate timestamp", { writeIso });
        return {
          success: true,
          message: "Observation already stored.",
          rowsAffected: 0,
        };
      }

      const row = weatherLatestToSheetCells(latest);
      const hasHeader =
        values[0]?.[0]?.toLowerCase().includes("timestamp") ?? false;

      if (values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: appendAnchor,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [headerRow(), row] },
        });
      } else {
        const lastMs = lastTimestampMs(values);
        const currMs = new Date(writeIso).getTime();
        if (lastMs != null && !Number.isNaN(currMs) && currMs < lastMs) {
          return {
            success: false,
            message: "Observation is older than the last sheet row — not appended.",
          };
        }
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: appendAnchor,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: [row] },
        });
      }

      if (!hasHeader && values.length > 0) {
        // Header was missing on a non-empty sheet — leave as-is; first row may be data.
      }

      logger.info("Sheet row appended", { writeIso, spreadsheetId });
      return {
        success: true,
        message: "Observation saved to Google Sheets.",
        rowsAffected: 1,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("saveWeather failed", { error: message });
      return { success: false, message: `Google Sheets write failed: ${message}` };
    }
  }

  /** Load all observations from the spreadsheet. */
  async loadWeather(): Promise<WeatherHistoryRow[]> {
    const rows = await this._readSheetRows();
    return rows.map(sheetRowToHistory);
  }

  /** Filter stored observations to a date range (inclusive, station calendar dates). */
  async getHistory(startYmd: string, endYmd: string): Promise<WeatherHistoryRow[]> {
    const all = await this.loadWeather();
    return all.filter((r) => {
      const d = r.dateLocal ?? r.timestampIso.slice(0, 10);
      return d >= startYmd && d <= endYmd;
    });
  }

  async getStatus(): Promise<{
    configured: boolean;
    spreadsheetId: string;
    worksheetName: string;
    rowCount: number;
    lastTimestampIso?: string;
  }> {
    const rows = await this._readSheetRows();
    const last = rows[rows.length - 1];
    return {
      configured: this.isConfigured(),
      spreadsheetId: this.spreadsheetId,
      worksheetName: appConfig.googleSheets.worksheetName || "Sheet1",
      rowCount: rows.length,
      lastTimestampIso: last?.timestampIso,
    };
  }

  private async _readSheetRows(): Promise<SheetObservationRow[]> {
    if (!this.isConfigured()) return [];

    const sheets = await getSheetsClient();
    if (!sheets) return [];

    try {
      const { spreadsheetId, dataRange } = await resolveSheetRange(sheets);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: dataRange,
      });
      return parseRowsFromValues((res.data.values ?? []) as string[][]);
    } catch (err) {
      logger.error("loadWeather failed", { err: String(err) });
      return [];
    }
  }
}

export const googleSheetsStorage = new GoogleSheetsStorage();
