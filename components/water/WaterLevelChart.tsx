"use client";

import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import type { DamMetadata, DamReading } from "@/lib/dams-types";
import { fillPct } from "@/lib/dams-status";
import { formatDamDateLabel } from "@/lib/dams-format";
import {
  C,
  waterDualAxisChartOptions,
  weatherLineChartOptions,
} from "@/lib/chart-theme";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { DamSelect } from "@/components/water/DamSelect";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

type ChartMode = "water" | "rain";

type Props = {
  damNames: string[];
  location: string;
  onLocationChange: (name: string) => void;
  readings: DamReading[];
  damMeta?: DamMetadata;
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
  from,
  to,
  onFromChange,
  onToChange,
  minDate,
  maxDate,
}: Props) {
  const [mode, setMode] = useState<ChartMode>("water");

  const waterChart = useMemo(() => {
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

  const rainChart = useMemo(() => {
    const labels = readings.map((r) => formatDamDateLabel(r.date));
    const rain = readings.map((r) => r.rainMm ?? null);
    return {
      labels,
      datasets: [
        {
          label: "Rain (mm)",
          data: rain,
          borderColor: C.sky,
          backgroundColor: "rgba(14, 165, 233, 0.12)",
          fill: true,
          tension: 0.3,
          spanGaps: true,
        },
      ],
    };
  }, [readings]);

  const hasRainValues = readings.some((r) => r.rainMm != null);

  const rainOptions = useMemo(() => {
    const base = weatherLineChartOptions({
      legendPosition: "top",
      axisPadding: true,
      stackedTicks: true,
    });
    return {
      ...base,
      scales: {
        ...base.scales,
        y: {
          ...base.scales?.y,
          beginAtZero: true,
          title: {
            display: true,
            text: "Rain (mm)",
            color: C.tick,
            font: { size: 12, weight: 500 as const },
          },
        },
      },
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins?.tooltip,
          callbacks: {
            label: (ctx: {
              parsed: { y: number | null };
              dataset: { label?: string };
            }) => {
              const v = ctx.parsed.y;
              const name = ctx.dataset.label ?? "Rain";
              if (v == null || Number.isNaN(v)) return `${name}: —`;
              return `${name}: ${Number(v).toFixed(1)} mm`;
            },
          },
        },
      },
    };
  }, []);

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink">
        {mode === "water"
          ? "Water level & storage trends"
          : "Dam rainfall trends"}
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
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-subtle">
          Chart
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ChartMode)}
            className="min-w-[14rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-ink shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            <option value="water">Water level &amp; storage trends</option>
            <option value="rain">Rain</option>
          </select>
        </label>
      </div>

      <ChartPanel clip={false} className="h-[360px]">
        <div className="h-full min-h-[320px]">
          {readings.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-ink-subtle">
              No readings in this range.
            </p>
          ) : mode === "water" ? (
            <Line
              data={waterChart}
              options={waterDualAxisChartOptions({ axisPadding: true })}
            />
          ) : !hasRainValues ? (
            <p className="flex h-full items-center justify-center px-4 text-center text-sm text-ink-subtle">
              No rain values for this dam in the selected range. Add values in the{" "}
              <strong className="mx-1 font-semibold text-ink">
                Rain Gauge (mm)
              </strong>{" "}
              column of the dams Google Sheet.
            </p>
          ) : (
            <Line data={rainChart} options={rainOptions} />
          )}
        </div>
      </ChartPanel>
    </div>
  );
}
