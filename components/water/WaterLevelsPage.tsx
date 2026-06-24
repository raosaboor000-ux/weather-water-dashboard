"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageHero } from "@/components/layout/PageHero";
import { CsvUploadButton } from "@/components/water/CsvUploadButton";
import { DamDetails } from "@/components/water/DamDetails";
import { DamMap } from "@/components/water/DamMap";
import { WaterControls } from "@/components/water/WaterControls";
import { WaterDataTable } from "@/components/water/WaterDataTable";
import { WaterLevelChart } from "@/components/water/WaterLevelChart";
import { WaterOverview } from "@/components/water/WaterOverview";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
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

export function WaterLevelsPage() {
  const metaQuery = useQuery({
    queryKey: ["water", "meta"],
    queryFn: fetchWaterMeta,
    staleTime: 5 * 60_000,
  });

  const latestDate = metaQuery.data?.latestDate ?? "";
  const dates = metaQuery.data?.dates ?? [];
  const damNames = metaQuery.data?.dams.map((d) => d.location) ?? [];

  const [selectedDate, setSelectedDate] = useState("");
  const [latestOnly, setLatestOnly] = useState(true);
  const [chartDam, setChartDam] = useState("");
  const [detailsDam, setDetailsDam] = useState("");
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
    if (damNames.length) {
      if (!chartDam) setChartDam(pickDefaultDam(damNames));
      if (!detailsDam) setDetailsDam(pickDefaultDam(damNames));
    }
  }, [damNames, chartDam, detailsDam]);

  const overviewQuery = useQuery({
    queryKey: ["water", "overview", selectedDate, latestOnly],
    queryFn: () => fetchWaterOverview(selectedDate, latestOnly),
    enabled: Boolean(selectedDate || latestOnly),
    staleTime: 5 * 60_000,
  });

  const readingsQuery = useQuery({
    queryKey: ["water", "readings", chartDam, chartFrom, chartTo],
    queryFn: () => fetchDamReadings(chartDam, chartFrom, chartTo),
    enabled: Boolean(chartDam && chartFrom && chartTo),
    staleTime: 5 * 60_000,
  });

  const detailsSnapshot = useMemo(
    () =>
      overviewQuery.data?.snapshots.find((s) => s.location === detailsDam),
    [overviewQuery.data?.snapshots, detailsDam]
  );

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
          void metaQuery.refetch();
          void overviewQuery.refetch();
          void readingsQuery.refetch();
        }}
        isRefreshing={
          metaQuery.isFetching ||
          overviewQuery.isFetching ||
          readingsQuery.isFetching
        }
        actions={<CsvUploadButton />}
      />

      <PageHero
        kicker="Reservoir monitoring"
        title="Water Levels & Status Dashboard of Small Dams"
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

      {dates.length > 0 && (
        <WaterControls
          dates={dates}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          latestOnly={latestOnly}
          onLatestOnlyChange={setLatestOnly}
        />
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : overviewQuery.data ? (
        <>
          <WaterOverview overview={overviewQuery.data.overview} />
          <WaterDataTable snapshots={overviewQuery.data.snapshots} />
          {chartDam && chartFrom && chartTo && (
            <WaterLevelChart
              damNames={damNames}
              location={chartDam}
              onLocationChange={setChartDam}
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
            highlightLocation={detailsDam}
            onSelect={(name) => {
              setDetailsDam(name);
              setChartDam(name);
            }}
          />
          <DamDetails
            damNames={damNames}
            location={detailsDam}
            onLocationChange={setDetailsDam}
            dam={detailsSnapshot}
          />
        </>
      ) : null}
    </div>
  );
}
