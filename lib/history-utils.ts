/**
 * Filter and label helpers for historical weather charts.
 */

import { appConfig } from "@/lib/config";
import type { WeatherHistoryRow } from "@/lib/types";
import { firstNumber, windFromToDegrees } from "@/lib/weather-parse";

export type HistoryMode = "daily" | "weekly" | "monthly";

const TZ = appConfig.station.timezone;

export function todayStationYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function stationYmdFromIso(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

export function addDaysToYmd(ymd: string, delta: number): string {
  const p = parseYmd(ymd);
  if (!p) return ymd;
  const dt = new Date(Date.UTC(p.y, p.m, p.d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

/** True when the next-period control should be disabled (already at present). */
export function isHistoryAtPresent(
  mode: HistoryMode,
  stationDayYmd: string,
  anchor: Date
): boolean {
  const today = todayStationYmd();

  if (mode === "daily") {
    return stationDayYmd >= today;
  }

  if (mode === "monthly") {
    const tp = parseYmd(today);
    const anchorYmd = anchor.toLocaleDateString("en-CA", { timeZone: TZ });
    const ap = parseYmd(anchorYmd);
    if (!tp || !ap) return anchorYmd >= today;
    return ap.y > tp.y || (ap.y === tp.y && ap.m >= tp.m);
  }

  const { end } = startEndForMode(anchor, "weekly");
  const endYmd = end.toLocaleDateString("en-CA", { timeZone: TZ });
  return endYmd >= today;
}

function rowTimeMs(r: WeatherHistoryRow): number {
  const t = new Date(r.timestampIso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function sortOldestFirst(rows: WeatherHistoryRow[]): WeatherHistoryRow[] {
  return [...rows].sort((a, b) => rowTimeMs(a) - rowTimeMs(b));
}

function startEndForMode(anchor: Date, mode: HistoryMode) {
  if (mode === "daily") {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    const end = new Date(anchor);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (mode === "weekly") {
    const d = new Date(anchor);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function filterRowsByMode(
  rows: WeatherHistoryRow[],
  mode: HistoryMode,
  stationDayYmd: string,
  anchor: Date
): WeatherHistoryRow[] {
  return rows.filter((r) => {
    if (mode === "daily") {
      const byIso =
        r.timestampIso && stationYmdFromIso(r.timestampIso) === stationDayYmd;
      const byCol = r.dateLocal === stationDayYmd;
      return byIso || byCol;
    }

    const iso = r.timestampIso?.trim();
    if (!iso) return false;
    const parts = parseYmd(stationYmdFromIso(iso));
    if (!parts) return false;

    if (mode === "weekly") {
      const { start, end } = startEndForMode(anchor, "weekly");
      const rowDate = new Date(parts.y, parts.m, parts.d);
      const x = rowDate.getTime();
      return x >= start.getTime() && x <= end.getTime();
    }

    return parts.y === anchor.getFullYear() && parts.m === anchor.getMonth();
  });
}

export function chartXLabel(r: WeatherHistoryRow, mode: HistoryMode): string {
  if (mode === "daily") {
    const tl = r.timeLocal?.trim();
    if (tl) return tl;
    const iso = r.timestampIso?.trim();
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: TZ,
    });
  }
  const iso = r.timestampIso?.trim();
  if (!iso) return r.dateLocal ?? "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  });
}

export function periodTitle(
  mode: HistoryMode,
  stationDayYmd: string,
  anchor: Date
): string {
  if (mode === "daily") {
    const p = parseYmd(stationDayYmd);
    if (!p) return stationDayYmd;
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${months[p.m]} ${p.d}, ${p.y}`;
  }
  const { start, end } = startEndForMode(anchor, mode);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export type ChartSeries = {
  labels: string[];
  temp: number[];
  dew: number[];
  humidity: number[];
  wind: number[];
  gust: number[];
  pressure: number[];
  solar: number[];
  uv: number[];
  precipRate: number[];
  precipTotal: number[];
  windDir: number[];
};

export function buildChartSeries(
  rows: WeatherHistoryRow[],
  mode: HistoryMode
): ChartSeries {
  const sorted = sortOldestFirst(rows);
  return {
    labels: sorted.map((r) => chartXLabel(r, mode)),
    temp: sorted.map((r) => firstNumber(r.temperature) ?? 0),
    dew: sorted.map((r) => firstNumber(r.dewPoint) ?? 0),
    humidity: sorted.map((r) => firstNumber(r.humidity) ?? 0),
    wind: sorted.map((r) => firstNumber(r.speed) ?? 0),
    gust: sorted.map((r) => firstNumber(r.gust) ?? 0),
    pressure: sorted.map((r) => firstNumber(r.pressure) ?? 0),
    solar: sorted.map((r) => firstNumber(r.solar) ?? 0),
    uv: sorted.map((r) => firstNumber(r.uv) ?? 0),
    precipRate: sorted.map((r) => firstNumber(r.precipRate ?? "") ?? 0),
    precipTotal: sorted.map((r) => firstNumber(r.precipTotal ?? "") ?? 0),
    windDir: sorted.map((r) => windFromToDegrees(r.wind ?? "")),
  };
}
