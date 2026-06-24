/**
 * Shared TypeScript contracts for weather data.
 * Mirrors MACH's weather-types — extended for this single-station dashboard.
 */

export type WeatherLatest = {
  stationId: string;
  stationName: string;
  dateLocal?: string;
  time: string;
  temperature: string;
  dewPoint: string;
  humidity: string;
  wind: string;
  speed: string;
  gust: string;
  pressure: string;
  uv: string;
  solar: string;
  precipRate?: string;
  precipTotal?: string;
  heatIndex?: string;
  windChill?: string;
  dailyHigh?: string;
  dailyLow?: string;
  lastUpdated: string;
  /** ISO timestamp of latest row persisted in Google Sheets. */
  sheetSyncedAt?: string;
  online?: boolean;
};

export type WeatherHistoryRow = {
  timestampIso: string;
  dateLocal?: string;
  timeLocal?: string;
  temperature: string;
  dewPoint: string;
  humidity: string;
  wind: string;
  speed: string;
  gust: string;
  pressure: string;
  uv: string;
  solar: string;
  precipRate?: string;
  precipTotal?: string;
};
