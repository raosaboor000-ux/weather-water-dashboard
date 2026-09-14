"use client";

import { useState } from "react";
import {
  CloudRain,
  Layers,
  Mountain,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageHero } from "@/components/layout/PageHero";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RiskInteractiveMap } from "@/components/risk-profile/RiskInteractiveMap";
import { RiskEventMap } from "@/components/risk-profile/RiskEventMap";
import { RiskLabeledMapCard } from "@/components/risk-profile/RiskLabeledMapCard";
import {
  AnnualMaxHeatmap,
  AnnualTotalSparklines,
  BuiltUpSparklines,
  RainfallRankCharts,
  RiskScoreBars,
} from "@/components/risk-profile/RiskCharts";
import {
  CATCHMENTS,
  MINI_DAMS_BOUNDS,
  RAINFALL_EVENTS,
  RISK_SUMMARY,
  RISK_TIER_META,
  catchmentsByScoreDesc,
  catchmentsBySlopeDesc,
  growthCardStats,
  screeningBuiltUpPctNow,
  type RiskTier,
} from "@/lib/risk-profile-data";

const SUB_NAV = [
  { id: "rp-overview", label: "Overview", icon: ShieldAlert },
  { id: "rp-rainfall", label: "Rainfall", icon: CloudRain },
  { id: "rp-land", label: "Land Cover", icon: Layers },
  { id: "rp-terrain", label: "Terrain", icon: Mountain },
  { id: "rp-screening", label: "Flash-Flood Screening", icon: TriangleAlert },
] as const;

