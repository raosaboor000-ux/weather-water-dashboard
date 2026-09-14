"use client";

import { useMemo } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { C } from "@/lib/chart-theme";
import {
  RISK_TIER_META,
  RISK_YEARS,
  annualMaxDailySeries,
  annualTotalPoints,
  builtUpPctPoints,
  catchmentsByAnnualRainDesc,
  catchmentsByMaxDailyDesc,
  catchmentsByScoreDesc,
  growthCardStats,
  type CatchmentProfile,
} from "@/lib/risk-profile-data";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function HorizontalRankBars({
  title,
  items,
  valueKey,
  unit = "",
  color = "#0ea5e9",
}: {
  title: string;
  items: CatchmentProfile[];
  valueKey: (c: CatchmentProfile) => number;
  unit?: string;
  color?: string;
}) {
  const data = useMemo(
    () => ({
      labels: items.map((c) => c.shortName),
      datasets: [
        {
          data: items.map(valueKey),
          backgroundColor: color,
          borderRadius: 6,
          barThickness: 14,
        },
      ],
    }),
    [items, valueKey, color]
  );

  const options = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: { raw: unknown }) =>
              `${Number(ctx.raw).toLocaleString()}${unit}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: C.grid },
          ticks: { color: C.tick },
        },
        y: {
          grid: { display: false },
          ticks: { color: C.tick, font: { size: 11 } },
        },
      },
    }),
    [unit]
  );

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">{title}</p>
      <ChartPanel className="h-[260px]" clip={false}>
        <Bar data={data} options={options} />
      </ChartPanel>
    </div>
  );
}

export function RainfallRankCharts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <HorizontalRankBars
        title="Average annual rainfall (mm)"
        items={catchmentsByAnnualRainDesc()}
        valueKey={(c) => c.rainfall.avgAnnualMm}
        unit=" mm"
      />
      <HorizontalRankBars
        title="Average of each year’s max-daily rainfall (mm)"
        items={catchmentsByMaxDailyDesc()}
        valueKey={(c) => c.rainfall.avgAnnualMaxDailyMm}
        unit=" mm"
        color="#0284c7"
      />
    </div>
  );
}

export function RiskScoreBars() {
  const items = catchmentsByScoreDesc();
  const data = useMemo(
    () => ({
      labels: items.map((c, i) => `#${i + 1} ${c.shortName}`),
      datasets: [
        {
          data: items.map((c) => c.score),
          backgroundColor: items.map((c) => RISK_TIER_META[c.tier].bar),
          borderRadius: 6,
          barThickness: 18,
        },
      ],
    }),
    [items]
  );

  const options = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: { dataIndex: number; raw: unknown }) => {
              const c = items[ctx.dataIndex];
              return `${Number(ctx.raw)} — ${RISK_TIER_META[c.tier].label}`;
            },
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: C.grid },
          ticks: { color: C.tick },
        },
        y: {
          grid: { display: false },
          ticks: { color: C.tick, font: { size: 11 } },
        },
      },
    }),
    [items]
  );

  return (
    <ChartPanel className="h-[320px]" clip={false}>
      <Bar data={data} options={options} />
    </ChartPanel>
  );
}

