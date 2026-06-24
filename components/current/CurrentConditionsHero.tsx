"use client";

import { motion } from "framer-motion";
import { StationLocationMap } from "@/components/current/StationLocationMap";
import { Card } from "@/components/ui/Card";

type Props = {
  temperature: string;
  windSummary: string;
  humidity: string;
  pressure: string;
  dewPoint: string;
  date: string;
  time: string;
};

const metrics = [
  { label: "Humidity", valueKey: "humidity" as const },
  { label: "Pressure", valueKey: "pressure" as const },
  { label: "Dew point", valueKey: "dewPoint" as const },
  { label: "Date", valueKey: "date" as const },
  { label: "Time", valueKey: "time" as const },
];

export function CurrentConditionsHero({
  temperature,
  windSummary,
  humidity,
  pressure,
  dewPoint,
  date,
  time,
}: Props) {
  const values = { humidity, pressure, dewPoint, date, time };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(280px,360px)]">
          <div className="border-b border-slate-200/80 bg-gradient-to-br from-sky-50/80 via-white to-white p-6 md:p-8 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Current temperature
            </p>
            <p className="mt-2 text-6xl font-semibold tabular-nums leading-none text-brand-primary md:text-7xl">
              {temperature}
            </p>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-ink-muted">
              {windSummary}
            </p>
          </div>

          <div className="border-b border-slate-200/80 p-6 md:p-8 lg:border-b-0 lg:border-r">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Station readings
            </p>
            <dl className="grid grid-cols-2 gap-3 sm:gap-4">
              {metrics.map(({ label, valueKey }) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3.5"
                >
                  <dt className="text-xs font-medium text-ink-subtle">{label}</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-ink sm:text-xl">
                    {values[valueKey]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col justify-center bg-slate-50/40 p-6 md:p-8">
            <StationLocationMap />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
