/**
 * Daily high / avg / low aggregates for weekly and monthly table views.
 */

import type { WeatherHistoryRow } from "@/lib/types";
import { stationYmdFromIso, sortOldestFirst } from "@/lib/history-utils";
import { firstNumber } from "@/lib/weather-parse";

export type TripleStat = { high: string; avg: string; low: string };
export type PressureHL = { high: string; low: string };

export type DailyAggregateRow = {
  dateKey: string;
  dateLabel: string;
  temperature: TripleStat;
  dewPoint: TripleStat;
  humidity: TripleStat;
  speed: TripleStat;
  pressure: PressureHL;
  precipSum: string;
};

function observationDateKey(r: WeatherHistoryRow): string {
  if (r.dateLocal?.match(/^\d{4}-\d{2}-\d{2}$/)) return r.dateLocal;
  if (r.timestampIso) return stationYmdFromIso(r.timestampIso);
  return "—";
}

function nums(
  dayRows: WeatherHistoryRow[],
  pick: (r: WeatherHistoryRow) => string | undefined
): number[] {
  return dayRows
    .map((r) => firstNumber(pick(r) ?? ""))
    .filter((n): n is number => n != null);
}

function triple(values: number[], fmt: (n: number) => string): TripleStat {
  if (values.length === 0) return { high: "—", avg: "—", low: "—" };
  const high = Math.max(...values);
  const low = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { high: fmt(high), avg: fmt(avg), low: fmt(low) };
}

function precipDaySumMm(dayRows: WeatherHistoryRow[]): number {
  const sorted = sortOldestFirst(dayRows);
  const totals = sorted
    .map((r) => firstNumber(r.precipTotal ?? ""))
    .filter((n): n is number => n != null);
  if (totals.length === 0) return 0;
  const mx = Math.max(...totals);
  const mn = Math.min(...totals);
  if (totals.length === 1) return Math.max(0, mx);
  let sumInc = 0;
  for (let i = 1; i < totals.length; i++) {
    const d = totals[i] - totals[i - 1];
    if (d > 0) sumInc += d;
  }
  const range = mx - mn;
  if (sumInc > 0.0001) return Math.max(0, sumInc);
  return Math.max(0, range);
}

function formatDateMDY(dateKey: string): string {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateKey;
  return `${Number(m[2])}/${Number(m[3])}/${Number(m[1])}`;
}

export function aggregateDailyStats(rows: WeatherHistoryRow[]): DailyAggregateRow[] {
  const byDate = new Map<string, WeatherHistoryRow[]>();
  for (const r of rows) {
    const d = observationDateKey(r);
    if (d === "—") continue;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(r);
  }

  const keys = Array.from(byDate.keys()).sort();
  const out: DailyAggregateRow[] = [];

  for (const dateKey of keys) {
    const dayRows = byDate.get(dateKey)!;
    const tVals = nums(dayRows, (r) => r.temperature);
    const dVals = nums(dayRows, (r) => r.dewPoint);
    const hVals = nums(dayRows, (r) => r.humidity);
    const sVals = nums(dayRows, (r) => r.speed);
    const pVals = nums(dayRows, (r) => r.pressure);

    let pHigh = "—";
    let pLow = "—";
    if (pVals.length > 0) {
      pHigh = Math.max(...pVals).toFixed(2);
      pLow = Math.min(...pVals).toFixed(2);
    }

    out.push({
      dateKey,
      dateLabel: formatDateMDY(dateKey),
      temperature: triple(tVals, (n) => n.toFixed(1)),
      dewPoint: triple(dVals, (n) => n.toFixed(1)),
      humidity: triple(hVals, (n) => String(Math.round(n))),
      speed: triple(sVals, (n) => n.toFixed(1)),
      pressure: { high: pHigh, low: pLow },
      precipSum: precipDaySumMm(dayRows).toFixed(2),
    });
  }

  return out;
}

export function formatNumericCell(
  value: string | undefined,
  opts?: { decimals?: number; integer?: boolean; fallback?: string }
): string {
  const n = firstNumber(value ?? "");
  const fallback = opts?.fallback ?? "—";
  if (n == null) return fallback;
  if (opts?.integer) return String(Math.round(n));
  return n.toFixed(opts?.decimals ?? 1);
}

export function observationTimeLabel(r: WeatherHistoryRow): string {
  const tl = r.timeLocal?.trim();
  if (tl) {
    if (/^\d{1,2}:\d{2}\s*(AM|PM)/i.test(tl)) return tl;
    const embedded = tl.match(/(?:^|[\sT])(\d{1,2}):(\d{2})/);
    if (embedded) {
      const h = parseInt(embedded[1], 10);
      const min = embedded[2];
      const ap = h >= 12 ? "PM" : "AM";
      return `${h % 12 || 12}:${min} ${ap}`;
    }
  }
  if (r.timestampIso) {
    return new Date(r.timestampIso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Karachi",
    });
  }
  return "—";
}
