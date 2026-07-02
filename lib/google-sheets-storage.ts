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
  weatherHistoryToSheetCells,
  weatherLatestToSheetCells,
} from "@/lib/sheet-rows";
import type { SheetObservationRow, StorageResult } from "@/lib/sheet-types";
import type { WeatherHistoryRow, WeatherLatest } from "@/lib/types";
import {
  canAppendObservation,
  dedupeHistoryForDisplay,
  selectRowsToAppend,
} from "@/lib/weather-timestamp";

import type { sheets_v4 } from "googleapis";

const APPEND_BATCH_SIZE = 100;

let sheetWriteChain: Promise<unknown> = Promise.resolve();

function enqueueSheetWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = sheetWriteChain.then(fn);
  sheetWriteChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function listSheetTimestamps(values: string[][]): string[] {
  const headerOffset =
    values[0]?.[0]?.toLowerCase().includes("timestamp") ? 1 : 0;
  const out: string[] = [];
  for (let i = headerOffset; i < values.length; i++) {
    const raw = values[i]?.[0];
    const iso = raw == null ? "" : String(raw).trim();
    if (iso) out.push(iso);
  }
  return out;
}

const SHEET_READ_OPTS = {
  valueRenderOption: "UNFORMATTED_VALUE" as const,
  dateTimeRenderOption: "FORMATTED_STRING" as const,
};

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
   * Append API rows whose exact timestamps are not already in the sheet.
   */
  async syncMissingRows(apiRows: WeatherHistoryRow[]): Promise<StorageResult> {
    return enqueueSheetWrite(() => this._syncMissingRowsImpl(apiRows));
  }

  private async _syncMissingRowsImpl(
    apiRows: WeatherHistoryRow[]
  ): Promise<StorageResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "Google Sheets not configured.",
        rowsAffected: 0,
      };
    }

    const sheets = await getSheetsClient();
    if (!sheets) {
      return {
        success: false,
        message: "Could not authenticate with Google Sheets.",
        rowsAffected: 0,
      };
    }

    try {
      const { spreadsheetId, dataRange, appendAnchor } =
        await resolveSheetRange(sheets);

      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: dataRange,
        ...SHEET_READ_OPTS,
      });
      const values = (existing.data.values ?? []) as string[][];
      const existingTimestamps = listSheetTimestamps(values);
      const missing = selectRowsToAppend(apiRows, existingTimestamps);

      if (missing.length === 0) {
        return {
          success: true,
          message: "Sheet already up to date.",
          rowsAffected: 0,
        };
      }

      const sheetRows = missing.map(weatherHistoryToSheetCells);

      if (values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: appendAnchor,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [headerRow(), ...sheetRows] },
        });
      } else {
        for (let i = 0; i < sheetRows.length; i += APPEND_BATCH_SIZE) {
          const batch = sheetRows.slice(i, i + APPEND_BATCH_SIZE);
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: appendAnchor,
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values: batch },
          });
        }
      }

      logger.info("Sheet catch-up complete", {
        spreadsheetId,
        rowsAdded: missing.length,
        skipped: apiRows.length - missing.length,
      });

      return {
        success: true,
        message: `Synced ${missing.length} missing observation(s).`,
        rowsAffected: missing.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("syncMissingRows failed", { error: message });
      return {
        success: false,
        message: `Google Sheets sync failed: ${message}`,
        rowsAffected: 0,
      };
    }
  }

  /**
   * Append the latest observation if this timestamp is not already stored.
   */
  async saveWeather(latest: WeatherLatest): Promise<StorageResult> {
    return enqueueSheetWrite(() => this._saveWeatherImpl(latest));
  }

  private async _saveWeatherImpl(latest: WeatherLatest): Promise<StorageResult> {
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
        ...SHEET_READ_OPTS,
      });
      const values = (existing.data.values ?? []) as string[][];
      const writeIso = latest.lastUpdated.trim();
      const existingTimestamps = listSheetTimestamps(values);

      if (!canAppendObservation(writeIso, existingTimestamps)) {
        logger.info("Sheet save skipped — already stored or too soon", {
          writeIso,
        });
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

  /** Load all observations from the spreadsheet (deduped for display). */
  async loadWeather(): Promise<WeatherHistoryRow[]> {
    const rows = await this._readSheetRows();
    return dedupeHistoryForDisplay(rows.map(sheetRowToHistory));
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
        ...SHEET_READ_OPTS,
      });
      return parseRowsFromValues((res.data.values ?? []) as string[][]);
    } catch (err) {
      logger.error("loadWeather failed", { err: String(err) });
      return [];
    }
  }
}

export const googleSheetsStorage = new GoogleSheetsStorage();
