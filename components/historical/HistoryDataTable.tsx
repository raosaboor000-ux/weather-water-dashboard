"use client";

import { useMemo } from "react";
import type { HistoryMode } from "@/lib/history-utils";
import {
  aggregateDailyStats,
  formatNumericCell,
  observationTimeLabel,
  type DailyAggregateRow,
} from "@/lib/history-aggregate";
import type { WeatherHistoryRow } from "@/lib/types";
import { sortOldestFirst } from "@/lib/history-utils";

type Props = {
  mode: HistoryMode;
  rows: WeatherHistoryRow[];
};

function StatCell({ value }: { value: string }) {
  return (
    <td className="px-2 py-1.5 text-sm tabular-nums text-ink">{value}</td>
  );
}

export function HistoryDataTable({ mode, rows }: Props) {
  const dailyRows = useMemo(() => sortOldestFirst(rows), [rows]);
  const aggregateRows = useMemo(() => aggregateDailyStats(rows), [rows]);

  if (mode === "daily") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-ink-muted">
          Full station calendar day — chronological, oldest to newest.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-ink-subtle">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Temp (°C)</th>
                <th className="px-3 py-2">Dew (°C)</th>
                <th className="px-3 py-2">Humidity (%)</th>
                <th className="px-3 py-2">Wind</th>
                <th className="px-3 py-2">Speed (km/h)</th>
                <th className="px-3 py-2">Gust (km/h)</th>
                <th className="px-3 py-2">Pressure (hPa)</th>
                <th className="px-3 py-2">Precip. rate (mm)</th>
                <th className="px-3 py-2">Precip. accum. (mm)</th>
                <th className="px-3 py-2">UV</th>
                <th className="px-3 py-2">Solar (W/m²)</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.map((r, idx) => (
                <tr
                  key={`${r.timestampIso}-${idx}`}
                  className="border-t border-slate-100 even:bg-slate-50/50"
                >
                  <td className="px-3 py-1.5 font-mono text-xs">
                    {observationTimeLabel(r)}
                  </td>
                  <StatCell value={formatNumericCell(r.temperature, { decimals: 1 })} />
                  <StatCell value={formatNumericCell(r.dewPoint, { decimals: 1 })} />
                  <StatCell value={formatNumericCell(r.humidity, { integer: true })} />
                  <td className="px-3 py-1.5">{r.wind}</td>
                  <StatCell value={formatNumericCell(r.speed, { decimals: 1 })} />
                  <StatCell value={formatNumericCell(r.gust, { decimals: 1 })} />
                  <StatCell
                    value={formatNumericCell(r.pressure, { decimals: 2, fallback: "—" })}
                  />
                  <StatCell
                    value={formatNumericCell(r.precipRate, {
                      decimals: 2,
                      fallback: "0.00",
                    })}
                  />
                  <StatCell
                    value={formatNumericCell(r.precipTotal, {
                      decimals: 2,
                      fallback: "0.00",
                    })}
                  />
                  <StatCell
                    value={formatNumericCell(r.uv, { integer: true, fallback: "0" })}
                  />
                  <StatCell
                    value={formatNumericCell(r.solar, { decimals: 1, fallback: "0.0" })}
                  />
                </tr>
              ))}
            </tbody>
          </table>
          {dailyRows.length === 0 && (
            <p className="p-6 text-center text-sm text-ink-subtle">
              No rows in this range.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <AggregateTable rows={aggregateRows} />
  );
}

function AggregateTable({ rows }: { rows: DailyAggregateRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="min-w-[1000px] w-full text-sm">
        <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-ink">
          <tr>
            <th className="px-2 py-2" rowSpan={2}>Date</th>
            <th className="border-l border-slate-200 px-2 py-2 text-center" colSpan={3}>Temperature (°C)</th>
            <th className="border-l border-slate-200 px-2 py-2 text-center" colSpan={3}>Dew Point (°C)</th>
            <th className="border-l border-slate-200 px-2 py-2 text-center" colSpan={3}>Humidity (%)</th>
            <th className="border-l border-slate-200 px-2 py-2 text-center" colSpan={3}>Speed (km/h)</th>
            <th className="border-l border-slate-200 px-2 py-2 text-center" colSpan={2}>Pressure (hPa)</th>
            <th className="border-l border-slate-200 px-2 py-2 text-center">Precip. (mm)</th>
          </tr>
          <tr>
            <th className="border-l border-slate-200 px-2 py-1 text-center font-normal">High</th>
            <th className="px-2 py-1 text-center font-normal">Avg</th>
            <th className="px-2 py-1 text-center font-normal">Low</th>
            <th className="border-l border-slate-200 px-2 py-1 text-center font-normal">High</th>
            <th className="px-2 py-1 text-center font-normal">Avg</th>
            <th className="px-2 py-1 text-center font-normal">Low</th>
            <th className="border-l border-slate-200 px-2 py-1 text-center font-normal">High</th>
            <th className="px-2 py-1 text-center font-normal">Avg</th>
            <th className="px-2 py-1 text-center font-normal">Low</th>
            <th className="border-l border-slate-200 px-2 py-1 text-center font-normal">High</th>
            <th className="px-2 py-1 text-center font-normal">Avg</th>
            <th className="px-2 py-1 text-center font-normal">Low</th>
            <th className="border-l border-slate-200 px-2 py-1 text-center font-normal">High</th>
            <th className="px-2 py-1 text-center font-normal">Low</th>
            <th className="border-l border-slate-200 px-2 py-1 text-center font-normal">Sum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.dateKey} className="border-t border-slate-100 even:bg-slate-50/50">
              <td className="whitespace-nowrap px-2 py-1.5 font-mono text-xs">
                {r.dateLabel}
              </td>
              <StatCell value={r.temperature.high} />
              <StatCell value={r.temperature.avg} />
              <StatCell value={r.temperature.low} />
              <StatCell value={r.dewPoint.high} />
              <StatCell value={r.dewPoint.avg} />
              <StatCell value={r.dewPoint.low} />
              <StatCell value={r.humidity.high} />
              <StatCell value={r.humidity.avg} />
              <StatCell value={r.humidity.low} />
              <StatCell value={r.speed.high} />
              <StatCell value={r.speed.avg} />
              <StatCell value={r.speed.low} />
              <StatCell value={r.pressure.high} />
              <StatCell value={r.pressure.low} />
              <StatCell value={r.precipSum} />
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="p-6 text-center text-sm text-ink-subtle">No rows in this range.</p>
      )}
    </div>
  );
}