export function AnnualMaxHeatmap({ catchments }: { catchments: CatchmentProfile[] }) {
  const matrix = useMemo(
    () => catchments.map((c) => annualMaxDailySeries(c)),
    [catchments]
  );
  const min = 23;
  const max = 158;

  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-sm font-semibold text-ink">
        Annual max-daily rainfall by catchment &amp; year (mm)
      </p>
      <p className="mb-3 text-xs text-ink-muted">
        Each cell is the single wettest day that year. 2021 is the regional peak
        event across most catchments.
      </p>
      <div className="inline-block min-w-full rounded-xl border border-slate-200 bg-white p-3">
        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: `7.5rem repeat(${RISK_YEARS.length}, minmax(14px, 1fr))`,
          }}
        >
          <div />
          {RISK_YEARS.map((y) => (
            <div
              key={y}
              className="pb-1 text-center text-[9px] text-slate-400"
              style={{
                writingMode: y % 5 === 0 ? "horizontal-tb" : "horizontal-tb",
              }}
            >
              {y % 5 === 0 || y === 2021 ? String(y).slice(2) : ""}
            </div>
          ))}
          {catchments.map((c, row) => (
            <div key={c.id} className="contents">
              <div className="flex items-center pr-2 text-[11px] font-medium text-slate-700">
                {c.shortName}
              </div>
              {matrix[row].map((v, i) => {
                const t = (v - min) / (max - min);
                const bg = `rgba(14, 165, 233, ${0.15 + t * 0.85})`;
                return (
                  <div
                    key={`${c.id}-${RISK_YEARS[i]}`}
                    title={`${c.name} ${RISK_YEARS[i]}: ${v} mm`}
                    className="aspect-square rounded-[2px]"
                    style={{ backgroundColor: bg }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
          <span>{min} mm</span>
          <div className="h-2 flex-1 rounded-full bg-gradient-to-r from-sky-100 to-sky-600" />
          <span>{max} mm</span>
        </div>
      </div>
    </div>
  );
}

export function AnnualTotalSparklines({
  catchments,
}: {
  catchments: CatchmentProfile[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">
        Annual total rainfall by catchment (mm/yr)
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...catchments]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => {
            const points = annualTotalPoints(c);
            return (
              <div
                key={c.id}
                className="rounded-[10px] border border-slate-200/80 bg-white px-3.5 pb-2.5 pt-3 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-ink">{c.name}</p>
                  <p className="text-[11px] font-medium tabular-nums text-ink-muted">
                    {c.rainfall.avgAnnualMm} mm avg
                  </p>
                </div>
                <MiniAreaChart
                  points={points}
                  color="#2a78d6"
                  className="mt-1.5"
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function BuiltUpSparklines({
  catchments,
}: {
  catchments: CatchmentProfile[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">
        Built-up surface trend by catchment (% of catchment area)
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...catchments]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => {
            const points = builtUpPctPoints(c);
            const stats = growthCardStats(c);
            return (
              <div
                key={c.id}
                className="rounded-[10px] border border-slate-200/80 bg-white px-3.5 pb-2.5 pt-3 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-ink">{c.name}</p>
                  <p className="text-[11px] font-medium tabular-nums text-ink-muted">
                    +{stats.growthPp.toFixed(1)} pp
                  </p>
                </div>
                <MiniAreaChart
                  points={points}
                  color="#eb6834"
                  className="mt-1.5"
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}

/** HTML-artifact `miniArea` sparkline: area fill, mean dashed line, endpoint. */
function MiniAreaChart({
  points,
  color,
  className = "",
}: {
  points: { year: number; value: number }[];
  color: string;
  className?: string;
}) {
  if (points.length < 2) return null;

  const w = 220;
  const h = 74;
  const padL = 6;
  const padR = 6;
  const padT = 8;
  const padB = 16;
  const xs = points.map((d) => d.year);
  const ys = points.map((d) => d.value);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = 0;
  const maxY = Math.max(...ys) * 1.15 || 1;
  const X = (x: number) =>
    padL + ((w - padL - padR) * (x - minX)) / (maxX - minX || 1);
  const Y = (y: number) =>
    h - padB - ((h - padT - padB) * (y - minY)) / (maxY - minY || 1);
  const avg = ys.reduce((a, b) => a + b, 0) / ys.length;
  const linePath = points
    .map((d, i) => `${i === 0 ? "M" : "L"} ${X(d.year)} ${Y(d.value)}`)
    .join(" ");
  const last = points[points.length - 1];
  const areaPath = `${linePath} L ${X(last.year)} ${Y(minY)} L ${X(points[0].year)} ${Y(minY)} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`block h-auto w-full ${className}`}
      role="img"
      aria-hidden
    >
      <line
        x1={padL}
        y1={h - padB}
        x2={w - padR}
        y2={h - padB}
        stroke="#e2e8f0"
        strokeWidth={1}
      />
      <line
        x1={padL}
        y1={Y(avg)}
        x2={w - padR}
        y2={Y(avg)}
        stroke="#94a3b8"
        strokeWidth={1}
        strokeDasharray="2,3"
      />
      <path d={areaPath} fill={color} opacity={0.12} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={X(last.year)}
        cy={Y(last.value)}
        r={4}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
      />
    </svg>
  );
}
