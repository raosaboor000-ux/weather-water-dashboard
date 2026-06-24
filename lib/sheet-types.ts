/** One observation row as stored in Google Sheets (columns A–N). */

export type SheetObservationRow = {
  timestampIso: string;
  dateLocal: string;
  timeLocal: string;
  temperature: string;
  dewPoint: string;
  humidity: string;
  wind: string;
  speed: string;
  gust: string;
  pressure: string;
  uv: string;
  solar: string;
  precipRate: string;
  precipTotal: string;
};

export type StorageResult = {
  success: boolean;
  message: string;
  rowsAffected?: number;
};
