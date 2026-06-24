"use client";

import dynamic from "next/dynamic";
import type { DamSnapshot } from "@/lib/dams-types";

const DamMapLeaflet = dynamic(
  () =>
    import("@/components/water/DamMapLeaflet").then((m) => m.DamMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-ink-subtle">
        Loading map…
      </div>
    ),
  }
);

type Props = {
  snapshots: DamSnapshot[];
  highlightLocation?: string;
  onSelect?: (location: string) => void;
};

export function DamMap({ snapshots, highlightLocation, onSelect }: Props) {
  return (
    <div className="mb-8">
      <h2 className="mb-2 font-display text-lg font-semibold text-ink">
        Dams on map (colored by status)
      </h2>
      <DamMapLeaflet
        snapshots={snapshots}
        highlightLocation={highlightLocation}
        onSelect={onSelect}
      />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#eab308]" /> Below dead level
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ef4444]" /> Low storage
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#f97316]" /> Medium storage
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#22c55e]" /> High storage
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#3b82f6]" /> Spill watch /
          anytime / spilling
        </span>
      </div>
    </div>
  );
}
