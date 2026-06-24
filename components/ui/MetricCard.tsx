"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/Card";

const easeOut = [0.22, 1, 0.36, 1] as const;

type DetailRow = {
  label: string;
  value: string;
};

type Props = {
  title: string;
  primaryValue: string;
  primaryLabel?: string;
  details?: DetailRow[];
  icon?: ReactNode;
  accent?: "sky" | "cyan" | "amber" | "slate";
  index?: number;
};

const accentMap = {
  sky: "from-sky-500/10 to-sky-50",
  cyan: "from-cyan-500/10 to-cyan-50",
  amber: "from-amber-500/10 to-amber-50",
  slate: "from-slate-500/10 to-slate-50",
};

export function MetricCard({
  title,
  primaryValue,
  primaryLabel = "Current",
  details = [],
  icon,
  accent = "sky",
  index = 0,
}: Props) {
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: easeOut }}
    >
      <Card className="flex h-full flex-col overflow-hidden">
        <div
          className={`flex shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-r ${accentMap[accent]} px-4 py-2.5`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
            {title}
          </span>
          <Info className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
        </div>
        <div className="flex flex-1 gap-4 p-4">
          <div className="flex w-24 shrink-0 items-center justify-center">
            {icon ?? (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-bold text-brand-primary">
                —
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              {primaryLabel}
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">
              {primaryValue}
            </p>
            <div className="mt-3 flex min-h-[8.75rem] flex-1 flex-col space-y-2 border-t border-slate-100 pt-3">
              {details.map((row) => (
                <div key={row.label}>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                    {row.label}
                  </p>
                  <p className="text-sm font-medium tabular-nums text-ink-muted">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
