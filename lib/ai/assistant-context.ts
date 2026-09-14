/**
 * Build LLM context from live weather, historical weather, and dam network data.
 */

import type { DamReading, DamSnapshot, TrendDirection } from "@/lib/dams-types";
import type { WeatherHistoryRow, WeatherLatest } from "@/lib/types";
import { aggregateDailyStats } from "@/lib/history-aggregate";
import { summarizeHistory, type HistorySummary } from "@/lib/history-summary";
import {
  addDaysToYmd,
  stationYmdFromIso,
  todayStationYmd,
} from "@/lib/history-utils";
import {
  fetchLatestWeather,
  fetchWeatherHistory,
} from "@/lib/weather-client";
import {
  fetchDamReadings,
  fetchWaterMeta,
  fetchWaterOverview,
  type WaterMetaResponse,
  type WaterOverviewResponse,
} from "@/lib/water-client";

export type HydroSenseContext = {
  llmBlock: string;
  stationName?: string;
  weatherOnline?: boolean;
  damCount?: number;
  latestDamDate?: string;
};

export type NotableDamSeries = {
  location: string;
  readings: DamReading[];
  trend?: TrendDirection;
};

export type HydroSenseExtras = {
  weatherHistory?: WeatherHistoryRow[];
  weatherHistorySource?: string;
  waterMeta?: WaterMetaResponse | null;
  notableDamSeries?: NotableDamSeries[];
};

function rowDateKey(r: WeatherHistoryRow): string {
  if (r.dateLocal?.match(/^\d{4}-\d{2}-\d{2}$/)) return r.dateLocal;
  if (r.timestampIso) return stationYmdFromIso(r.timestampIso);
  return "";
}

function filterHistoryDays(
  rows: WeatherHistoryRow[],
  days: number
): WeatherHistoryRow[] {
  if (!rows.length) return [];
  const today = todayStationYmd();
  const from = addDaysToYmd(today, -(days - 1));
  return rows.filter((r) => {
    const key = rowDateKey(r);
    return Boolean(key) && key >= from && key <= today;
  });
}

function fmtStatTriple(
  label: string,
  s: { high: string; low: string; avg: string }
): string {
  return `- ${label}: high ${s.high}, avg ${s.avg}, low ${s.low}`;
}

function appendHistorySummary(lines: string[], title: string, s: HistorySummary) {
  lines.push(title);
  lines.push(fmtStatTriple("Temperature", s.temperature));
  lines.push(fmtStatTriple("Humidity", s.humidity));
  lines.push(fmtStatTriple("Wind speed", s.windSpeed));
  lines.push(fmtStatTriple("Precipitation", s.precipitation));
  lines.push(fmtStatTriple("Pressure", s.pressure));
  lines.push(fmtStatTriple("UV", s.uv));
}

function fmtDamLine(d: DamSnapshot): string {
  const parts: string[] = [
    `${d.waterLevelFt.toFixed(2)} ft`,
    d.fillPct != null ? `${Math.round(d.fillPct)}% fill` : "fill n/a",
    `storage ${d.storageStatus}`,
    `7d ${d.trend7d}`,
  ];
  if (d.spillStatus && d.spillStatus !== "none") {
    parts.push(`spill ${d.spillStatus}`);
  }
  if (d.dslFt != null) parts.push(`DSL ${d.dslFt} ft`);
  if (d.nplFt != null) parts.push(`NPL ${d.nplFt} ft`);
  if (d.hflFt != null) parts.push(`HFL ${d.hflFt} ft`);
  if (d.liveStorageAft != null) parts.push(`live ${d.liveStorageAft} aft`);
  if (d.grossStorageAft != null) parts.push(`gross ${d.grossStorageAft} aft`);
  if (d.river) parts.push(`river ${d.river}`);
  if (d.yearCompleted != null) parts.push(`built ${d.yearCompleted}`);
  if (d.catchmentSqKm != null) parts.push(`catchment ${d.catchmentSqKm} km²`);
  return `- ${d.location}: ${parts.join(", ")}`;
}

