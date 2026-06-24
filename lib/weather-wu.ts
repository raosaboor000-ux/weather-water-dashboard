/**
 * Weather Underground PWS API service (IBM OpenAPI).
 * All HTTP calls to api.weather.com go through this module.
 */

import { appConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { WeatherHistoryRow, WeatherLatest } from "@/lib/types";
import {
  degToCompass,
  num,
  relativeHumidityFromDewpoint,
} from "@/lib/weather-parse";

type Metric = {
  temp?: number;
  dewpt?: number;
  humidity?: number;
  windSpeed?: number;
  windGust?: number;
  windDir?: number;
  pressure?: number;
  uv?: number;
  solarRadiation?: number;
  precipRate?: number;
  precipTotal?: number;
  heatIndex?: number;
  windchill?: number;
};

type MetricAggregate = Metric & {
  tempAvg?: number;
  tempHigh?: number;
  tempLow?: number;
  dewptAvg?: number;
  humidityAvg?: number;
  windspeedAvg?: number;
  windgustAvg?: number;
  windgustHigh?: number;
  pressureMax?: number;
  pressureMin?: number;
};

type Observation = {
  stationID?: string;
  obsTimeUtc?: string;
  obsTimeLocal?: string;
  metric?: Metric | MetricAggregate;
  imperial?: MetricAggregate;
  lat?: number;
  lon?: number;
  uv?: number;
  uvHigh?: number;
  solarRadiation?: number;
  solarRadiationHigh?: number;
  winddir?: number | string;
  winddirAvg?: number;
  humidityAvg?: number;
  humidityHigh?: number;
  humidityLow?: number;
};

async function readJsonOrThrow<T>(res: Response, context: string): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`${context} returned empty response (HTTP ${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `${context} returned invalid JSON (HTTP ${res.status}): ${text.slice(0, 200)}`
    );
  }
}

function formatPressureMb(n: number): string {
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hPa`;
}

function formatStationWallTime(o: Observation): string {
  const local = o.obsTimeLocal?.trim();
  if (local) {
    const match = local.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      const h = parseInt(match[1], 10);
      const min = match[2];
      const ap = h >= 12 ? "PM" : "AM";
      return `${h % 12 || 12}:${min} ${ap}`;
    }
    return local;
  }
  if (o.obsTimeUtc) {
    return new Date(o.obsTimeUtc).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: appConfig.station.timezone,
    });
  }
  return "—";
}

