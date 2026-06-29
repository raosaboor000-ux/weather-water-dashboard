/**
 * Central application configuration.
 * All modules import from here — no hardcoded API keys elsewhere.
 */

import {
  DEFAULT_SPREADSHEET_ID,
  SERVICE_ACCOUNT_EMAIL,
} from "@/lib/sheet-config";

export const appConfig = {
  station: {
    id: process.env.WU_STATION_ID ?? "ITALAG18",
    name: process.env.WU_STATION_NAME ?? "AWS TALAGANG",
    label: process.env.WU_STATION_LABEL ?? "Personal Weather Station",
    timezone: process.env.STATION_TIMEZONE ?? "Asia/Karachi",
    lat: Number(process.env.STATION_LAT ?? "32.944"),
    lng: Number(process.env.STATION_LNG ?? "72.412"),
  },
  api: {
    wuApiKey:
      process.env.WU_API_KEY?.trim() ||
      "4f2104d1b4784c34a104d1b4786c3417",
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
    credentialsPath:
      process.env.GOOGLE_CREDENTIALS_PATH ??
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH ??
      "",
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
    csvPath: process.env.DAMS_CSV_PATH ?? "data/dams_data_new.csv",
  },
} as const;

export type AppConfig = typeof appConfig;