/** Prefer operationally important dams first, then the rest alphabetically. */
function orderedSnapshots(water: WaterOverviewResponse): DamSnapshot[] {
  const priority = new Map<string, number>();
  let rank = 0;
  const bump = (loc?: string) => {
    if (!loc || priority.has(loc)) return;
    priority.set(loc, rank++);
  };
  for (const d of water.overview?.spillAlerts ?? []) bump(d.location);
  for (const d of water.overview?.belowDead ?? []) bump(d.location);
  bump(water.overview?.maxStorage?.location);
  bump(water.overview?.lowestStorage?.location);
  for (const d of water.snapshots) {
    if (d.trend7d === "rising" || d.trend7d === "falling") bump(d.location);
  }

  return [...water.snapshots].sort((a, b) => {
    const pa = priority.has(a.location) ? priority.get(a.location)! : 9999;
    const pb = priority.has(b.location) ? priority.get(b.location)! : 9999;
    if (pa !== pb) return pa - pb;
    return a.location.localeCompare(b.location);
  });
}

export function pickNotableDamNames(
  water: WaterOverviewResponse,
  limit = 8
): string[] {
  const ordered: string[] = [];
  const add = (loc?: string) => {
    if (!loc || ordered.includes(loc)) return;
    ordered.push(loc);
  };
  for (const d of water.overview?.spillAlerts ?? []) add(d.location);
  for (const d of water.overview?.belowDead ?? []) add(d.location);
  add(water.overview?.maxStorage?.location);
  add(water.overview?.lowestStorage?.location);
  for (const d of water.snapshots.filter((s) => s.trend7d === "rising")) {
    add(d.location);
  }
  for (const d of water.snapshots.filter((s) => s.trend7d === "falling")) {
    add(d.location);
  }
  return ordered.slice(0, limit);
}

function readingsWindow(meta: WaterMetaResponse | null | undefined): {
  from: string;
  to: string;
} | null {
  const to = meta?.latestDate || "";
  if (!to) return null;
  const dates = meta?.dates?.length ? meta.dates : [to];
  const idx = dates.indexOf(to);
  const fromIdx = Math.max(0, (idx >= 0 ? idx : dates.length - 1) - 13);
  return { from: dates[fromIdx] || to, to };
}

