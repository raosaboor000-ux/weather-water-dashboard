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
import type { DamMetadata, DamReading } from "@/lib/dams-types";
import { fillPct, trendLabel } from "@/lib/dams-status";
import type { TrendDirection } from "@/lib/dams-types";
import { formatDamDateLabel } from "@/lib/dams-format";
import { C, waterDualAxisChartOptions } from "@/lib/chart-theme";
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
  damMeta?: DamMetadata;
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
  damMeta,
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
    const capacities = readings.map((r) => {
      const pct = fillPct(r.waterLevelFt, damMeta?.dslFt, damMeta?.nplFt);
      return pct ?? null;
    });

    return {
      labels,
      datasets: [
        {
          label: "Water level (ft)",
          data: levels,
          yAxisID: "y",
          borderColor: C.sky,
          backgroundColor: "rgba(14, 165, 233, 0.12)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Capacity (%)",
          data: capacities,
          yAxisID: "y1",
          borderColor: C.violet,
          backgroundColor: "rgba(139, 92, 246, 0.08)",
          fill: false,
          tension: 0.3,
          spanGaps: true,
        },
      ],
    };
  }, [readings, damMeta]);

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink">
        Water level &amp; storage trends
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

      <ChartPanel clip={false} className="h-[360px]">
        <div className="h-full min-h-[320px]">
          {readings.length > 0 ? (
            <Line
              data={chart}
              options={waterDualAxisChartOptions({ axisPadding: true })}
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
