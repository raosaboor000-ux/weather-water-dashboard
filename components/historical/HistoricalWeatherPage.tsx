"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageHero } from "@/components/layout/PageHero";
import { WeatherCharts } from "@/components/charts/WeatherCharts";
import { HistoryControls } from "@/components/historical/HistoryControls";
import { HistoryDataTable } from "@/components/historical/HistoryDataTable";
import {
  SummaryTable,
  summaryToRows,
} from "@/components/historical/SummaryTable";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { appConfig } from "@/lib/config";
import {
  buildChartSeries,
  filterRowsByMode,
  periodTitle,
  todayStationYmd,
  type HistoryMode,
} from "@/lib/history-utils";
import { summarizeHistory } from "@/lib/history-summary";
import { weatherQueryConfig } from "@/lib/query-config";
import { fetchWeatherHistory } from "@/lib/weather-client";

type Tab = "graph" | "table";

const SOURCE_LABEL = {
  sheet: "Google Sheets",
  api: "Weather Underground (today only)",
} as const;

export function HistoricalWeatherPage() {
  const [mode, setMode] = useState<HistoryMode>("daily");
  const [stationDayYmd, setStationDayYmd] = useState(todayStationYmd);
  const [anchor, setAnchor] = useState(() => new Date());
  const [tab, setTab] = useState<Tab>("graph");

  const {
    data,
    isPending,
    isError,
    error,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["weather", "history"],
    queryFn: fetchWeatherHistory,
    staleTime: weatherQueryConfig.historyStaleMs,
    refetchInterval: weatherQueryConfig.historyRefetchMs,
    placeholderData: keepPreviousData,
  });

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const source = data?.source;

  const filtered = useMemo(
    () => filterRowsByMode(rows, mode, stationDayYmd, anchor),
    [rows, mode, stationDayYmd, anchor]
  );

  const series = useMemo(
    () => buildChartSeries(filtered, mode),
    [filtered, mode]
  );

  const summary = useMemo(() => summarizeHistory(filtered), [filtered]);

  const title = periodTitle(mode, stationDayYmd, anchor);

  const leftSummary = summaryToRows([
    { label: "Temperature (°C)", stat: summary.temperature },
    { label: "Dew Point (°C)", stat: summary.dewPoint },
    { label: "Humidity (%)", stat: summary.humidity },
    { label: "Precipitation (mm)", stat: summary.precipitation },
  ]);

  const rightSummary = summaryToRows([
    { label: "Wind Speed (km/h)", stat: summary.windSpeed },
    { label: "Wind Gust (km/h)", stat: summary.windGust },
    { label: "Wind Direction", stat: summary.windDirection },
    { label: "Pressure (hPa)", stat: summary.pressure },
  ]);

  return (
    <div className="dashboard-shell pb-12">
      <DashboardHeader
        title="Historical Weather"
        subtitle={appConfig.station.name}
        online
        lastUpdated={
          dataUpdatedAt
            ? new Date(dataUpdatedAt).toLocaleTimeString()
            : undefined
        }
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      <PageHero
        kicker="Trends & records"
        title="Charts, summaries, and data tables"
        subtitle={
          source
            ? `Data: ${SOURCE_LABEL[source] ?? source} · refreshes every 5 minutes`
            : "Auto-refreshes every 5 minutes"
        }
      />

      {isError && (
        <div className="mb-6">
          <ErrorBanner
            message={
              error instanceof Error
                ? error.message
                : "Unable to load historical data."
            }
          />
        </div>
      )}

      <HistoryControls
        mode={mode}
        onModeChange={setMode}
        stationDayYmd={stationDayYmd}
        onStationDayYmdChange={setStationDayYmd}
        anchor={anchor}
        onAnchorChange={setAnchor}
      />

      {isPending && rows.length === 0 ? (
        <LoadingSkeleton />
      ) : (
        <>
          <SummaryTable
            title={`Summary · ${title}`}
            left={leftSummary}
            right={rightSummary}
          />

          <div className="mb-4 border-b border-slate-200">
            <div className="flex gap-1">
              {(["graph", "table"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition ${
                    tab === t
                      ? "border-brand-primary text-brand-primary"
                      : "border-transparent text-ink-subtle hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {tab === "graph" ? (
              <motion.section
                key={`graph-${title}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <SectionHeading
                  title={title}
                  description={`${filtered.length} observation${filtered.length === 1 ? "" : "s"}`}
                />
                <WeatherCharts series={series} mode={mode} />
              </motion.section>
            ) : (
              <motion.section
                key={`table-${title}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <HistoryDataTable mode={mode} rows={filtered} />
              </motion.section>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