export function buildLlmBlock(
  weather: WeatherLatest | null,
  water: WaterOverviewResponse | null,
  extras: HydroSenseExtras = {}
): HydroSenseContext {
  const lines: string[] = [
    "DASHBOARD OPERATIONAL DATA (HydroSense)",
    "Includes live station weather, weather history summaries, and dam network detail.",
    "",
    "=== LIVE WEATHER STATION ===",
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
    if (weather.sheetSyncedAt) {
      lines.push(`- History log last synced: ${weather.sheetSyncedAt}`);
    }
  } else {
    lines.push("Weather station readings are not available right now.");
  }

  const historyRows = extras.weatherHistory ?? [];
  lines.push("", "=== WEATHER HISTORY ===");
  if (historyRows.length) {
    const last7 = filterHistoryDays(historyRows, 7);
    const last30 = filterHistoryDays(historyRows, 30);
    const rangeRows = last30.length ? last30 : historyRows;
    const keys = rangeRows.map(rowDateKey).filter(Boolean).sort();
    const firstKey = keys[0] || "—";
    const lastKey = keys[keys.length - 1] || "—";
    lines.push(
      `Observations available: ${historyRows.length}` +
        (extras.weatherHistorySource ? ` (dashboard history)` : ""),
      `Coverage in summary window: ${firstKey} to ${lastKey}`
    );

    if (last7.length) {
      appendHistorySummary(
        lines,
        "Last 7 days (high / avg / low):",
        summarizeHistory(last7)
      );
    }
    if (last30.length && last30.length > last7.length) {
      appendHistorySummary(
        lines,
        "Last 30 days (high / avg / low):",
        summarizeHistory(last30)
      );
    }

    const daily = aggregateDailyStats(last7.length ? last7 : rangeRows).slice(-7);
    if (daily.length) {
      lines.push("Recent daily weather:");
      for (const day of daily) {
        lines.push(
          `- ${day.dateKey}: temp ${day.temperature.high}/${day.temperature.avg}/${day.temperature.low}, ` +
            `humidity ${day.humidity.avg}%, wind ${day.speed.avg}, precip ${day.precipSum} mm`
        );
      }
    }
  } else {
    lines.push("Historical weather observations are not available right now.");
  }

  lines.push("", "=== DAM WATER LEVELS ===");

  const meta = extras.waterMeta;
  if (meta) {
    lines.push(
      `Dam archive dates: ${meta.dates?.length ?? 0}` +
        (meta.dates?.length
          ? ` (${meta.dates[0]} → ${meta.dates[meta.dates.length - 1]})`
          : ""),
      `Latest dam date: ${meta.latestDate || "—"}`
    );
  }

  if (water?.snapshots?.length) {
    lines.push(
      `Reference date: ${water.date || "—"}`,
      `Dams reporting: ${water.snapshots.length}`
    );
    const kpis = water.overview?.kpis;
    if (kpis) {
      lines.push(
        `Network KPIs: monitored ${kpis.totalMonitored}, avg fill ${
          kpis.avgFillPct != null ? `${Math.round(kpis.avgFillPct)}%` : "—"
        }, ` +
          `live storage total ${Math.round(kpis.totalLiveStorageAft)} aft, ` +
          `below dead ${kpis.belowDeadCount ?? "—"}, spill alerts ${kpis.spillAlertCount ?? "—"}`
      );
    }
    if (water.overview?.maxStorage) {
      const d = water.overview.maxStorage;
      lines.push(
        `Highest storage: ${d.location} (${d.fillPct != null ? `${Math.round(d.fillPct)}%` : "n/a"}, ${d.waterLevelFt.toFixed(2)} ft)`
      );
    }
    if (water.overview?.lowestStorage) {
      const d = water.overview.lowestStorage;
      lines.push(
        `Lowest storage: ${d.location} (${d.fillPct != null ? `${Math.round(d.fillPct)}%` : "n/a"}, ${d.waterLevelFt.toFixed(2)} ft)`
      );
    }

    const belowDead = water.overview?.belowDead ?? [];
    if (belowDead.length) {
      lines.push(
        `Below dead storage (${belowDead.length}): ${belowDead
          .map((d) => d.location)
          .join(", ")}`
      );
    }
    const spillAlerts = water.overview?.spillAlerts ?? [];
    if (spillAlerts.length) {
      lines.push(
        `Spill alerts (${spillAlerts.length}): ` +
          spillAlerts
            .map((d) => `${d.location} (${d.spillStatus})`)
            .join("; ")
      );
    }

    const rising = water.snapshots.filter((d) => d.trend7d === "rising");
    const falling = water.snapshots.filter((d) => d.trend7d === "falling");
    if (rising.length) {
      lines.push(
        `Rising (7d): ${rising
          .slice(0, 15)
          .map((d) => d.location)
          .join(", ")}${rising.length > 15 ? ` (+${rising.length - 15} more)` : ""}`
      );
    }
    if (falling.length) {
      lines.push(
        `Falling (7d): ${falling
          .slice(0, 15)
          .map((d) => d.location)
          .join(", ")}${falling.length > 15 ? ` (+${falling.length - 15} more)` : ""}`
      );
    }

    lines.push("Dam snapshots (priority alerts first):");
    const snaps = orderedSnapshots(water);
    const damCap = 60;
    for (const dam of snaps.slice(0, damCap)) {
      lines.push(fmtDamLine(dam));
    }
    if (snaps.length > damCap) {
      lines.push(`…and ${snaps.length - damCap} more dams.`);
    }
  } else {
    lines.push("Dam water-level readings are not available right now.");
  }

  const series = extras.notableDamSeries ?? [];
  if (series.length) {
    lines.push("", "=== NOTABLE DAM RECENT LEVELS ===");
    for (const item of series) {
      const pts = item.readings
        .slice(-8)
        .map((r) => `${r.date}:${r.waterLevelFt.toFixed(2)}ft`)
        .join(", ");
      lines.push(
        `- ${item.location}` +
          (item.trend ? ` (trend ${item.trend})` : "") +
          `: ${pts || "no recent readings"}`
      );
    }
  }

  return {
    llmBlock: lines.join("\n"),
    stationName: weather?.stationName,
    weatherOnline: weather?.online !== false,
    damCount: water?.snapshots?.length ?? 0,
    latestDamDate: water?.date || meta?.latestDate,
  };
}

