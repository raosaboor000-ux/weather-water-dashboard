import { appConfig } from "@/lib/config";
import type { SheetObservationRow } from "@/lib/sheet-types";
import type { WeatherHistoryRow, WeatherLatest } from "@/lib/types";
import { SHEET_HEADERS } from "@/lib/sheet-config";

const TZ = appConfig.station.timezone;

export function stationYmdFromIso(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

export function stationTimeLabelFromIso(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  });
}

export function weatherHistoryToSheetCells(r: WeatherHistoryRow): string[] {
  return [
    r.timestampIso,
    r.dateLocal ?? stationYmdFromIso(r.timestampIso),
    r.timeLocal ?? stationTimeLabelFromIso(r.timestampIso),
    r.temperature,
    r.dewPoint,
    r.humidity,
    r.wind,
    r.speed,
    r.gust,
    r.pressure,
    r.uv,
    r.solar,
    r.precipRate ?? "",
    r.precipTotal ?? "",
  ];
}

export function weatherLatestToSheetCells(w: WeatherLatest): string[] {
  const iso = w.lastUpdated;
  return [
    iso,
    w.dateLocal ?? stationYmdFromIso(iso),
    w.time,
    w.temperature,
    w.dewPoint,
    w.humidity,
    w.wind,
    w.speed,
    w.gust,
    w.pressure,
    w.uv,
    w.solar,
    w.precipRate ?? "",
    w.precipTotal ?? "",
  ];
}

export function cellsToRow(cells: string[]): SheetObservationRow | null {
  const c = [...cells];
  while (c.length < 14) c.push("");
  const first = (c[0] ?? "").toLowerCase();
  if (first.includes("timestamp")) return null;
  const iso = (c[0] ?? "").trim();
  if (!iso) return null;

  const hasFullLayout = /^\d{4}-\d{2}-\d{2}$/.test((c[1] ?? "").trim());
  if (hasFullLayout) {
    return {
      timestampIso: iso,
      dateLocal: c[1] ?? "",
      timeLocal: c[2] ?? "",
      temperature: c[3] ?? "",
      dewPoint: c[4] ?? "",
      humidity: c[5] ?? "",
      wind: c[6] ?? "",
      speed: c[7] ?? "",
      gust: c[8] ?? "",
      pressure: c[9] ?? "",
      uv: c[10] ?? "",
      solar: c[11] ?? "",
      precipRate: c[12] ?? "",
      precipTotal: c[13] ?? "",
    };
  }

  return {
    timestampIso: iso,
    dateLocal: stationYmdFromIso(iso),
    timeLocal: c[1] ?? stationTimeLabelFromIso(iso),
    temperature: c[2] ?? "",
    dewPoint: c[3] ?? "",
    humidity: c[4] ?? "",
    wind: c[5] ?? "",
    speed: c[6] ?? "",
    gust: c[7] ?? "",
    pressure: c[8] ?? "",
    uv: c[9] ?? "",
    solar: c[10] ?? "",
    precipRate: c[11] ?? "",
    precipTotal: c[12] ?? "",
  };
}

export function parseRowsFromValues(rows: string[][]): SheetObservationRow[] {
  if (rows.length === 0) return [];
  let start = 0;
  if ((rows[0]?.[0] ?? "").toLowerCase().includes("timestamp")) start = 1;
  const out: SheetObservationRow[] = [];
  for (let i = start; i < rows.length; i++) {
    const r = cellsToRow(rows[i] ?? []);
    if (r) out.push(r);
  }
  return out;
}

export function sheetRowToHistory(row: SheetObservationRow): WeatherHistoryRow {
  return {
    timestampIso: row.timestampIso,
    dateLocal: row.dateLocal,
    timeLocal: row.timeLocal,
    temperature: row.temperature,
    dewPoint: row.dewPoint,
    humidity: row.humidity,
    wind: row.wind,
    speed: row.speed,
    gust: row.gust,
    pressure: row.pressure,
    uv: row.uv,
    solar: row.solar,
    precipRate: row.precipRate,
    precipTotal: row.precipTotal,
  };
}

export function headerRow(): string[] {
  return [...SHEET_HEADERS];
}