function formatStationDateLocal(o: Observation): string {
  const local = o.obsTimeLocal?.trim();
  if (local) {
    const m = local.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (o.obsTimeUtc) {
    return new Date(o.obsTimeUtc).toLocaleDateString("en-CA", {
      timeZone: appConfig.station.timezone,
    });
  }
  return "";
}

function pickHumidity(
  b: MetricAggregate,
  o: Observation,
  tempC: number,
  dewC: number
): number {
  for (const c of [
    num(b.humidity),
    num(b.humidityAvg),
    num(o.humidityAvg),
  ]) {
    if (c != null && c > 0) return Math.min(100, Math.round(c));
  }
  return relativeHumidityFromDewpoint(tempC, dewC);
}

function pickTemp(b: MetricAggregate): number | undefined {
  return (
    num(b.temp) ??
    num(b.tempAvg) ??
    (() => {
      const hi = num(b.tempHigh);
      const lo = num(b.tempLow);
      if (hi != null && lo != null) return (hi + lo) / 2;
      return hi ?? lo ?? undefined;
    })()
  );
}

function normalizeMetric(o: Observation): Metric | null {
  const block = (o.metric ?? o.imperial) as MetricAggregate | undefined;
  if (!block) return null;

  const temp = pickTemp(block);
  if (temp == null) return null;

  const dewpt =
    num(block.dewpt) ??
    num(block.dewptAvg) ??
    0;

  return {
    temp,
    dewpt,
    humidity: pickHumidity(block, o, temp, dewpt),
    windSpeed:
      num(block.windSpeed) ?? num(block.windspeedAvg) ?? 0,
    windGust:
      num(block.windGust) ??
      num(block.windgustAvg) ??
      num(block.windgustHigh) ??
      0,
    windDir:
      num(block.windDir) ??
      num(o.winddirAvg) ??
      (typeof o.winddir === "number" ? o.winddir : undefined),
    pressure:
      num(block.pressure) ??
      (() => {
        const mx = num(block.pressureMax);
        const mn = num(block.pressureMin);
        if (mx != null && mn != null) return (mx + mn) / 2;
        return mx ?? mn ?? 0;
      })(),
    uv: num(block.uv) ?? num(o.uv) ?? num(o.uvHigh) ?? 0,
    solarRadiation:
      num(block.solarRadiation) ??
      num(o.solarRadiation) ??
      num(o.solarRadiationHigh) ??
      0,
    precipRate: num(block.precipRate) ?? 0,
    precipTotal: num(block.precipTotal) ?? 0,
    heatIndex: num(block.heatIndex),
    windchill: num(block.windchill),
  };
}

function windLabel(o: Observation, m: Metric): string {
  if (typeof m.windDir === "number") return degToCompass(m.windDir);
  if (typeof o.winddirAvg === "number") return degToCompass(o.winddirAvg);
  if (typeof o.winddir === "number") return degToCompass(o.winddir);
  if (typeof o.winddir === "string" && o.winddir.trim()) return o.winddir.trim();
  return "—";
}

function mapObservation(o: Observation): WeatherHistoryRow {
  const m = normalizeMetric(o);
  if (!m || m.temp == null) throw new Error("Invalid observation metric");

  return {
    timestampIso: o.obsTimeUtc ?? "",
    dateLocal: formatStationDateLocal(o),
    timeLocal: formatStationWallTime(o),
    temperature: `${m.temp.toFixed(1)} °C`,
    dewPoint: `${(m.dewpt ?? 0).toFixed(1)} °C`,
    humidity: `${Math.round(m.humidity ?? 0)} %`,
    wind: windLabel(o, m),
    speed: `${(m.windSpeed ?? 0).toFixed(1)} km/h`,
    gust: `${(m.windGust ?? 0).toFixed(1)} km/h`,
    pressure: formatPressureMb(m.pressure ?? 0),
    uv: String(Math.round(m.uv ?? 0)),
    solar: `${(m.solarRadiation ?? 0).toFixed(1)} W/m²`,
    precipRate: `${(m.precipRate ?? 0).toFixed(2)} mm`,
    precipTotal: `${(m.precipTotal ?? 0).toFixed(2)} mm`,
  };
}

function mapToLatest(o: Observation, dailyHigh?: number, dailyLow?: number): WeatherLatest {
  const row = mapObservation(o);
  const m = normalizeMetric(o)!;

  const lat = typeof o.lat === "number" ? o.lat : appConfig.station.lat;
  const lng = typeof o.lon === "number" ? o.lon : appConfig.station.lng;
  const updated = o.obsTimeUtc ?? new Date().toISOString();
  const ageMs = Date.now() - new Date(updated).getTime();
  const online = !Number.isNaN(ageMs) && ageMs < 20 * 60 * 1000;

  return {
    stationId: appConfig.station.id,
    stationName: appConfig.station.name,
    dateLocal: row.dateLocal,
    time: row.timeLocal ?? "—",
    temperature: row.temperature,
    dewPoint: row.dewPoint,
    humidity: row.humidity,
    wind: row.wind,
    speed: row.speed,
    gust: row.gust,
    pressure: row.pressure,
    uv: row.uv,
    solar: row.solar,
    precipRate: row.precipRate,
    precipTotal: row.precipTotal,
    heatIndex:
      m.heatIndex != null ? `${m.heatIndex.toFixed(1)} °C` : undefined,
    windChill:
      m.windchill != null ? `${m.windchill.toFixed(1)} °C` : undefined,
    dailyHigh: dailyHigh != null ? `${dailyHigh.toFixed(1)} °C` : undefined,
    dailyLow: dailyLow != null ? `${dailyLow.toFixed(1)} °C` : undefined,
    lastUpdated: updated,
    online,
  };
}

function buildUrl(path: string): string {
  const params = new URLSearchParams({
    stationId: appConfig.station.id,
    format: "json",
    units: "m",
    apiKey: appConfig.api.wuApiKey,
    numericPrecision: "decimal",
  });
  return `${appConfig.api.wuBaseUrl}/${path}?${params.toString()}`;
}

async function fetchObservations(path: string): Promise<Observation[]> {
  const url = buildUrl(path);
  logger.info("WU API request", { path, stationId: appConfig.station.id });

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    logger.error("WU API network error", { path, error: String(err) });
    throw new Error("Network error — unable to reach Weather Underground.");
  }

  if (res.status === 429) {
    logger.warn("WU API rate limit", { path });
    throw new Error("Rate limit exceeded — please try again shortly.");
  }

  if (!res.ok) {
    const text = await res.text();
    logger.error("WU API HTTP error", { path, status: res.status, body: text.slice(0, 200) });
    throw new Error(`Weather API error (HTTP ${res.status}).`);
  }

  const json = await readJsonOrThrow<{ observations?: Observation[] }>(res, `WU ${path}`);
  return json.observations ?? [];
}

