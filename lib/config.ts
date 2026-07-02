/**
 * Central application configuration.
 * All modules import from here — no hardcoded API keys elsewhere.
 */

import {
  DEFAULT_SPREADSHEET_ID,
  SERVICE_ACCOUNT_EMAIL,
} from "@/lib/sheet-config";
import {
  DEFAULT_DAMS_SPREADSHEET_ID,
  DEFAULT_DAMS_WORKSHEET_NAME,
  damsSpreadsheetUrl,
} from "@/lib/dams-sheet-config";

export const appConfig = {
  station: {
    id: process.env.WU_STATION_ID ?? "ITALAG19",
    name: process.env.WU_STATION_NAME ?? "AWS TALAGANG",
    label: process.env.WU_STATION_LABEL ?? "Personal Weather Station",
    timezone: process.env.STATION_TIMEZONE ?? "Asia/Karachi",
    lat: Number(process.env.STATION_LAT ?? "32.944"),
    lng: Number(process.env.STATION_LNG ?? "72.412"),
  },
  api: {
    wuApiKey:
      process.env.WU_API_KEY?.trim() ||
      "7ed5e8f9e9ff4d6295e8f9e9ffed62fa",
    wuBaseUrl: "https://api.weather.com/v2/pws",
  },
  refresh: {
    intervalMinutes: Number(process.env.REFRESH_INTERVAL_MINUTES ?? "5"),
    cacheTtlSeconds: Number(process.env.API_CACHE_TTL_SECONDS ?? "120"),
  },
  display: {
    theme: process.env.APP_THEME ?? "light",
    temperatureUnit: (process.env.TEMPERATURE_UNIT ?? "celsius") as "celsius" | "fahrenheit",
    windSpeedUnit: (process.env.WIND_SPEED_UNIT ?? "kmh") as "kmh" | "mph",
    pressureUnit: (process.env.PRESSURE_UNIT ?? "hpa") as "hpa",
  },
  googleSheets: {
    enabled:
      process.env.GOOGLE_SHEETS_ENABLED === "true" ||
      Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()),
    serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "",
    spreadsheetId:
      process.env.GOOGLE_SPREADSHEET_ID ?? DEFAULT_SPREADSHEET_ID,
    worksheetName: process.env.GOOGLE_WORKSHEET_NAME ?? "Sheet1",
    serviceAccountEmail:
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? SERVICE_ACCOUNT_EMAIL,
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/1-L-gQMnd2i-ntLbevj9CIzt937ChxKwi6hemtWn_Fuw/edit",
  },
  waterLevels: {
    enabled: process.env.WATER_LEVELS_ENABLED !== "false",
    source: (process.env.DAMS_DATA_SOURCE ?? "sheets") as "sheets" | "csv",
    csvPath: process.env.DAMS_CSV_PATH ?? "data/dams_data_new.csv",
    googleSheet: {
      spreadsheetId:
        process.env.DAMS_SPREADSHEET_ID ?? DEFAULT_DAMS_SPREADSHEET_ID,
      worksheetName:
        process.env.DAMS_WORKSHEET_NAME ?? DEFAULT_DAMS_WORKSHEET_NAME,
      spreadsheetUrl: damsSpreadsheetUrl(
        process.env.DAMS_SPREADSHEET_ID ?? DEFAULT_DAMS_SPREADSHEET_ID
      ),
    },
  },
} as const;

export type AppConfig = typeof appConfig;
