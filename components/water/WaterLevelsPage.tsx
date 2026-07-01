"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageHero } from "@/components/layout/PageHero";
import { CsvUploadButton } from "@/components/water/CsvUploadButton";
import { DamDetails } from "@/components/water/DamDetails";
import { DamMap } from "@/components/water/DamMap";
import { DamSelect } from "@/components/water/DamSelect";
import { WaterControls } from "@/components/water/WaterControls";
import { WaterDataTable } from "@/components/water/WaterDataTable";
import { WaterKpiCards } from "@/components/water/WaterKpiCards";
import { WaterLevelChart } from "@/components/water/WaterLevelChart";
import { WaterOverview } from "@/components/water/WaterOverview";
import { WaterTimeline } from "@/components/water/WaterTimeline";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { aggregateKpis } from "@/lib/dams-status";
import {
  fetchDamReadings,
  fetchWaterMeta,
  fetchWaterOverview,
} from "@/lib/water-client";
import { addDaysYmd } from "@/lib/dams-format";

const DEFAULT_DAM = "Bhugtal";

function pickDefaultDam(names: string[]): string {
  if (names.includes(DEFAULT_DAM)) return DEFAULT_DAM;
  return names[0] ?? "";
}

const WATER_STALE_MS = 2 * 60_000;

export function WaterLevelsPage() {
  const queryClient = useQueryClient();

  const metaQuery = useQuery({
    queryKey: ["water", "meta"],
    queryFn: () => fetchWaterMeta(),
    staleTime: WATER_STALE_MS,
  });

  const latestDate = metaQuery.data?.latestDate ?? "";
  const dates = metaQuery.data?.dates ?? [];
  const damNames = metaQuery.data?.dams.map((d) => d.location) ?? [];
  const damMetaByName = useMemo(
    () => new Map(metaQuery.data?.dams.map((d) => [d.location, d]) ?? []),
    [metaQuery.data?.dams]
  );

  const [selectedDate, setSelectedDate] = useState("");
  const [latestOnly, setLatestOnly] = useState(true);
  const [focusDam, setFocusDam] = useState("");
  const [chartFrom, setChartFrom] = useState("");
  const [chartTo, setChartTo] = useState("");

  useEffect(() => {
    if (latestDate && !selectedDate) {
      setSelectedDate(latestDate);
      setChartTo(latestDate);
      setChartFrom(addDaysYmd(latestDate, -6));
    }
  }, [latestDate, selectedDate]);

  useEffect(() => {
    if (damNames.length && !focusDam) {
      setFocusDam(pickDefaultDam(damNames));
    }
  }, [damNames, focusDam]);

  const overviewQuery = useQuery({
    queryKey: ["water", "overview", selectedDate, latestOnly],
    queryFn: () => fetchWaterOverview(selectedDate, latestOnly),
    enabled: Boolean(selectedDate || latestOnly),
    staleTime: WATER_STALE_MS,
  });

  const readingsQuery = useQuery({
    queryKey: ["water", "readings", focusDam, chartFrom, chartTo],
    queryFn: () => fetchDamReadings(focusDam, chartFrom, chartTo),
    enabled: Boolean(focusDam && chartFrom && chartTo),
    staleTime: 5 * 60_000,
  });

  const detailsSnapshot = useMemo(
    () =>
      overviewQuery.data?.snapshots.find((s) => s.location === focusDam),
    [overviewQuery.data?.snapshots, focusDam]
  );

  const kpis = useMemo(() => {
    const snaps = overviewQuery.data?.snapshots ?? [];
    return overviewQuery.data?.overview.kpis ?? aggregateKpis(snaps);
  }, [overviewQuery.data]);

  const handleDateChange = (ymd: string) => {
    setSelectedDate(ymd);
    setLatestOnly(false);
  };

  const isLoading = metaQuery.isPending || overviewQuery.isPending;
  const isError = metaQuery.isError || overviewQuery.isError;
  const error = metaQuery.error ?? overviewQuery.error;

  return (
    <div className="dashboard-shell pb-12">
      <DashboardHeader
        title="Water Levels"
        subtitle="Small dams — storage, spill alerts & trends"
        online
        lastUpdated={
          overviewQuery.dataUpdatedAt
            ? new Date(overviewQuery.dataUpdatedAt).toLocaleTimeString()
            : undefined
        }
        onRefresh={() => {
          void (async () => {
            await queryClient.fetchQuery({
              queryKey: ["water", "meta"],
              queryFn: () => fetchWaterMeta(true),
            });
            await queryClient.fetchQuery({
              queryKey: ["water", "overview", selectedDate, latestOnly],
              queryFn: () =>
                fetchWaterOverview(selectedDate, latestOnly, true),
            });
            await readingsQuery.refetch();
          })();
        }}
        isRefreshing={
          metaQuery.isFetching ||
          overviewQuery.isFetching ||
          readingsQuery.isFetching
        }
        actions={
          metaQuery.data?.source === "csv" ? <CsvUploadButton /> : null
        }
      />

      <PageHero
        kicker="Reservoir monitoring"
        title="Water Levels & Status Dashboard of Small Dams"
        subtitle={
          metaQuery.data?.source === "google_sheets"
            ? "Live data from Google Sheets — updates when you refresh"
            : undefined
        }
      />

      {isError && (
        <div className="mb-6">
          <ErrorBanner
            message={
              error instanceof Error
                ? error.message
                : "Unable to load water level data."
            }
          />
        </div>
      )}

      {damNames.length > 0 && (
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <DamSelect
            label="Focus dam"
            value={focusDam}
            options={damNames}
            onChange={setFocusDam}
          />
        </div>
      )}

      {dates.length > 0 && (
        <WaterControls
          dates={dates}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          latestOnly={latestOnly}
          onLatestOnlyChange={setLatestOnly}
        />
      )}

      {!latestOnly && dates.length > 1 && (
        <WaterTimeline
          dates={dates}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
        />
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : overviewQuery.data ? (
        <>
          <WaterKpiCards kpis={kpis} />
          <WaterOverview overview={overviewQuery.data.overview} />
          <WaterDataTable snapshots={overviewQuery.data.snapshots} />
          {focusDam && chartFrom && chartTo && (
            <WaterLevelChart
              damNames={damNames}
              location={focusDam}
              onLocationChange={setFocusDam}
              damMeta={damMetaByName.get(focusDam)}
              readings={readingsQuery.data?.readings ?? []}
              trend={readingsQuery.data?.trend}
              from={chartFrom}
              to={chartTo}
              onFromChange={setChartFrom}
              onToChange={setChartTo}
              minDate={dates[0] ?? chartFrom}
              maxDate={latestDate}
            />
          )}
          <DamMap
            snapshots={overviewQuery.data.snapshots}
            highlightLocation={focusDam}
            onSelect={setFocusDam}
          />
          <DamDetails
            damNames={damNames}
            location={focusDam}
            onLocationChange={setFocusDam}
            dam={detailsSnapshot}
          />
        </>
      ) : null}
    </div>
  );
}
