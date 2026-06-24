"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Legend,
  Tooltip,
  Filler,
  Decimation,
} from "chart.js";
import type { Chart, ScriptableContext } from "chart.js";
import { Line } from "react-chartjs-2";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { C, skyVerticalGradient, weatherLineChartOptions } from "@/lib/chart-theme";
import type { ChartSeries } from "@/lib/history-utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Legend,
  Tooltip,
  Filler,
  Decimation
);

function grad(top: string, bottom: string) {
  return (c: ScriptableContext<"line">) =>
    skyVerticalGradient(c.chart as Chart, top, bottom);
}

type Props = {
  series: ChartSeries;
  mode: "daily" | "weekly" | "monthly";
};

export function WeatherCharts({ series, mode }: Props) {
  const stackedOpts = useMemo(
    () => weatherLineChartOptions({ legendPosition: "right", stackedTicks: true }),
    []
  );

  const windDirOpts = useMemo(() => {
    const base = weatherLineChartOptions({ legendPosition: "right", stackedTicks: true });
    return {
      ...base,
      scales: {
        x: base.scales?.x,
        y: {
          min: 0,
          max: 360,
          grid: { color: C.grid },
          ticks: {
            stepSize: 90,
            color: C.tick,
            font: { size: 12 },
            callback: (v: string | number) => {
              const n = Number(v);
              if (n === 0 || n === 360) return "N";
              if (n === 90) return "E";
              if (n === 180) return "S";
              if (n === 270) return "W";
              return String(v);
            },
          },
          border: { display: false },
        },
      },
    };
  }, []);

  const height = mode === "daily" ? "h-[240px]" : "h-[210px]";

  if (series.labels.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-ink-subtle">
        No observations in this period.
      </p>
    );
  }

  const charts = [
    {
      title: "Temperature & Dew Point",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Temperature (°C)",
            data: series.temp,
            borderColor: C.sky,
            backgroundColor: grad("rgba(14, 165, 233, 0.35)", "rgba(240, 249, 255, 0.02)"),
            fill: true,
          },
          {
            label: "Dew Point (°C)",
            data: series.dew,
            borderColor: C.teal,
            backgroundColor: grad("rgba(20, 184, 166, 0.3)", "rgba(240, 249, 255, 0.02)"),
            fill: true,
          },
        ],
      },
      options: stackedOpts,
    },
    {
      title: "Humidity",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Humidity (%)",
            data: series.humidity,
            borderColor: C.cyan,
            backgroundColor: grad("rgba(6, 182, 212, 0.32)", "rgba(240, 249, 255, 0.02)"),
            fill: true,
          },
        ],
      },
      options: stackedOpts,
    },
    {
      title: "Wind Speed & Gust",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Wind speed (km/h)",
            data: series.wind,
            borderColor: C.sky,
            backgroundColor: grad("rgba(14, 165, 233, 0.28)", "rgba(240, 249, 255, 0.02)"),
            fill: true,
          },
          {
            label: "Wind gust (km/h)",
            data: series.gust,
            borderColor: C.amber,
            backgroundColor: "transparent",
            fill: false,
          },
        ],
      },
      options: stackedOpts,
    },
    {
      title: "Wind Direction",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Wind direction (°)",
            data: series.windDir,
            borderColor: "transparent",
            backgroundColor: C.amber,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: C.amber,
            showLine: false,
          },
        ],
      },
      options: windDirOpts,
    },
    {
      title: "Precipitation",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Precip. accum. (mm)",
            data: series.precipTotal,
            borderColor: C.sky,
            backgroundColor: grad("rgba(14, 165, 233, 0.28)", "rgba(240, 249, 255, 0.02)"),
            fill: true,
          },
          {
            label: "Precip. rate (mm)",
            data: series.precipRate,
            borderColor: C.teal,
            backgroundColor: "transparent",
            fill: false,
          },
        ],
      },
      options: stackedOpts,
    },
    {
      title: "Pressure",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Pressure (hPa)",
            data: series.pressure,
            borderColor: C.slate,
            backgroundColor: grad("rgba(100, 116, 139, 0.2)", "rgba(240, 249, 255, 0.02)"),
            fill: true,
          },
        ],
      },
      options: stackedOpts,
    },
    {
      title: "Solar Radiation",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Solar (W/m²)",
            data: series.solar,
            borderColor: C.amber,
            backgroundColor: grad("rgba(245, 158, 11, 0.35)", "rgba(240, 249, 255, 0.02)"),
            fill: true,
          },
        ],
      },
      options: stackedOpts,
    },
    {
      title: "UV Index",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "UV index",
            data: series.uv,
            borderColor: C.violet,
            backgroundColor: grad("rgba(139, 92, 246, 0.32)", "rgba(240, 249, 255, 0.02)"),
            fill: true,
          },
        ],
      },
      options: stackedOpts,
    },
  ];

  return (
    <div className="space-y-4">
      {charts.map((chart) => (
        <div key={chart.title}>
          <h3 className="mb-2 text-sm font-semibold text-ink-muted">{chart.title}</h3>
          <ChartPanel className={height}>
            <Line data={chart.data} options={chart.options} />
          </ChartPanel>
        </div>
      ))}
    </div>
  );
}
