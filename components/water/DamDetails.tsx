"use client";

import type { DamSnapshot } from "@/lib/dams-types";
import {
  spillStatusLabel,
  storageStatusLabel,
  trendLabel,
} from "@/lib/dams-status";
import { formatDamDateLabel } from "@/lib/dams-format";
import { Card } from "@/components/ui/Card";
import { DamSelect } from "@/components/water/DamSelect";

type Props = {
  damNames: string[];
  location: string;
  onLocationChange: (name: string) => void;
  dam: DamSnapshot | undefined;
};

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function fmtNum(n?: number, suffix = ""): string {
  if (n == null) return "—";
  return `${n.toLocaleString()}${suffix}`;
}

export function DamDetails({
  damNames,
  location,
  onLocationChange,
  dam,
}: Props) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">
          Dam details
        </h2>
        <DamSelect
          label="Dam"
          value={location}
          options={damNames}
          onChange={onLocationChange}
        />
      </div>

      {!dam ? (
        <p className="text-sm text-ink-muted">No data for this dam.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail
            label="Reading date"
            value={formatDamDateLabel(dam.date)}
          />
          <Detail
            label="Water level"
            value={`${dam.waterLevelFt.toFixed(1)} ft`}
          />
          <Detail
            label="Storage fill"
            value={dam.fillPct != null ? `${dam.fillPct.toFixed(1)}%` : "—"}
          />
          <Detail label="Storage status" value={storageStatusLabel(dam.storageStatus)} />
          <Detail
            label="Spill status"
            value={
              dam.spillStatus !== "none"
                ? spillStatusLabel(dam.spillStatus)
                : "None"
            }
          />
          <Detail label="7-day trend" value={trendLabel(dam.trend7d)} />
          <Detail label="Height" value={fmtNum(dam.heightFt, " ft")} />
          <Detail label="Completion cost" value={fmtNum(dam.completionCost, " M")} />
          <Detail label="Gross storage" value={fmtNum(dam.grossStorageAft, " Aft")} />
          <Detail label="Live storage" value={fmtNum(dam.liveStorageAft, " Aft")} />
          <Detail label="C.C.A." value={fmtNum(dam.ccaAcres, " acres")} />
          <Detail label="Channel capacity" value={fmtNum(dam.channelCapacityCfs, " Cfs")} />
          <Detail label="Canal length" value={fmtNum(dam.canalLengthFt, " ft")} />
          <Detail label="DSL" value={fmtNum(dam.dslFt, " ft")} />
          <Detail label="NPL" value={fmtNum(dam.nplFt, " ft")} />
          <Detail label="HFL" value={fmtNum(dam.hflFt, " ft")} />
          <Detail label="River / nullah" value={dam.river ?? "—"} />
          <Detail
            label="Year of completion"
            value={dam.yearCompleted != null ? String(dam.yearCompleted) : "—"}
          />
          <Detail
            label="Catchment area"
            value={fmtNum(dam.catchmentSqKm, " sq km")}
          />
          {dam.latitude != null && dam.longitude != null && (
            <Detail
              label="Coordinates"
              value={`${dam.latitude.toFixed(5)}, ${dam.longitude.toFixed(5)}`}
            />
          )}
        </div>
      )}
    </Card>
  );
}
