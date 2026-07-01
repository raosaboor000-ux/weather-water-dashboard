"use client";

import type { ReactNode } from "react";
import type { DamSnapshot } from "@/lib/dams-types";
import {
  calculatedStorageAft,
  capacityBandColor,
  displayStatusLabel,
  snapshotCapacityBand,
} from "@/lib/dams-status";

type Props = {
  dam: DamSnapshot;
};

function ScaleLabel({
  pct,
  children,
  className = "",
}: {
  pct: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`absolute top-0 -translate-x-1/2 text-[11px] leading-tight ${className}`}
      style={{ left: `${pct}%` }}
    >
      {children}
    </span>
  );
}

export function DamFillGauge({ dam }: Props) {
  const fill = dam.fillPct ?? 0;
  const band = snapshotCapacityBand(dam);
  const fillColor = capacityBandColor(band);
  const storageAft = calculatedStorageAft(dam.liveStorageAft, dam.fillPct);

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-stretch">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                Reservoir fill
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {dam.fillPct != null ? `${dam.fillPct.toFixed(1)}%` : "—"}{" "}
                <span className="text-base font-medium text-ink-muted">
                  filled
                </span>
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: fillColor }}
            >
              {displayStatusLabel(dam)}
            </span>
          </div>

          <div className="max-w-xl">
            <div className="relative h-5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, fill))}%`,
                  backgroundColor: fillColor,
                }}
              />
              {[25, 50, 75].map((pct) => (
                <div
                  key={pct}
                  className="absolute top-0 h-full w-px bg-white/70"
                  style={{ left: `${pct}%` }}
                  aria-hidden
                />
              ))}
            </div>

            <div className="relative mt-2 h-9 text-[11px] leading-tight">
              <span className="absolute left-0 top-0 text-purple-600">
                {dam.dslFt != null ? (
                  <>
                    <span className="font-semibold">DSL</span>{" "}
                    {dam.dslFt.toFixed(1)} ft
                  </>
                ) : (
                  <span className="text-ink-faint">DSL —</span>
                )}
              </span>
              <ScaleLabel pct={25} className="text-ink-faint">
                25%
              </ScaleLabel>
              <ScaleLabel pct={50} className="text-ink-faint">
                50%
              </ScaleLabel>
              <ScaleLabel pct={75} className="text-ink-faint">
                75%
              </ScaleLabel>
              <span className="absolute right-0 top-0 text-right text-blue-600">
                {dam.nplFt != null ? (
                  <>
                    <span className="font-semibold">NPL</span>{" "}
                    {dam.nplFt.toFixed(1)} ft
                  </>
                ) : (
                  <span className="text-ink-faint">NPL —</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-1 flex-col justify-center rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase text-ink-subtle">
              Water level
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
              {dam.waterLevelFt.toFixed(1)} ft
            </p>
          </div>
          <div className="flex flex-1 flex-col justify-center rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase text-ink-subtle">
              Calculated storage
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
              {storageAft != null
                ? `${storageAft.toLocaleString(undefined, { maximumFractionDigits: 0 })} Aft`
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
