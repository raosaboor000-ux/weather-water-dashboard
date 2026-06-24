/** Google Sheets layout for AWS TALAGANG weather log. */

export const SHEET_HEADERS = [
  "timestamp_iso",
  "date_local",
  "time_local",
  "temperature",
  "dew_point",
  "humidity",
  "wind",
  "speed",
  "gust",
  "pressure",
  "uv",
  "solar",
  "precip_rate",
  "precip_total",
] as const;

export const DEFAULT_SPREADSHEET_ID = "1-L-gQMnd2i-ntLbevj9CIzt937ChxKwi6hemtWn_Fuw";

export const SERVICE_ACCOUNT_EMAIL =
  "gee-service-account@local-receiver-483506-b5.iam.gserviceaccount.com";
