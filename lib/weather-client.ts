/**
 * Browser-side client for internal weather API routes.
 */

import type { WeatherHistoryRow, WeatherLatest } from "@/lib/types";

export type HistoryFetchResult = {
  rows: WeatherHistoryRow[];
  source?: "sheet" | "api";
};

async function readApi<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { error?: string }).error ?? "Unable to fetch weather data"
    );
  }
  return body as T;
}

export async function fetchLatestWeather(): Promise<WeatherLatest> {
  return readApi<WeatherLatest>("/api/weather/latest");
}

export async function fetchWeatherHistory(): Promise<HistoryFetchResult> {
  return readApi<HistoryFetchResult>("/api/weather/history");
}
