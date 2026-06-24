"use client";

import dynamic from "next/dynamic";
import { appConfig } from "@/lib/config";

const StationLocationMapLeaflet = dynamic(
  () =>
    import("@/components/current/StationLocationMapLeaflet").then(
      (m) => m.StationLocationMapLeaflet
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100 sm:h-64 lg:h-72" />
    ),
  }
);

export function StationLocationMap() {
  const { lat, lng } = appConfig.station;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Station location
        </p>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          {lat.toFixed(3)}° N, {lng.toFixed(3)}° E
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 shadow-md shadow-slate-200/40">
        <StationLocationMapLeaflet />
      </div>
    </div>
  );
}