async function loadNotableDamSeries(
  water: WaterOverviewResponse | null,
  meta: WaterMetaResponse | null
): Promise<NotableDamSeries[]> {
  if (!water?.snapshots?.length) return [];
  const window = readingsWindow(meta);
  if (!window) return [];
  const names = pickNotableDamNames(water, 8);
  if (!names.length) return [];

  const results = await Promise.all(
    names.map(async (location): Promise<NotableDamSeries | null> => {
      try {
        const res = await fetchDamReadings(location, window.from, window.to);
        return {
          location,
          readings: res.readings ?? [],
          trend: res.trend,
        };
      } catch {
        return null;
      }
    })
  );

  return results.filter((r): r is NotableDamSeries => r != null);
}

export async function loadHydroSenseContext(): Promise<HydroSenseContext> {
  const [weatherSettled, historySettled, waterSettled] = await Promise.allSettled([
    fetchLatestWeather(),
    fetchWeatherHistory(),
    (async () => {
      const meta = await fetchWaterMeta();
      const date = meta.latestDate || "";
      const water = date ? await fetchWaterOverview(date, true) : null;
      return { meta, water };
    })(),
  ]);

  const weather =
    weatherSettled.status === "fulfilled" ? weatherSettled.value : null;
  const history =
    historySettled.status === "fulfilled" ? historySettled.value : null;
  const waterPack =
    waterSettled.status === "fulfilled" ? waterSettled.value : null;

  const water = waterPack?.water ?? null;
  const meta = waterPack?.meta ?? null;

  let notableDamSeries: NotableDamSeries[] = [];
  try {
    notableDamSeries = await loadNotableDamSeries(water, meta);
  } catch {
    notableDamSeries = [];
  }

  return buildLlmBlock(weather, water, {
    weatherHistory: history?.rows ?? [],
    weatherHistorySource: history?.source,
    waterMeta: meta,
    notableDamSeries,
  });
}

function isDamTopic(q: string): boolean {
  return /\b(?:dam|dams|reservoir|spill|below[- ]dead|water\s*levels?|fill(?:\s*%| percent)?|storage)\b/.test(
    q
  );
}

function isWeatherTopic(q: string): boolean {
  return (
    /\b(?:weather|temperature|humidity|wind|gust|rain|precip|precipitation|station|uv|solar|dew)\b/.test(
      q
    ) ||
    /\bhistor(?:y|ical)\b/.test(q) ||
    /\b(?:last|past)\s+(?:7|seven|30|thirty)\s+days?\b/.test(q) ||
    /\brecent\s+(?:weather|history|trends?)\b/.test(q)
  );
}

/** Full ops briefing only for multi-topic / generic brief — not dam-only or weather-only. */
function isBriefingIntent(q: string): boolean {
  if (/\bbrief(?:ing)?\b/.test(q) || /cover(?:ing)?\s+live\s+weather/.test(q)) {
    return true;
  }
  if (/\b(?:full|operational)\s+brief/.test(q) || /\bops\b/.test(q)) {
    return true;
  }

  if (/\b(?:summary|overview|status|condition)\b/.test(q)) {
    const dam = isDamTopic(q);
    const weather = isWeatherTopic(q);
    // "summary about dams" → dam answer; "weather summary" → weather; both/neither → briefing
    if (dam && !weather) return false;
    if (weather && !dam) return false;
    return true;
  }

  return false;
}

