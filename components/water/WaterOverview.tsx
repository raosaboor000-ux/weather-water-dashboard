"use client";

import type { DamSnapshot } from "@/lib/dams-types";
import {
  spillStatusLabel,
  storageStatusLabel,
} from "@/lib/dams-status";
import { Card } from "@/components/ui/Card";

type Props = {
  overview: {
    spillAlerts: DamSnapshot[];
  };
};

export function WaterOverview({ overview }: Props) {
  const { spillAlerts } = overview;

  if (spillAlerts.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink">
        Spill alerts
      </h2>
      <Card className="border-blue-200/80 bg-blue-50/40 p-4">
        <ul className="space-y-2 text-sm text-blue-900/90">
          {spillAlerts.map((d) => (
            <li key={d.location}>
              <strong>{d.location}</strong> —{" "}
              {spillStatusLabel(d.spillStatus)} ·{" "}
              {d.waterLevelFt.toFixed(1)} ft (NPL{" "}
              {d.nplFt?.toFixed(1) ?? "—"} ft) ·{" "}
              {storageStatusLabel(d.storageStatus)}
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        <strong>Spill Watch:</strong> within ~2 ft below NPL ·{" "}
        <strong>Spill Anytime:</strong> at NPL ·{" "}
        <strong>Spilling:</strong> above NPL
      </p>
    </div>
  );
}
