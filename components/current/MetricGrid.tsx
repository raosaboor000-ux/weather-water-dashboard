"use client";

import {
  CloudRain,
  Gauge,
  Sun,
  Thermometer,
  Wind,
  Zap,
} from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import type { WeatherLatest } from "@/lib/types";
import { firstNumber, uvRiskLabel } from "@/lib/weather-parse";

type Props = {
  data: WeatherLatest;
  /** When this changes, cards re-animate on refresh. */
  refreshKey?: number;
};

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-50 text-brand-primary">
      {children}
    </div>
  );
}

export function MetricGrid({ data, refreshKey = 0 }: Props) {
  const uvNum = firstNumber(data.uv) ?? 0;

  const cards = [
    {
      title: "Temperature",
      primaryValue: data.temperature,
      details: [
        { label: "Dew point", value: data.dewPoint },
        { label: "Humidity", value: data.humidity },
        { label: "Heat index", value: data.heatIndex ?? "—" },
      ],
      icon: (
        <IconWrap>
          <Thermometer className="h-7 w-7" />
        </IconWrap>
      ),
      accent: "sky" as const,
    },
    {
      title: "Wind",
      primaryValue: data.speed,
      details: [
        { label: "Direction", value: data.wind },
        { label: "Gust", value: data.gust },
      ],
      icon: (
        <IconWrap>
          <Wind className="h-7 w-7" />
        </IconWrap>
      ),
      accent: "cyan" as const,
    },
    {
      title: "Pressure",
      primaryValue: data.pressure,
      details: [{ label: "Barometric", value: data.pressure }],
      icon: (
        <IconWrap>
          <Gauge className="h-7 w-7" />
        </IconWrap>
      ),
      accent: "slate" as const,
    },
    {
      title: "Rainfall",
      primaryValue: data.precipTotal ?? "0.00 mm",
      details: [
        { label: "Precip rate", value: data.precipRate ?? "0.00 mm" },
        { label: "Rain today", value: data.precipTotal ?? "0.00 mm" },
      ],
      icon: (
        <IconWrap>
          <CloudRain className="h-7 w-7" />
        </IconWrap>
      ),
      accent: "cyan" as const,
    },
    {
      title: "Solar radiation",
      primaryValue: data.solar,
      details: [{ label: "Current", value: data.solar }],
      icon: (
        <IconWrap>
          <Sun className="h-7 w-7" />
        </IconWrap>
      ),
      accent: "amber" as const,
    },
    {
      title: "UV index",
      primaryValue: data.uv,
      details: [
        { label: "UV risk", value: uvRiskLabel(uvNum) },
        { label: "Daily high", value: data.dailyHigh ?? "—" },
        { label: "Daily low", value: data.dailyLow ?? "—" },
      ],
      icon: (
        <IconWrap>
          <Zap className="h-7 w-7" />
        </IconWrap>
      ),
      accent: "amber" as const,
    },
  ];

  return (
    <div
      key={refreshKey}
      className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
    >
      {cards.map((card, index) => (
        <MetricCard key={card.title} {...card} index={index} />
      ))}
    </div>
  );
}
