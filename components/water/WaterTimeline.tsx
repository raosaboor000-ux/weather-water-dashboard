"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatDamDateLabel } from "@/lib/dams-format";

type Props = {
  dates: string[];
  selectedDate: string;
  onDateChange: (ymd: string) => void;
  disabled?: boolean;
};

export function WaterTimeline({
  dates,
  selectedDate,
  onDateChange,
  disabled = false,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const index = Math.max(0, dates.indexOf(selectedDate));
  const min = 0;
  const max = Math.max(0, dates.length - 1);

  useEffect(() => {
    if (!playing || disabled || dates.length < 2) return;

    timerRef.current = setInterval(() => {
      const currentIdx = dates.indexOf(selectedDate);
      const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % dates.length;
      onDateChange(dates[nextIdx]!);
    }, 1200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, disabled, dates, selectedDate, onDateChange]);

  if (dates.length < 2) return null;

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Timeline
          </p>
          <p className="mt-0.5 text-sm font-medium text-ink">
            {selectedDate ? formatDamDateLabel(selectedDate) : "—"}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-50"
        >
          {playing ? (
            <>
              <Pause className="h-4 w-4" aria-hidden />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden />
              Auto-play
            </>
          )}
        </button>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={index}
        disabled={disabled}
        onChange={(e) => {
          setPlaying(false);
          onDateChange(dates[Number(e.target.value)]!);
        }}
        className="h-2 w-full cursor-pointer accent-brand-primary disabled:opacity-50"
        aria-label="Timeline scrubber"
      />
      <div className="mt-2 flex justify-between text-[10px] text-ink-faint">
        <span>{formatDamDateLabel(dates[0]!)}</span>
        <span>{formatDamDateLabel(dates[dates.length - 1]!)}</span>
      </div>
    </div>
  );
}
