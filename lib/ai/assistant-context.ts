/**
 * Build LLM context from Weather Water Dashboard live data + offline fallback answers.
 */

import type { DamSnapshot } from "@/lib/dams-types";
import type { WeatherLatest } from "@/lib/types";
import {
  fetchLatestWeather,
} from "@/lib/weather-client";
import {
  fetchWaterMeta,
  fetchWaterOverview,
  type WaterOverviewResponse,
} from "@/lib/water-client";

export type HydroSenseContext = {
  llmBlock: string;
  stationName?: string;
  weatherOnline?: boolean;
  damCount?: number;
  latestDamDate?: string;
};

function fmtDamLine(d: DamSnapshot): string {
  const fill =
    d.fillPct != null ? `${Math.round(d.fillPct)}% fill` : "fill n/a";
  const spill =
    d.spillStatus && d.spillStatus !== "none"
      ? `, spill: ${d.spillStatus}`
      : "";
  return `- ${d.location}: ${d.waterLevelFt.toFixed(2)} ft (${fill}, storage ${d.storageStatus}, 7d ${d.trend7d}${spill})`;
}

export function buildLlmBlock(
  weather: WeatherLatest | null,
  water: WaterOverviewResponse | null
): HydroSenseContext {
  const lines: string[] = [
    "DASHBOARD LIVE DATA (HydroSense)",
    "",
    "=== WEATHER STATION ===",
  ];

  if (weather) {
    lines.push(
      `Station: ${weather.stationName || weather.stationId}`,
      `Last updated: ${weather.lastUpdated || "—"}`,
      `- Temperature: ${weather.temperature || "—"}`,
      `- Feels / heat index: ${weather.heatIndex || "—"}`,
      `- Dew point: ${weather.dewPoint || "—"}`,
      `- Humidity: ${weather.humidity || "—"}`,
      `- Wind: ${weather.wind || "—"} at ${weather.speed || "—"} (gust ${weather.gust || "—"})`,
      `- Pressure: ${weather.pressure || "—"}`,
      `- UV: ${weather.uv || "—"}, Solar: ${weather.solar || "—"}`,
      `- Precip rate: ${weather.precipRate || "—"}, Accumulated: ${weather.precipTotal || "—"}`,
      `- Daily high/low: ${weather.dailyHigh || "—"} / ${weather.dailyLow || "—"}`,
      `- Online: ${weather.online === false ? "no" : "yes"}`
    );
  } else {
    lines.push("Weather station readings are not available right now.");
  }

  lines.push("", "=== DAM WATER LEVELS ===");

  if (water?.snapshots?.length) {
    lines.push(
      `Reference date: ${water.date || "—"}`,
      `Dams reporting: ${water.snapshots.length}`
    );
    const kpis = water.overview?.kpis;
    if (kpis) {
      lines.push(
        `Network KPIs: avg fill ${kpis.avgFillPct != null ? `${Math.round(kpis.avgFillPct)}%` : "—"}, ` +
          `below dead ${kpis.belowDeadCount ?? "—"}, spill alerts ${kpis.spillAlertCount ?? "—"}`
      );
    }
    if (water.overview?.maxStorage) {
      lines.push(
        `Highest storage: ${water.overview.maxStorage.location} (${water.overview.maxStorage.fillPct != null ? `${Math.round(water.overview.maxStorage.fillPct)}%` : "n/a"})`
      );
    }
    if (water.overview?.lowestStorage) {
      lines.push(
        `Lowest storage: ${water.overview.lowestStorage.location} (${water.overview.lowestStorage.fillPct != null ? `${Math.round(water.overview.lowestStorage.fillPct)}%` : "n/a"})`
      );
    }
    lines.push("Dam snapshots:");
    for (const dam of water.snapshots.slice(0, 40)) {
      lines.push(fmtDamLine(dam));
    }
    if (water.snapshots.length > 40) {
      lines.push(`…and ${water.snapshots.length - 40} more dams.`);
    }
  } else {
    lines.push("Dam water-level readings are not available right now.");
  }

  return {
    llmBlock: lines.join("\n"),
    stationName: weather?.stationName,
    weatherOnline: weather?.online !== false,
    damCount: water?.snapshots?.length ?? 0,
    latestDamDate: water?.date,
  };
}

export async function loadHydroSenseContext(): Promise<HydroSenseContext> {
  let weather: WeatherLatest | null = null;
  let water: WaterOverviewResponse | null = null;

  try {
    weather = await fetchLatestWeather();
  } catch {
    weather = null;
  }

  try {
    const meta = await fetchWaterMeta();
    const date = meta.latestDate || "";
    if (date) {
      water = await fetchWaterOverview(date, true);
    }
  } catch {
    water = null;
  }

  return buildLlmBlock(weather, water);
}

/** Offline / Groq-down answer from the same context block. */
export function localHydroSenseAnswer(
  prompt: string,
  ctx: HydroSenseContext
): string {
  const q = prompt.toLowerCase();
  const block = ctx.llmBlock || "";

  const pick = (label: string): string | null => {
    const re = new RegExp(`^-?\\s*${label}:\\s*(.+)$`, "im");
    const m = block.match(re);
    return m?.[1]?.trim() || null;
  };

  if (/temp|hot|cold|heat|feel/.test(q)) {
    const t = pick("Temperature");
    const feels = pick("Feels / heat index");
    if (t) {
      return (
        `At ${ctx.stationName || "the station"}, temperature is ${t}` +
        (feels && feels !== "—" ? ` (feels like ${feels})` : "") +
        "."
      );
    }
  }

  if (/humid|moisture/.test(q)) {
    const h = pick("Humidity");
    if (h) return `Humidity is currently ${h}.`;
  }

  if (/wind|gust/.test(q)) {
    const w = pick("Wind");
    if (w) return `Wind conditions: ${w}.`;
  }

  if (/rain|precip|precipitation/.test(q)) {
    const precipRate = pick("Precip rate");
    const accum = pick("Accumulated");
    if (precipRate || accum) {
      return `Precipitation: rate ${precipRate || "—"}, accumulated ${accum || "—"}.`;
    }
  }

  if (/dam|reservoir|storage|spill|water level|fill/.test(q)) {
    if (ctx.damCount) {
      const named = block.match(/^- (.+?): ([\d.]+ ft .+)$/im);
      const first = named
        ? `${named[1]} is at ${named[2]}`
        : `${ctx.damCount} dams are reporting`;
      return (
        `Dam network status for ${ctx.latestDamDate || "the latest date"}: ${first}. ` +
        `Ask about a specific dam by name for a focused reading.`
      );
    }
    return "Dam water-level readings are not available at the moment.";
  }

  if (/brief|summary|overview|status|condition/.test(q)) {
    const t = pick("Temperature");
    const h = pick("Humidity");
    return (
      `Briefing — Station ${ctx.stationName || "AWS6"}: temperature ${t || "—"}, humidity ${h || "—"}. ` +
      `Dam network: ${ctx.damCount || 0} dams on ${ctx.latestDamDate || "—"}. ` +
      `Ask a more specific weather or dam question for details.`
    );
  }

  return (
    "I can answer using live station weather and dam water levels from this dashboard. " +
    "Try asking about temperature, wind, rainfall, or a dam's storage and spill status."
  );
}
