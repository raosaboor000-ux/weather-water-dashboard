import Link from "next/link";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Card } from "@/components/ui/Card";
import { appConfig } from "@/lib/config";

const phases = [
  { n: 1, label: "Architecture + skeleton", status: "Complete" },
  { n: 2, label: "Layout + UI components", status: "Complete" },
  { n: 3, label: "Weather Underground API", status: "Complete" },
  { n: 4, label: "Current weather dashboard", status: "Complete" },
  { n: 5, label: "Interactive charts", status: "Complete" },
  { n: 6, label: "Google Sheets storage", status: "Complete" },
  { n: 7, label: "Historical display", status: "Complete" },
  { n: 8, label: "Water levels dashboard", status: "Complete" },
  { n: 9, label: "Final polish", status: "Pending" },
];

export default function AboutPage() {
  return (
    <div className="dashboard-shell pb-12">
      <DashboardHeader
        title="About"
        subtitle="WeatherWaterDashboard — independent from MACH"
      />

      <Card className="p-6 md:p-8">
        <p className="text-sm leading-relaxed text-ink-muted">
          This dashboard monitors Weather Underground PWS{" "}
          <strong className="text-ink">{appConfig.station.name}</strong> (
          <span className="font-mono">{appConfig.station.id}</span>). It is built
          with the same stack as MACH —{" "}
          <strong className="text-ink">Next.js, React, TypeScript, and Tailwind CSS</strong>{" "}
          — but is a separate project with improved layout and a single-station focus.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          MACH under <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">mach1/</code>{" "}
          is reference-only and was not modified.
        </p>

        <h2 className="mt-8 font-display text-base font-semibold text-ink">
          Development phases
        </h2>
        <ul className="mt-4 space-y-2">
          {phases.map((p) => (
            <li
              key={p.n}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm"
            >
              <span className="text-ink-muted">
                Phase {p.n}: {p.label}
              </span>
              <span
                className={`font-medium ${
                  p.status === "Complete"
                    ? "text-emerald-600"
                    : p.status === "Next"
                      ? "text-brand-primary"
                      : "text-ink-faint"
                }`}
              >
                {p.status}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm text-ink-subtle">
          Run locally:{" "}
          <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs">
            npm run dev
          </code>{" "}
          then open{" "}
          <Link href="/current" className="text-brand-primary hover:underline">
            /current
          </Link>
        </p>
      </Card>
    </div>
  );
}