function recentDailySnippet(block: string, limit = 3): string | null {
  const dailyMatch = block.match(
    /Recent daily weather:([\s\S]*?)(?:\n===|\n*$)/
  );
  const dailyBit = dailyMatch?.[1]
    ?.trim()
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((l) => l.replace(/^- /, ""))
    .join("; ");
  return dailyBit || null;
}

function extractDamSnapshotLines(block: string): string[] {
  const section = block.match(
    /Dam snapshots[^\n]*:\n([\s\S]*?)(?:\n===|\n*$)/
  );
  if (!section?.[1]) return [];
  return section[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^- /, ""));
}

function splitCsvItems(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/;/)
    .flatMap((part) => part.split(/,(?=\s*[A-Za-z])/))
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatBulletBlock(title: string, items: string[]): string {
  if (!items.length) return "";
  return [title, ...items.map((item) => `• ${item}`)].join("\n");
}

function compactDamLabel(line: string): string {
  const m = line.match(
    /^(.+?): ([\d.]+ ft(?:, [^,]+% fill)?(?:, storage [^,]+)?(?:, 7d [^,]+)?(?:, spill [^,]+)?)/
  );
  if (m) return `${m[1]} — ${m[2]}`;
  return line.split(", DSL")[0];
}

function buildOfflineDamAnswer(prompt: string, ctx: HydroSenseContext): string {
  const q = prompt.toLowerCase();
  const block = ctx.llmBlock || "";

  const sectionLine = (prefix: string): string | null => {
    const re = new RegExp("^" + prefix + ":\\s*(.+)$", "im");
    const m = block.match(re);
    return m?.[1]?.trim() || null;
  };

  const labeledList = (label: string): string | null => {
    const re = new RegExp(
      "^" + label + "(?:\\s*\\(\\d+\\))?:\\s*(.+)$",
      "im"
    );
    const m = block.match(re);
    return m?.[1]?.trim() || null;
  };

  if (!ctx.damCount) {
    return "Dam water-level readings are not available at the moment.";
  }

  const snaps = extractDamSnapshotLines(block);
  const spill = labeledList("Spill alerts");
  const below = labeledList("Below dead storage");
  const highest = sectionLine("Highest storage");
  const lowest = sectionLine("Lowest storage");
  const kpis = sectionLine("Network KPIs");
  const risingLine =
    block.match(/^Rising \(7d\):\s*(.+)$/im)?.[1]?.trim() || null;
  const fallingLine =
    block.match(/^Falling \(7d\):\s*(.+)$/im)?.[1]?.trim() || null;
  const dateLabel = ctx.latestDamDate || "the latest date";

  const namedHit = snaps.find((line) => {
    const name = line.split(":")[0]?.trim().toLowerCase();
    return name && name.length >= 3 && q.includes(name);
  });
  if (namedHit && !/\ball\b|\bevery\b|\beach\b/.test(q)) {
    const name = namedHit.split(":")[0]?.trim() || "Dam";
    return [
      `${name}`,
      `• ${namedHit.replace(/^[^:]+:\s*/, "")}`,
      "",
      "Ask for the full dam network summary if you want all reservoirs.",
    ].join("\n");
  }

  const wantsAll =
    /\ball\b|\bevery\b|\beach\b|\blist\b|\bsummary\b|\boverview\b|\bnetwork\b|\bpriorit/.test(
      q
    ) ||
    /\b\d+\s+dams?\b/.test(q) ||
    snaps.length <= 12;

  const sections: string[] = [
    "Dam network summary",
    `• Date: ${dateLabel}`,
    `• Dams reporting: ${ctx.damCount}`,
  ];
  if (kpis) sections.push(`• KPIs: ${kpis}`);

  const priorityItems: string[] = [];
  const spillItems = splitCsvItems(spill);
  if (spillItems.length) {
    priorityItems.push(...spillItems.map((s) => `Spill alert — ${s}`));
  } else if (spill) {
    priorityItems.push(`Spill alerts — ${spill}`);
  }
  const belowItems = splitCsvItems(below);
  if (belowItems.length) {
    priorityItems.push(...belowItems.map((s) => `Below dead — ${s}`));
  } else if (below) {
    priorityItems.push(`Below dead — ${below}`);
  }
  if (highest) priorityItems.push(`Highest storage — ${highest}`);
  if (lowest) priorityItems.push(`Lowest storage — ${lowest}`);

  const priorityBlock = formatBulletBlock("\nPriorities", priorityItems);
  if (priorityBlock) sections.push(priorityBlock);

  const trendItems: string[] = [];
  if (risingLine) trendItems.push(`Rising (7d): ${risingLine}`);
  if (fallingLine) trendItems.push(`Falling (7d): ${fallingLine}`);
  const trendBlock = formatBulletBlock("\nTrends", trendItems);
  if (trendBlock) sections.push(trendBlock);

  if (wantsAll && snaps.length) {
    sections.push(
      "\nAll dams",
      ...snaps.map((line, i) => `${i + 1}. ${compactDamLabel(line)}`)
    );
  } else if (snaps[0]) {
    sections.push("\nSample reading", `• ${compactDamLabel(snaps[0])}`);
  }

  return sections.join("\n");
}

