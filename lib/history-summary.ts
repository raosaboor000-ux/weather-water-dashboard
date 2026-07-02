/**
 * High / low / average summary stats for a filtered history range.
 */

import type { WeatherHistoryRow } from "@/lib/types";
import { weatherDisplayUnits } from "@/lib/display-units";
import { firstNumber } from "@/lib/weather-parse";

export type StatTriple = { high: string; low: string; avg: string };

export type HistorySummary = {
  temperature: StatTriple;
  dewPoint: StatTriple;
  humidity: StatTriple;
  precipitation: StatTriple;
  windSpeed: StatTriple;
  windGust: StatTriple;
  windDirection: StatTriple;
  pressure: StatTriple;
  solar: StatTriple;
  uv: StatTriple;
};

const EMPTY: StatTriple = { high: "—", low: "—", avg: "—" };

export function emptyHistorySummary(): HistorySummary {
  return {
    temperature: EMPTY,
    dewPoint: EMPTY,
    humidity: EMPTY,
    precipitation: EMPTY,
    windSpeed: EMPTY,
    windGust: EMPTY,
    windDirection: EMPTY,
    pressure: EMPTY,
    solar: EMPTY,
    uv: EMPTY,
  };
}

function nums(
  rows: WeatherHistoryRow[],
  pick: (r: WeatherHistoryRow) => string | undefined
): number[] {
  return rows
    .map((r) => firstNumber(pick(r) ?? ""))
    .filter((n): n is number => n != null);
}

function triple(values: number[], decimals = 1, suffix = ""): StatTriple {
  if (values.length === 0) return EMPTY;
  const high = Math.max(...values);
  const low = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const fmt = (n: number) =>
    suffix ? `${n.toFixed(decimals)} ${suffix}`.trim() : n.toFixed(decimals);
  return { high: fmt(high), low: fmt(low), avg: fmt(avg) };
}

function pressureTriple(values: number[], symbol: string): StatTriple {
  if (values.length === 0) return EMPTY;
  const high = Math.max(...values);
  const low = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const f = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ` ${symbol}`;
  return { high: f(high), low: f(low), avg: f(avg) };
}

export function summarizeHistory(rows: WeatherHistoryRow[]): HistorySummary {
  if (rows.length === 0) return emptyHistorySummary();

  const units = weatherDisplayUnits();
  const precipTotals = nums(rows, (r) => r.precipTotal);
  const precipRates = nums(rows, (r) => r.precipRate);
  const precipVals = precipTotals.length > 0 ? precipTotals : precipRates;

  const lastWind = rows[rows.length - 1]?.wind?.trim() || "—";

  return {
    temperature: triple(nums(rows, (r) => r.temperature), 1, units.tempSymbol),
    dewPoint: triple(nums(rows, (r) => r.dewPoint), 1, units.tempSymbol),
    humidity: triple(nums(rows, (r) => r.humidity), 0, "%"),
    precipitation: triple(precipVals, 2, units.precipSymbol),
    windSpeed: triple(nums(rows, (r) => r.speed), 1, units.windSymbol),
    windGust: triple(nums(rows, (r) => r.gust), 1, units.windSymbol),
    windDirection: { high: "—", low: "—", avg: lastWind },
    pressure: pressureTriple(nums(rows, (r) => r.pressure), units.pressureSymbol),
    solar: triple(nums(rows, (r) => r.solar), 1, units.solarSymbol),
    uv: triple(nums(rows, (r) => r.uv), 0, ""),
  };
}
