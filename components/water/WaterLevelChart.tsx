"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import type { DamReading } from "@/lib/dams-types";
import { trendLabel } from "@/lib/dams-status";
import type { TrendDirection } from "@/lib/dams-types";
import { formatDamDateLabel } from "@/lib/dams-format";
import { C, weatherLineChartOptions } from "@/lib/chart-theme";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { DamSelect } from "@/components/water/DamSelect";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

type Props = {
  damNames: string[];
  location: string;
  onLocationChange: (name: string) => void;
  readings: DamReading[];
  trend?: TrendDirection;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  minDate: string;
  maxDate: string;
};

export function WaterLevelChart({
  damNames,
  location,
  onLocationChange,
  readings,
  trend,
  from,
  to,
  onFromChange,
  onToChange,
  minDate,
  maxDate,
}: Props) {
  const chart = useMemo(() => {
    const labels = readings.map((r) => formatDamDateLabel(r.date));
    const levels = readings.map((r) => r.waterLevelFt);
    return {
      labels,
      datasets: [
        {
          label: "Water level (ft)",
          data: levels,
          borderColor: C.sky,
          backgroundColor: "rgba(14, 165, 233, 0.12)",
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [readings]);

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink">
        Water level trend (custom range)
      </h2>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <DamSelect
          label="Dam"
          value={location}
          options={damNames}
          onChange={onLocationChange}
        />
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-subtle">
          From
          <input
            type="date"
            value={from}
            min={minDate}
            max={to}
            onChange={(e) => onFromChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-subtle">
          To
          <input
            type="date"
            value={to}
            min={from}
            max={maxDate}
            onChange={(e) => onToChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>
        {trend && (
          <p className="pb-1.5 text-sm text-ink-muted">
            Trend over selected range: {trendLabel(trend)}
          </p>
        )}
      </div>

      <ChartPanel clip={false} className="h-[340px]">
        <div className="h-full min-h-[300px]">
          {readings.length > 0 ? (
            <Line
              data={chart}
              options={weatherLineChartOptions({
                legendPosition: "top",
                axisPadding: true,
              })}
            />
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-ink-subtle">
              No readings in this range.
            </p>
          )}
        </div>
      </ChartPanel>
    </div>
  );
}
