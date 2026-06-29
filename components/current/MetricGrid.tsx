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
  offline?: boolean;
  /** When this changes, cards re-animate on refresh. */
  refreshKey?: number;
};

const BLANK = "—";

function val(value: string, offline: boolean) {
  return offline ? BLANK : value;
}

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-50 text-brand-primary">
      {children}
    </div>
  );
}

export function MetricGrid({ data, offline = false, refreshKey = 0 }: Props) {
  const uvNum = firstNumber(data.uv) ?? 0;

  const cards = [
    {
      title: "Temperature",
      primaryValue: val(data.temperature, offline),
      details: [
        { label: "Dew point", value: val(data.dewPoint, offline) },
        { label: "Humidity", value: val(data.humidity, offline) },
        { label: "Heat index", value: offline ? BLANK : (data.heatIndex ?? BLANK) },
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
      primaryValue: val(data.speed, offline),
      details: [
        { label: "Direction", value: val(data.wind, offline) },
        { label: "Gust", value: val(data.gust, offline) },
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
      primaryValue: val(data.pressure, offline),
      details: [{ label: "Barometric", value: val(data.pressure, offline) }],
      icon: (
        <IconWrap>
          <Gauge className="h-7 w-7" />
        </IconWrap>
      ),
      accent: "slate" as const,
    },
    {
      title: "Rainfall",
      primaryValue: val(data.precipTotal ?? "0.00 mm", offline),
      details: [
        { label: "Precip rate", value: val(data.precipRate ?? "0.00 mm", offline) },
        { label: "Rain today", value: val(data.precipTotal ?? "0.00 mm", offline) },
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
      primaryValue: val(data.solar, offline),
      details: [{ label: "Current", value: val(data.solar, offline) }],
      icon: (
        <IconWrap>
          <Sun className="h-7 w-7" />
        </IconWrap>
      ),
      accent: "amber" as const,
    },
    {
      title: "UV index",
      primaryValue: val(data.uv, offline),
      details: [
        { label: "UV risk", value: offline ? BLANK : uvRiskLabel(uvNum) },
        { label: "Daily high", value: offline ? BLANK : (data.dailyHigh ?? BLANK) },
        { label: "Daily low", value: offline ? BLANK : (data.dailyLow ?? BLANK) },
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
