"use client";

import type { WaterKpis } from "@/lib/dams-status";
import { Card } from "@/components/ui/Card";

type Props = {
  kpis: WaterKpis;
};

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-ink-muted">{sub}</p> : null}
    </Card>
  );
}

export function WaterKpiCards({ kpis }: Props) {
  const {
    totalMonitored,
    totalLiveStorageAft,
    avgFillPct,
    spillAlertCount,
    belowDeadCount,
  } = kpis;

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Kpi label="Total monitored" value={String(totalMonitored)} />
      <Kpi
        label="Total live storage"
        value={
          totalLiveStorageAft > 0
            ? totalLiveStorageAft.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })
            : "—"
        }
        sub="Acre-feet (current)"
      />
      <Kpi
        label="Average capacity"
        value={avgFillPct != null ? `${avgFillPct.toFixed(1)}%` : "—"}
      />
      <Kpi
        label="Spill / watch alerts"
        value={spillAlertCount > 0 ? String(spillAlertCount) : "None"}
        sub={spillAlertCount > 0 ? "Dams at or near NPL" : undefined}
      />
      <Kpi
        label="Dams under DSL"
        value={belowDeadCount > 0 ? String(belowDeadCount) : "None"}
      />
    </div>
  );
}