function TierBadge({ tier }: { tier: RiskTier }) {
  const meta = RISK_TIER_META[tier];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-ink-muted">{sub}</p> : null}
    </Card>
  );
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 100;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export function RiskProfilePage() {
  const [eventId, setEventId] = useState(
    () =>
      RAINFALL_EVENTS.find((e) => e.date === "2021-09-08")?.id ??
      RAINFALL_EVENTS[0].id
  );
  const ranked = catchmentsByScoreDesc();
  const bySlope = catchmentsBySlopeDesc();

  return (
    <div className="dashboard-shell pb-12">
      <DashboardHeader
        title="Risk Profile"
        subtitle="Catchment flood-risk screening — Talagang small dams"
        online
      />

      <PageHero
        kicker="Screening analysis"
        title="Catchments Flood Risk Profile of Small Dams Division Talagang"
        subtitle="Daily CHIRPS rainfall since 2000, land-cover change since 2000, SRTM-derived terrain, and a combined flash-flood screening score to prioritize catchments for full hydrologic studies."
      />

      <div className="mb-8 flex flex-wrap gap-1.5">
        {SUB_NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToId(id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-sky-300 hover:text-ink"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div
        id="rp-overview"
        className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Kpi
          label="Combined area"
          value={`${RISK_SUMMARY.combinedAreaKm2} km²`}
          sub={`Across ${RISK_SUMMARY.catchmentCount} Pothohar catchments`}
        />
        <Kpi
          label="Avg. annual rainfall"
          value={`${RISK_SUMMARY.avgAnnualRainfallMm} mm`}
          sub="Mean across all 8 catchments"
        />
        <Kpi
          label="Highest screening risk"
          value={`${RISK_SUMMARY.highestRiskName}`}
          sub={`Score ${RISK_SUMMARY.highestRiskScore} / 100`}
        />
        <Kpi
          label="Highest daily on record"
          value={`${RISK_SUMMARY.highestDailyMm} mm`}
          sub={`${RISK_SUMMARY.highestDailyWhere} · ${RISK_SUMMARY.highestDailyDate}`}
        />
      </div>

      <section className="mb-12">
        <SectionHeading
          title="01 Study area"
          description="Small dams location and catchment areas (from the flood-risk profile study)."
        />
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/risk-profile/study_area_dams_map.png"
            alt="Small dams location and catchment areas map"
            className="h-auto w-full"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted">
          {CATCHMENTS.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              {c.name} · {c.areaKm2} km²
            </span>
          ))}
        </div>
      </section>

      <section id="rp-rainfall" className="mb-12 scroll-mt-[100px]">
        <SectionHeading
          title="02 Rainfall — 2000 to present"
          description="Catchment-mean daily rainfall from CHIRPS (0.05°, ≈5.5 km), aggregated per catchment for complete years 2000–2025. “Avg of annual-max-daily” is the mean of each year’s single wettest day — relevant to flash-flood intensity."
        />

        <Card className="mb-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Catchment</th>
                <th className="px-3 py-3">Area km²</th>
                <th className="px-3 py-3">Avg annual mm</th>
                <th className="px-3 py-3">Avg daily mm</th>
                <th className="px-3 py-3">Avg of annual-max-daily mm</th>
                <th className="px-3 py-3">All-time max daily mm</th>
                <th className="px-3 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {[...CATCHMENTS]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-ink">
                      {c.name}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{c.areaKm2}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {c.rainfall.avgAnnualMm}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {c.rainfall.avgDailyMm}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {c.rainfall.avgAnnualMaxDailyMm}
                    </td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums text-sky-700">
                      {c.rainfall.allTimeMaxDailyMm}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-ink-muted">
                      {c.rainfall.allTimeMaxDate}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>

        <RainfallRankCharts />

        <div className="mt-8 space-y-8">
          <AnnualMaxHeatmap catchments={CATCHMENTS} />
          <AnnualTotalSparklines catchments={CATCHMENTS} />
        </div>

        <div className="mt-10">
          <SectionHeading
            title="03 Spatial variation — rainfall events"
            description="Each option is a specific calendar day: the heaviest rainfall day of each year, plus the heaviest days overall. Maps use a shared color scale so any two events are visually comparable."
          />
          <RiskEventMap eventId={eventId} onEventIdChange={setEventId} />
        </div>
      </section>

      <section id="rp-land" className="mb-12 scroll-mt-[100px]">
        <SectionHeading
          title="04 Built-up area change"
          description="Built-up surface from GHSL (100 m) comparing 2000 and 2020. Growth is small as a share of catchment area but concentrated near settlements."
        />

        <Card className="mb-6 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Catchment</th>
                <th className="px-3 py-3">Area km²</th>
                <th className="px-3 py-3">Built-up 2000 km²</th>
                <th className="px-3 py-3">Built-up 2020 km²</th>
                <th className="px-3 py-3">Increase km²</th>
                <th className="px-3 py-3">Increase %</th>
                <th className="px-3 py-3">% catchment 2000</th>
                <th className="px-3 py-3">% catchment 2020</th>
              </tr>
            </thead>
            <tbody>
              {[...CATCHMENTS]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium">{c.name}</td>
                    <td className="px-3 py-2.5 tabular-nums">{c.areaKm2}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {c.builtUp.km2_2000.toFixed(3)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {c.builtUp.km2_2020.toFixed(3)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      +{c.builtUp.increaseKm2.toFixed(3)}
                    </td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums text-rose-700">
                      +{c.builtUp.increasePct}%
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {c.builtUp.pctCatchment2000.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {c.builtUp.pctCatchment2020.toFixed(1)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>

        <BuiltUpSparklines catchments={CATCHMENTS} />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <RiskLabeledMapCard
            src="/risk-profile/ghsl/ghsl_builtup_2000.png"
            alt="GHSL built-up surface 2000"
            caption="2000 · GHSL built-up surface, 100 m"
            imgW={900}
            imgH={407}
            fontSize={13}
          />
          <RiskLabeledMapCard
            src="/risk-profile/ghsl/ghsl_builtup_2020.png"
            alt="GHSL built-up surface 2020"
            caption="2020 · GHSL built-up surface, 100 m"
            imgW={900}
            imgH={407}
            fontSize={13}
          />
        </div>

        <div className="mt-4">
          <div
            className="h-3 rounded border border-slate-200"
            style={{
              background:
                "linear-gradient(90deg, #fcfcfb, #fee08b, #eb6834, #d73027, #7f0000)",
            }}
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-ink-muted">
            <span>0% built</span>
            <span>10% built</span>
            <span>20% built</span>
            <span>30% built</span>
            <span>≥40% built</span>
          </div>
          <p className="mt-2 w-full text-sm leading-relaxed text-ink-muted">
            Per-pixel share of a 100 m cell covered by built-up surface — most of
            each catchment is near 0%; color picks out villages, roads, and
            settlement clusters. Same scale on both years, so any visible
            reddening between 2000 and 2020 is real growth, not a rescale.
          </p>
        </div>

        <div className="mt-8">
          <h3 className="font-display text-base font-semibold tracking-tight text-ink">
            Where new built-up appears, 2000 → 2020
          </h3>
          <p className="mt-1.5 w-full text-sm leading-relaxed text-ink-muted">
            Every catchment shows some GHSL-detected built-up growth between 2000
            and 2020, but in all eight it&apos;s a small share of catchment area
            (+0.29 to +0.66 percentage points). These panels crop tight to each
            catchment and highlight only pixels that measurably gained built-up
            cover, sorted by new area gained.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            {[...CATCHMENTS]
              .sort((a, b) => b.builtUp.increaseKm2 - a.builtUp.increaseKm2)
              .map((c) => {
                const stats = growthCardStats(c);
                return (
                  <div
                    key={c.id}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card"
                  >
                    <div className="flex h-[220px] items-center justify-center bg-white">
                      {stats.imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={stats.imageSrc}
                          alt={`${c.name} built-up growth 2000 to 2020`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-[11px] text-ink-subtle">
                          No map
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-2.5 text-[12px] leading-snug">
                      <span className="min-w-0 truncate font-semibold text-ink">
                        {c.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-ink-muted">
                        +{stats.increaseKm2.toFixed(2)} km² (+
                        {stats.growthPp.toFixed(2)} pp)
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="mt-4">
            <div
              className="h-3 rounded border border-slate-200"
              style={{
                background:
                  "linear-gradient(90deg, #fafafa, #ffd6e0, #eb4696, #aa003c)",
              }}
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-ink-muted">
              <span>no change</span>
              <span>+small increase</span>
              <span>+more</span>
              <span>+largest increase</span>
            </div>
            <p className="mt-2 w-full text-sm leading-relaxed text-ink-muted">
              Each pixel compares its built-up share in 2000 vs 2020 — color marks
              only pixels that got measurably more built-up; light gray means
              unchanged. Black line = catchment boundary. Tight crop around each
              catchment, not the shared whole-region scale used above.
            </p>
          </div>
        </div>
      </section>

      <section id="rp-terrain" className="mb-12 scroll-mt-[100px]">
        <SectionHeading
          title="05 Terrain — slope"
          description="SRTM 30 m elevation → slope in degrees. Steeper catchments concentrate runoff faster, reducing warning time between rainfall and peak flow at a dam."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <RiskLabeledMapCard
            src="/risk-profile/slope_map.png"
            alt="SRTM slope map across all catchments"
            caption="SRTM 30 m · slope in degrees, pale → deep blue = flat → steep"
            imgW={900}
            imgH={407}
            fontSize={13}
          />
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Catchment</th>
                  <th className="px-3 py-3">Mean slope °</th>
                  <th className="px-3 py-3">Max slope °</th>
                  <th className="px-3 py-3">% area &gt;15°</th>
                </tr>
              </thead>
              <tbody>
                {bySlope.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium">{c.name}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {c.terrain.meanSlopeDeg.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {c.terrain.maxSlopeDeg.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {c.terrain.steepGt15Pct.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="mt-10">
          <SectionHeading
            title="06 Upstream mini dams"
            description="Smaller upstream structures increase flash-flood risk when they overtop or breach. Marker size reflects spillway capacity. Orange = inside a study catchment (counts toward score); grey = outside (context)."
          />
          <RiskLabeledMapCard
            src="/risk-profile/minidams_map.png"
            alt="Mini dams across the wider survey area"
            imgW={1100}
            imgH={463}
            fontSize={13}
            bounds={MINI_DAMS_BOUNDS}
            imageClassName="bg-[#f5f4ef]"
            caption={
              <div className="space-y-2">
                <p>
                  {RISK_SUMMARY.miniDamsSurveyed} mini dams surveyed across the
                  wider area · {RISK_SUMMARY.miniDamsInCatchments} sit within one
                  of the 8 catchments
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: "#eb6834" }}
                    />
                    Within a catchment (counts toward the score)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: "#9d9a90" }}
                    />
                    Outside the 8 catchments (context only)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-0.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <span className="inline-block h-3 w-3 rounded-full bg-slate-400" />
                    </span>
                    Marker size = spillway capacity
                  </span>
                </div>
              </div>
            }
          />

          <Card className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Catchment</th>
                  <th className="px-3 py-3">Mini dams</th>
                  <th className="px-3 py-3">Combined spillway capacity</th>
                  <th className="px-3 py-3">Avg. spillway capacity</th>
                </tr>
              </thead>
              <tbody>
                {[...CATCHMENTS]
                  .sort((a, b) => b.miniDams.count - a.miniDams.count)
                  .map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium">{c.name}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {c.miniDams.count}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {c.miniDams.combinedSpillway.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {c.miniDams.avgSpillway.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </div>
      </section>

      <section id="rp-screening" className="mb-12 scroll-mt-[100px]">
        <SectionHeading
          title="07 Flash-flood risk screening"
          description="Score is min–max normalized across the 8 catchments, then a weighted sum scaled 0–100. Use it to prioritize full hydrologic studies — not as a flood forecast."
        />

        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {(Object.keys(RISK_TIER_META) as RiskTier[]).map((tier) => (
            <span
              key={tier}
              className={`rounded-full px-2.5 py-1 font-semibold ring-1 ring-inset ${RISK_TIER_META[tier].className}`}
            >
              {RISK_TIER_META[tier].label}
              {tier === "very_high"
                ? " ≥55"
                : tier === "high"
                  ? " ≥35"
                  : tier === "moderate"
                    ? " ≥20"
                    : " <20"}
            </span>
          ))}
        </div>

        <RiskScoreBars />

        <Card className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Catchment</th>
                <th className="px-3 py-3">Tier</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Mean slope °</th>
                <th className="px-3 py-3">% steep &gt;15°</th>
                <th className="px-3 py-3">Built-up % now</th>
                <th className="px-3 py-3">Built-up growth pp</th>
                <th className="px-3 py-3">Avg max-daily mm</th>
                <th className="px-3 py-3">Mini dams</th>
                <th className="px-3 py-3">Mini-dam spwy. cap.</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-3 py-2.5">
                    <TierBadge tier={c.tier} />
                  </td>
                  <td className="px-3 py-2.5 font-semibold tabular-nums">
                    {c.score}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {c.terrain.meanSlopeDeg.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {c.terrain.steepGt15Pct.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {screeningBuiltUpPctNow(c).toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    +{c.builtUp.growthPp.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {c.rainfall.avgAnnualMaxDailyMm.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {c.miniDams.count}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {c.miniDams.combinedSpillway.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="mt-10">
          <RiskInteractiveMap />
        </div>
      </section>
    </div>
  );
}