function buildOfflineBriefing(ctx: HydroSenseContext): string {
  const block = ctx.llmBlock || "";

  const pick = (label: string): string | null => {
    const re = new RegExp("^-?\\s*" + label + ":\\s*(.+)$", "im");
    const m = block.match(re);
    return m?.[1]?.trim() || null;
  };

  const sectionLine = (prefix: string): string | null => {
    const re = new RegExp("^" + prefix + ":\\s*(.+)$", "im");
    const m = block.match(re);
    return m?.[1]?.trim() || null;
  };

  const labeledList = (label: string): string | null => {
    const re = new RegExp(
      "^" + label + "(?:\\s*\\(\\d+\\))?:\\s*(.+)$",
      "im"
    );
    const m = block.match(re);
    return m?.[1]?.trim() || null;
  };

  const t = pick("Temperature");
  const h = pick("Humidity");
  const wind = pick("Wind");
  const precip = pick("Accumulated");
  const dailyHiLo = pick("Daily high/low");
  const coverage = sectionLine("Coverage in summary window");
  const dailyBit = recentDailySnippet(block, 3);
  const kpis = sectionLine("Network KPIs");
  const highest = sectionLine("Highest storage");
  const lowest = sectionLine("Lowest storage");
  const spill = labeledList("Spill alerts") || "none listed";
  const below = labeledList("Below dead storage") || "none listed";
  const risingLine =
    block.match(/^Rising \(7d\):\s*(.+)$/im)?.[1]?.trim() || null;
  const fallingLine =
    block.match(/^Falling \(7d\):\s*(.+)$/im)?.[1]?.trim() || null;

  const sections: string[] = [
    `Operational briefing — ${ctx.stationName || "AWS6"}`,
    "",
    "Live weather",
    `• Temperature: ${t || "—"}`,
    `• Humidity: ${h || "—"}`,
    `• Wind: ${wind || "—"}`,
    `• Precip accumulated: ${precip || "—"}`,
  ];
  if (dailyHiLo && dailyHiLo !== "—") {
    sections.push(`• Daily high/low: ${dailyHiLo}`);
  }

  if (coverage || dailyBit) {
    sections.push("", "Recent weather history");
    if (coverage) sections.push(`• Coverage: ${coverage}`);
    if (dailyBit) {
      const days = dailyBit.split(";").map((s) => s.trim()).filter(Boolean);
      if (days.length) {
        sections.push(...days.map((d) => `• ${d}`));
      } else {
        sections.push(`• ${dailyBit}`);
      }
    }
  }

  sections.push(
    "",
    "Dam network",
    `• Dams reporting: ${ctx.damCount || 0}`,
    `• Date: ${ctx.latestDamDate || "—"}`
  );
  if (kpis) sections.push(`• KPIs: ${kpis}`);

  const spillItems = splitCsvItems(spill);
  sections.push("", "Spill alerts");
  if (spillItems.length && spill !== "none listed") {
    sections.push(...spillItems.map((s) => `• ${s}`));
  } else {
    sections.push(`• ${spill}`);
  }

  const belowItems = splitCsvItems(below);
  sections.push("", "Below dead storage");
  if (belowItems.length && below !== "none listed") {
    sections.push(...belowItems.map((s) => `• ${s}`));
  } else {
    sections.push(`• ${below}`);
  }

  if (highest || lowest) {
    sections.push("", "Storage extremes");
    if (highest) sections.push(`• Highest: ${highest}`);
    if (lowest) sections.push(`• Lowest: ${lowest}`);
  }

  if (risingLine || fallingLine) {
    sections.push("", "Level trends (7d)");
    if (risingLine) sections.push(`• Rising: ${risingLine}`);
    if (fallingLine) sections.push(`• Falling: ${fallingLine}`);
  }

  return sections.join("\n");
}

