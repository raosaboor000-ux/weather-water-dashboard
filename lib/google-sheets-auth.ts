import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { appConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

import type { sheets_v4 } from "googleapis";

let warnedMissingCredentials = false;

export function loadServiceAccountJson(): string | null {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) return inline;

  const filePath =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH?.trim() ||
    appConfig.googleSheets.credentialsPath?.trim();
  if (!filePath) return null;

  try {
    const resolved = isAbsolute(filePath)
      ? filePath
      : resolve(process.cwd(), filePath);
    return readFileSync(resolved, "utf8");
  } catch (err) {
    logger.error("Failed to read Google credentials file", {
      filePath,
      err: String(err),
    });
    return null;
  }
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
        "Google Sheets disabled — set GOOGLE_SERVICE_ACCOUNT_JSON_PATH or GOOGLE_SERVICE_ACCOUNT_JSON"
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
