"use client";

import { formatDamDateLabel } from "@/lib/dams-format";

type Props = {
  dates: string[];
  selectedDate: string;
  onDateChange: (ymd: string) => void;
  latestOnly: boolean;
  onLatestOnlyChange: (v: boolean) => void;
};

export function WaterControls({
  dates,
  selectedDate,
  onDateChange,
  latestOnly,
  onLatestOnlyChange,
}: Props) {
  const maxDate = dates[dates.length - 1] ?? "";

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-subtle">
          Date
          <input
            type="date"
            value={selectedDate}
            min={dates[0]}
            max={maxDate}
            disabled={latestOnly}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-[11rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        <label className="flex cursor-pointer items-center gap-2 pb-1.5 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={latestOnly}
            onChange={(e) => onLatestOnlyChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
          />
          Quick: only latest date for each dam
        </label>
      </div>

      {(latestOnly || selectedDate) && (
        <p className="mt-2 text-xs text-ink-faint">
          {latestOnly
            ? "Each dam shows its own most recent reading (dates may differ)."
            : `All dams on ${formatDamDateLabel(selectedDate)} (or last reading on/before that date).`}
        </p>
      )}
    </div>
  );
}