/** Offline / Groq-down answer from the same context block. */
export function localHydroSenseAnswer(
  prompt: string,
  ctx: HydroSenseContext
): string {
  const q = prompt.toLowerCase();
  const block = ctx.llmBlock || "";

  const pick = (label: string): string | null => {
    const re = new RegExp("^-?\\s*" + label + ":\\s*(.+)$", "im");
    const m = block.match(re);
    return m?.[1]?.trim() || null;
  };

  const sectionLine = (prefix: string): string | null => {
    const re = new RegExp("^" + prefix + ":\\s*(.+)$", "im");
    const m = block.match(re);
    return m?.[1]?.trim() || null;
  };

  // Dam-only questions must not pull in weather (e.g. "summary about all 8 dams").
  if (isDamTopic(q) && !isWeatherTopic(q)) {
    return buildOfflineDamAnswer(prompt, ctx);
  }

  if (isBriefingIntent(q)) {
    return buildOfflineBriefing(ctx);
  }

  if (/temp|hot|cold|heat|feel/.test(q)) {
    const t = pick("Temperature");
    const feels = pick("Feels / heat index");
    if (t) {
      return (
        "At " +
        (ctx.stationName || "the station") +
        ", temperature is " +
        t +
        (feels && feels !== "—" ? " (feels like " + feels + ")" : "") +
        "."
      );
    }
  }

  if (/humid|moisture/.test(q)) {
    const h = pick("Humidity");
    if (h) return "Humidity is currently " + h + ".";
  }

  if (/wind|gust/.test(q)) {
    const w = pick("Wind");
    if (w) return "Wind conditions: " + w + ".";
  }

  if (/rain|precip|precipitation/.test(q)) {
    const precipRate = pick("Precip rate");
    const accum = pick("Accumulated");
    if (precipRate || accum) {
      return (
        "Precipitation: rate " +
        (precipRate || "—") +
        ", accumulated " +
        (accum || "—") +
        "."
      );
    }
  }

  if (
    /histor|trend|last\s*(7|seven|30|thirty)|past\s+week|this\s+month/.test(q)
  ) {
    const coverage = sectionLine("Coverage in summary window");
    const dailyBit = recentDailySnippet(block, 3);
    if (coverage || dailyBit) {
      const lines = ["Weather history"];
      if (coverage) lines.push(`• Coverage: ${coverage}`);
      if (dailyBit) {
        const days = dailyBit
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);
        lines.push("", "Recent days");
        lines.push(...(days.length ? days.map((d) => `• ${d}`) : [`• ${dailyBit}`]));
      }
      return lines.join("\n");
    }
  }

  if (isDamTopic(q)) {
    return buildOfflineDamAnswer(prompt, ctx);
  }

  return (
    "I can answer using live station weather, weather history trends, and dam water levels from this dashboard. " +
    "Try asking for an operational briefing, recent weather trends, rainfall, or a dam's storage and spill status."
  );
}
