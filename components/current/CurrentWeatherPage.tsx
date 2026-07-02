"use client";

import { useIsFetching, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CurrentConditionsHero } from "@/components/current/CurrentConditionsHero";
import { MetricGrid } from "@/components/current/MetricGrid";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageHero } from "@/components/layout/PageHero";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { appConfig } from "@/lib/config";
import { weatherDisplayUnits } from "@/lib/display-units";
import { weatherQueryConfig } from "@/lib/query-config";
import { fetchLatestWeather, refreshWeatherData } from "@/lib/weather-client";

const easeOut = [0.22, 1, 0.36, 1] as const;

const BLANK = "—";

export function CurrentWeatherPage() {
  const units = weatherDisplayUnits();
  const queryClient = useQueryClient();
  const {
    data,
    isPending,
    isError,
    error,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["weather", "latest"],
    queryFn: fetchLatestWeather,
    staleTime: weatherQueryConfig.latestStaleMs,
    refetchInterval: weatherQueryConfig.latestRefetchMs,
    refetchOnWindowFocus: true,
  });

  const historyFetching = useIsFetching({ queryKey: ["weather", "history"] });

  if (isPending && !data) {
    return (
      <div className="dashboard-shell pb-12">
        <LoadingSkeleton />
      </div>
    );
  }

  const offline = data ? !data.online : false;

  const lastUpdatedLabel =
    data?.online
      ? `${data.dateLocal ?? "—"} ${data.time}`
      : undefined;

  return (
    <div className="dashboard-shell pb-12">
      <DashboardHeader
        title={appConfig.station.name}
        subtitle={appConfig.station.label}
        online={data?.online ?? false}
        lastUpdated={lastUpdatedLabel}
        onRefresh={() => void refreshWeatherData(queryClient)}
        isRefreshing={isFetching || historyFetching > 0}
      />

      <PageHero
        title="Current conditions at a glance"
        subtitle={units.legend}
      />

      {isError && (
        <div className="mb-6">
          <ErrorBanner
            message={
              error instanceof Error
                ? error.message
                : "Unable to load weather data."
            }
          />
          {dataUpdatedAt > 0 && data ? (
            <p className="mt-2 text-sm text-ink-muted">
              Showing last successful data from{" "}
              <span className="font-mono">
                {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            </p>
          ) : null}
        </div>
      )}

      {data ? (
        <>
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: easeOut }}
          >
            <CurrentConditionsHero
              temperature={offline ? BLANK : data.temperature}
              windSummary={
                offline
                  ? BLANK
                  : `Wind ${data.wind} · ${data.speed}${
                      data.gust ? ` · Gust ${data.gust}` : ""
                    }`
              }
              humidity={offline ? BLANK : data.humidity}
              pressure={offline ? BLANK : data.pressure}
              dewPoint={offline ? BLANK : data.dewPoint}
              date={offline ? BLANK : (data.dateLocal ?? BLANK)}
              time={offline ? BLANK : data.time}
            />
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: easeOut }}
          >
            <SectionHeading
              title="Station metrics"
              description="Temperature, wind, pressure, rainfall, solar, and UV"
            />
            <MetricGrid data={data} offline={offline} refreshKey={dataUpdatedAt} />
          </motion.section>
        </>
      ) : isError ? (
        <p className="text-sm text-ink-muted">
          Check your API key and station ID in Settings, then refresh.
        </p>
      ) : null}
    </div>
  );
}
