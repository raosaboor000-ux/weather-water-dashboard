import type { Chart, ChartOptions } from "chart.js";

/** Sky/slate palette — matches WeatherWaterDashboard branding. */
export const C = {
  sky: "#0ea5e9",
  cyan: "#06b6d4",
  teal: "#14b8a6",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  slate: "#64748b",
  grid: "rgba(14, 165, 233, 0.08)",
  tick: "#0f172a",
} as const;

export function skyVerticalGradient(
  chart: Chart,
  top: string,
  bottom: string
): CanvasGradient | string {
  const { ctx, chartArea } = chart;
  if (!chartArea) return bottom;
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

export function weatherLineChartOptions(
  opts: {
    legendPosition?: "top" | "right";
    stackedTicks?: boolean;
    /** Extra bottom/left room so y-axis labels are not clipped */
    axisPadding?: boolean;
  } = {}
): ChartOptions<"line"> {
  const legendPosition = opts.legendPosition ?? "right";
  const axisPadding = opts.axisPadding ?? false;
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: axisPadding
      ? { padding: { left: 6, right: 12, top: 8, bottom: 10 } }
      : undefined,
    interaction: { mode: "index", intersect: false },
    animation: { duration: 400, easing: "easeOutQuart" },
    plugins: {
      decimation: {
        enabled: true,
        algorithm: "min-max" as const,
        threshold: 120,
      },
      legend: {
        position: legendPosition,
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 16,
          font: { size: 13, weight: 500 },
          color: C.tick,
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        titleColor: C.tick,
        bodyColor: C.tick,
        borderColor: "rgba(14, 165, 233, 0.25)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
      },
    },
    elements: {
      line: {
        borderWidth: 2.5,
        tension: 0.35,
        borderCapStyle: "round",
        borderJoinStyle: "round",
      },
      point: {
        radius: 0,
        hoverRadius: 6,
        hoverBorderWidth: 2,
        hoverBackgroundColor: "#f0f9ff",
        hitRadius: 12,
      },
    },
    scales: {
      x: {
        grid: { color: C.grid, drawTicks: false },
        ticks: {
          color: C.tick,
          font: { size: 12 },
          maxRotation: 45,
          ...(opts.stackedTicks ? { autoSkip: true, maxTicksLimit: 14 } : {}),
        },
        border: { display: false },
      },
      y: {
        grid: { color: C.grid },
        ticks: {
          color: C.tick,
          font: { size: 12 },
          ...(axisPadding ? { padding: 8 } : {}),
        },
        border: { display: false },
        ...(axisPadding ? { grace: "4%" } : {}),
      },
    },
  };
}
