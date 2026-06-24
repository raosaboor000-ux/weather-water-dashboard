"use client";

import { useState } from "react";
import type { DamSnapshot } from "@/lib/dams-types";
import { spillStatusLabel, storageStatusLabel } from "@/lib/dams-status";
import { Card } from "@/components/ui/Card";

type Props = {
  overview: {
    maxStorage?: DamSnapshot;
    lowestStorage?: DamSnapshot;
    belowDead: DamSnapshot[];
    spillAlerts: DamSnapshot[];
  };
};

function Highlight({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
        {title}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-ink-muted">{sub}</p> : null}
    </div>
  );
}

export function WaterOverview({ overview }: Props) {
  const { maxStorage, lowestStorage, belowDead, spillAlerts } = overview;
  const [tab, setTab] = useState<"storage" | "spill">("storage");

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink">
        Overview &amp; Spill Alerts
      </h2>

      <div className="mb-4 border-b border-slate-200">
        <div className="flex gap-1">
          {(
            [
              ["storage", "Storage overview"],
              ["spill", "Spill alerts"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition ${
                tab === id
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-ink-subtle hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "storage" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Highlight
            title="Dam(s) with max storage"
            value={maxStorage?.location ?? "—"}
            sub={
              maxStorage?.fillPct != null
                ? `${maxStorage.fillPct.toFixed(1)}% fill · ${maxStorage.waterLevelFt.toFixed(1)} ft`
                : undefined
            }
          />
          <Highlight
            title="Dam(s) with lowest storage"
            value={lowestStorage?.location ?? "—"}
            sub={
              lowestStorage?.fillPct != null
                ? `${lowestStorage.fillPct.toFixed(1)}% fill · ${lowestStorage.waterLevelFt.toFixed(1)} ft`
                : undefined
            }
          />
          <Highlight
            title="Dam(s) below dead level"
            value={
              belowDead.length
                ? belowDead.map((d) => d.location).join(", ")
                : "None"
            }
            sub={
              belowDead.length
                ? belowDead
                    .map((d) => `${d.waterLevelFt.toFixed(1)} ft (DSL ${d.dslFt ?? "—"})`)
                    .join(" · ")
                : undefined
            }
          />
        </div>
      ) : (
        <div>
          {spillAlerts.length > 0 ? (
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
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-ink-muted">
              No spill watch, spill anytime, or spilling dams for this selection.
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            <strong>Spill Watch:</strong> within ~2 ft below NPL ·{" "}
            <strong>Spill Anytime:</strong> at NPL ·{" "}
            <strong>Spilling:</strong> above NPL
          </p>
        </div>
      )}
    </div>
  );
}
