import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Allow chart axis labels to extend outside the panel */
  clip?: boolean;
};

export function ChartPanel({
  children,
  className = "h-[220px]",
  clip = true,
}: Props) {
  return (
    <div
      className={`relative rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50/50 via-white to-cyan-50/30 p-4 shadow-card ${clip ? "overflow-hidden" : "overflow-visible"} ${className}`}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-40 rounded-full bg-sky-200/20 blur-2xl"
        aria-hidden
      />
      <div className="relative h-full min-h-0 w-full">{children}</div>
    </div>
  );
}
