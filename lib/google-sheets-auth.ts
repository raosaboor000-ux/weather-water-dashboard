import { appConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

import type { sheets_v4 } from "googleapis";

let warnedMissingCredentials = false;

export function loadServiceAccountJson(): string | null {
  const json = appConfig.googleSheets.serviceAccountJson?.trim();
  return json || null;
}

export function isGoogleSheetsConfigured(): boolean {
  if (!appConfig.googleSheets.enabled) return false;
  return Boolean(loadServiceAccountJson());
}

export async function getSheetsClient(): Promise<sheets_v4.Sheets | null> {
  const json = loadServiceAccountJson();
  if (!json) {
    if (!warnedMissingCredentials) {
      warnedMissingCredentials = true;
      logger.warn(
        "Google Sheets disabled — set GOOGLE_SERVICE_ACCOUNT_JSON in environment variables"
      );
    }
    return null;
  }

  try {
    const { google } = await import("googleapis");
    const credentials = JSON.parse(json) as Record<string, unknown>;
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return google.sheets({ version: "v4", auth });
  } catch (err) {
    logger.error("Google Sheets auth failed", { err: String(err) });
    return null;
  }
}

export function quoteSheetName(name: string): string {
  if (/^[A-Za-z0-9_]+$/.test(name)) return name;
  return `'${name.replace(/'/g, "''")}'`;
}
