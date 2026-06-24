"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HistoryMode } from "@/lib/history-utils";
import { addDaysToYmd, isHistoryAtPresent } from "@/lib/history-utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function parseYmd(ymd: string) {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

function formatYmd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

type Props = {
  mode: HistoryMode;
  onModeChange: (m: HistoryMode) => void;
  stationDayYmd: string;
  onStationDayYmdChange: (ymd: string) => void;
  anchor: Date;
  onAnchorChange: (d: Date) => void;
};

export function HistoryControls({
  mode,
  onModeChange,
  stationDayYmd,
  onStationDayYmdChange,
  anchor,
  onAnchorChange,
}: Props) {
  const shift = (delta: number) => {
    if (mode === "daily") {
      onStationDayYmdChange(addDaysToYmd(stationDayYmd, delta));
    } else {
      const n = new Date(anchor);
      n.setDate(n.getDate() + delta);
      onAnchorChange(n);
    }
  };

  const dayP = parseYmd(stationDayYmd);
  const nextDisabled = isHistoryAtPresent(mode, stationDayYmd, anchor);

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="rounded-xl border border-brand-primary/30 bg-brand-primary px-3 py-2 text-white shadow-md transition hover:brightness-110"
          aria-label="Previous period"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={nextDisabled}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-ink-muted shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
          aria-label="Next period"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-subtle">
          Mode
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as HistoryMode)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-ink shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-ink-subtle">
          Month
          <select
            value={mode === "daily" ? (dayP?.m ?? 0) : anchor.getMonth()}
            onChange={(e) => {
              const m = Number(e.target.value);
              if (mode === "daily" && dayP) {
                const maxD = daysInMonth(dayP.y, m);
                onStationDayYmdChange(formatYmd(dayP.y, m, Math.min(dayP.d, maxD)));
              } else {
                const y = anchor.getFullYear();
                const maxD = daysInMonth(y, m);
                onAnchorChange(new Date(y, m, Math.min(anchor.getDate(), maxD)));
              }
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {MONTHS.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-ink-subtle">
          Day
          <select
            value={mode === "daily" ? (dayP?.d ?? 1) : anchor.getDate()}
            onChange={(e) => {
              const d = Number(e.target.value);
              if (mode === "daily" && dayP) {
                onStationDayYmdChange(formatYmd(dayP.y, dayP.m, d));
              } else {
                onAnchorChange(
                  new Date(anchor.getFullYear(), anchor.getMonth(), d)
                );
              }
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {Array.from(
              {
                length: daysInMonth(
                  mode === "daily" ? (dayP?.y ?? 2026) : anchor.getFullYear(),
                  mode === "daily" ? (dayP?.m ?? 0) : anchor.getMonth()
                ),
              },
              (_, i) => i + 1
            ).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-ink-subtle">
          Year
          <select
            value={
              mode === "daily" ? (dayP?.y ?? new Date().getFullYear()) : anchor.getFullYear()
            }
            onChange={(e) => {
              const y = Number(e.target.value);
              if (mode === "daily" && dayP) {
                const maxD = daysInMonth(y, dayP.m);
                onStationDayYmdChange(formatYmd(y, dayP.m, Math.min(dayP.d, maxD)));
              } else {
                const m = anchor.getMonth();
                const maxD = daysInMonth(y, m);
                onAnchorChange(new Date(y, m, Math.min(anchor.getDate(), maxD)));
              }
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            )}
          </select>
        </label>
      </div>
    </div>
  );
}
