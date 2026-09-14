"use client";

import dynamic from "next/dynamic";
import type { MiniDamPoint, RainfallEvent } from "@/lib/risk-profile-data";

const RiskCatchmentMap = dynamic(
  () =>
    import("@/components/risk-profile/RiskCatchmentMap").then(
      (m) => m.RiskCatchmentMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-ink-subtle">
        Loading map…
      </div>
    ),
  }
);

type Props = {
  mode?: "study" | "rainfall" | "mini_dams" | "slope";
  event?: RainfallEvent | null;
  miniDams?: MiniDamPoint[];
  showLabels?: boolean;
  className?: string;
};

export function RiskMap(props: Props) {
  return <RiskCatchmentMap {...props} />;
}
