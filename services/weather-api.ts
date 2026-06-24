/**
 * Re-exports the server WeatherAPI for API routes and scripts.
 * UI code should use `@/lib/weather-client` instead.
 */

export { WeatherAPI, weatherAPI } from "@/lib/weather-wu";
export type { WeatherLatest, WeatherHistoryRow } from "@/lib/types";