function dailyHighLow(observations: Observation[]): { high?: number; low?: number } {
  const temps: number[] = [];
  for (const o of observations) {
    const m = normalizeMetric(o);
    if (m?.temp != null) temps.push(m.temp);
  }
  if (temps.length === 0) return {};
  return { high: Math.max(...temps), low: Math.min(...temps) };
}

/** Server-side Weather Underground API client. */
export class WeatherAPI {
  async getCurrent(): Promise<WeatherLatest> {
    const [current, today] = await Promise.all([
      fetchObservations("observations/current"),
      fetchObservations("observations/all/1day").catch(() => [] as Observation[]),
    ]);

    const o = current[0];
    if (!o?.obsTimeUtc) {
      throw new Error("No current observation returned for this station.");
    }

    const { high, low } = dailyHighLow(today);
    return mapToLatest(o, high, low);
  }

  async getHourly(): Promise<WeatherHistoryRow[]> {
    const list = await fetchObservations("observations/hourly/1day");
    return this._mapHistory(list);
  }

  async getDaily(): Promise<WeatherHistoryRow[]> {
    const list = await fetchObservations("observations/all/1day");
    return this._mapHistory(list);
  }

  async getHistory(): Promise<WeatherHistoryRow[]> {
    const [all7d, all1d, hourly] = await Promise.all([
      fetchObservations("observations/all/7day").catch(() => [] as Observation[]),
      fetchObservations("observations/all/1day").catch(() => [] as Observation[]),
      fetchObservations("observations/hourly/7day").catch(() => [] as Observation[]),
    ]);

    const map = new Map<string, WeatherHistoryRow>();
    const source = all7d.length > 0 ? [...all7d, ...all1d] : [...hourly, ...all1d];

    for (const o of source) {
      if (!o.obsTimeUtc) continue;
      try {
        map.set(o.obsTimeUtc, mapObservation(o));
      } catch {
        continue;
      }
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
    );
  }

  private _mapHistory(list: Observation[]): WeatherHistoryRow[] {
    const out: WeatherHistoryRow[] = [];
    for (const o of list) {
      if (!o.obsTimeUtc) continue;
      try {
        out.push(mapObservation(o));
      } catch {
        continue;
      }
    }
    return out.sort(
      (a, b) =>
        new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
    );
  }
}

export const weatherAPI = new WeatherAPI();
