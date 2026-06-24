"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { DamSnapshot } from "@/lib/dams-types";
import {
  spillStatusLabel,
  storageStatusLabel,
  trendLabel,
} from "@/lib/dams-status";
import { downloadCsv, snapshotsToCsv } from "@/lib/dams-export";
import { formatDamDateLabel } from "@/lib/dams-format";

type Props = {
  snapshots: DamSnapshot[];
};

export function WaterDataTable({ snapshots }: Props) {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return snapshots;
    return snapshots.filter((s) => s.location.toLowerCase().includes(q));
  }, [snapshots, search]);

  const onExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`dam-water-levels-${stamp}.csv`, snapshotsToCsv(rows));
  };

  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Data</h2>
          <p className="mt-1 text-xs text-ink-faint">
            Trend (in the table) is based on the last 7 days of water levels for
            each dam.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-subtle">
            Search dams
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type dam name…"
              className="w-44 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <button
            type="button"
            onClick={onExport}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-muted shadow-sm transition hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-ink-subtle">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Dam</th>
              <th className="px-3 py-2">Level (ft)</th>
              <th className="px-3 py-2">Fill %</th>
              <th className="px-3 py-2">Storage</th>
              <th className="px-3 py-2">Spill</th>
              <th className="px-3 py-2">7-day trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={`${s.location}-${s.date}`}
                className="border-t border-slate-100 even:bg-slate-50/50"
              >
                <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                  {formatDamDateLabel(s.date)}
                </td>
                <td className="px-3 py-2 font-medium text-ink">{s.location}</td>
                <td className="px-3 py-2 tabular-nums">
                  {s.waterLevelFt.toFixed(1)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {s.fillPct != null ? `${s.fillPct.toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-2">
                  {storageStatusLabel(s.storageStatus)}
                </td>
                <td className="px-3 py-2">
                  {s.spillStatus !== "none"
                    ? spillStatusLabel(s.spillStatus)
                    : "—"}
                </td>
                <td className="px-3 py-2">{trendLabel(s.trend7d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-subtle">
            No dams match your search.
          </p>
        )}
      </div>
    </div>
  );
}
