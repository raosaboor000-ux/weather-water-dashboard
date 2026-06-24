/**
 * Preview / placeholder data for Phase 2 UI development.
 * Replaced by live API data in Phase 3–4.
 */

import type { WeatherLatest } from "@/lib/types";
import { appConfig } from "@/lib/config";

export function getPreviewWeather(): WeatherLatest {
  return {
    stationId: appConfig.station.id,
    stationName: appConfig.station.name,
    dateLocal: new Date().toLocaleDateString("en-CA", {
      timeZone: appConfig.station.timezone,
    }),
    time: new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: appConfig.station.timezone,
    }),
    temperature: "28.4 °C",
    dewPoint: "18.2 °C",
    humidity: "54 %",
    wind: "NE",
    speed: "12.3 km/h",
    gust: "18.7 km/h",
    pressure: "1008.42 hPa",
    uv: "6",
    solar: "642.0 W/m²",
    precipRate: "0.00 mm",
    precipTotal: "2.40 mm",
    heatIndex: "29.1 °C",
    windChill: "—",
    dailyHigh: "31.2 °C",
    dailyLow: "22.8 °C",
    lastUpdated: new Date().toISOString(),
    online: true,
  };
}
