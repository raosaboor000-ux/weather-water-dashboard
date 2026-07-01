"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { DamSnapshot } from "@/lib/dams-types";
import {
  calculatedStorageAft,
  capacityBandColor,
  displayStatusLabel,
  matchesTableFilter,
  snapshotCapacityBand,
  spillStatusLabel,
  trendLabel,
  type TableStatusFilter,
} from "@/lib/dams-status";
import { downloadCsv, snapshotsToCsv } from "@/lib/dams-export";
import { formatDamDateLabel } from "@/lib/dams-format";

type Props = {
  snapshots: DamSnapshot[];
};

const FILTERS: { id: TableStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "spilling", label: "Spilling" },
  { id: "spill_watch", label: "Spill watch" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
  { id: "very_low", label: "Very low" },
  { id: "below_dead", label: "Below DSL" },
];

function StatusPill({ snapshot }: { snapshot: DamSnapshot }) {
  const band = snapshotCapacityBand(snapshot);
  const color =
    snapshot.spillStatus !== "none"
      ? "#3b82f6"
      : capacityBandColor(band);

  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {displayStatusLabel(snapshot)}
    </span>
  );
}

export function WaterDataTable({ snapshots }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TableStatusFilter>("all");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return snapshots.filter((s) => {
      if (!matchesTableFilter(s, statusFilter)) return false;
      if (!q) return true;
      return s.location.toLowerCase().includes(q);
    });
  }, [snapshots, search, statusFilter]);

  const onExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`dam-water-levels-${stamp}.csv`, snapshotsToCsv(rows));
  };

  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            Dams status table
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            Latest record per selection · filter by storage or spill status
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

      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatusFilter(id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter === id
                ? "bg-brand-primary text-white shadow-sm"
                : "border border-slate-200 bg-white text-ink-muted hover:border-brand-primary/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-ink-subtle">
            <tr>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Water level (ft)</th>
              <th className="px-3 py-2">DSL (ft)</th>
              <th className="px-3 py-2">NPL (ft)</th>
              <th className="px-3 py-2">Capacity %</th>
              <th className="px-3 py-2">Calc. storage (Aft)</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Spill</th>
              <th className="px-3 py-2">7-day trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const storageAft = calculatedStorageAft(
                s.liveStorageAft,
                s.fillPct
              );
              return (
                <tr
                  key={`${s.location}-${s.date}`}
                  className="border-t border-slate-100 even:bg-slate-50/50"
                >
                  <td className="px-3 py-2 font-medium text-ink">
                    {s.location}
                    <span className="mt-0.5 block font-mono text-[10px] font-normal text-ink-muted">
                      {formatDamDateLabel(s.date)}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {s.waterLevelFt.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-ink-muted">
                    {s.dslFt?.toFixed(1) ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-ink-muted">
                    {s.nplFt?.toFixed(1) ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {s.fillPct != null ? `${s.fillPct.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {storageAft != null
                      ? storageAft.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill snapshot={s} />
                  </td>
                  <td className="px-3 py-2 text-ink-muted">
                    {s.spillStatus !== "none"
                      ? spillStatusLabel(s.spillStatus)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{trendLabel(s.trend7d)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-subtle">
            No dams match your filters.
          </p>
        )}
      </div>
    </div>
  );
}
