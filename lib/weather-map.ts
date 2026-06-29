import { appConfig } from "@/lib/config";
import type { WeatherHistoryRow, WeatherLatest } from "@/lib/types";

export function historyRowToLatest(row: WeatherHistoryRow): WeatherLatest {
  const ageMs = Date.now() - new Date(row.timestampIso).getTime();

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
    lastUpdated: row.timestampIso,
    online: !Number.isNaN(ageMs) && ageMs < 20 * 60 * 1000,
  };
}
