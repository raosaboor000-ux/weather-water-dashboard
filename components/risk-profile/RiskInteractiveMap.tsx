"use client";

import dynamic from "next/dynamic";

const RiskInteractiveMapPanel = dynamic(
  () =>
    import("@/components/risk-profile/RiskInteractiveMapLeaflet").then(
      (m) => m.RiskInteractiveMapPanel
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[640px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-sm text-ink-muted shadow-card">
        Loading interactive map…
      </div>
    ),
  }
);

export function RiskInteractiveMap() {
  return <RiskInteractiveMapPanel />;
}
