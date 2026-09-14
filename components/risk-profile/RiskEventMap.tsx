"use client";

import { useMemo } from "react";
import {
  CATCHMENTS,
  EVENT_SCALE_MAX_MM,
  RAINFALL_EVENTS,
  STUDY_BOUNDS,
  eventRasterUrl,
  type RainfallEvent,
} from "@/lib/risk-profile-data";

const LABEL_VIEW_W = 700;
const LABEL_VIEW_H = 317;

type MapLabel = {
  name: string;
  x: number;
  y: number;
  boxW: number;
  boxH: number;
};

function projectToImage(
  lon: number,
  lat: number,
  imgW: number,
  imgH: number
): [number, number] {
  const { west, south, east, north } = STUDY_BOUNDS;
  const x = ((lon - west) / (east - west)) * imgW;
  const y = ((north - lat) / (north - south)) * imgH;
  return [x, y];
}

function buildEventLabels(fontSize = 12): MapLabel[] {
  const charW = fontSize * 0.62;
  const padX = 6;
  const boxH = fontSize + 8;
  const items = CATCHMENTS.map((c) => {
    const [x, y] = projectToImage(c.lng, c.lat, LABEL_VIEW_W, LABEL_VIEW_H);
    const boxW = c.name.length * charW + padX * 2;
    return { name: c.name, x, y, boxW, boxH };
  });

  items.sort((a, b) => a.x - b.x);
  for (let i = 1; i < items.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = items[j];
      const b = items[i];
      const overlapX = Math.abs(a.x - b.x) < (a.boxW + b.boxW) / 2;
      const overlapY = Math.abs(a.y - b.y) < (a.boxH + b.boxH) / 2;
      if (overlapX && overlapY) {
        b.y += (b.y >= a.y ? 1 : -1) * (b.boxH * 0.95);
      }
    }
  }
  return items;
}

function rankBadgeClass(rank: number): string {
  if (rank <= 3)
    return "bg-rose-500/20 text-rose-300 ring-1 ring-inset ring-rose-500/30";
  if (rank <= 8)
    return "bg-orange-500/20 text-orange-200 ring-1 ring-inset ring-orange-500/30";
  if (rank <= 15)
    return "bg-amber-500/20 text-amber-200 ring-1 ring-inset ring-amber-500/30";
  return "bg-emerald-500/20 text-emerald-300 ring-1 ring-inset ring-emerald-500/30";
}

function eventCaption(event: RainfallEvent): string {
  const year = event.date.slice(0, 4);
  const suffix =
    event.category === "top event" || event.category === "catalog top-15"
      ? "top-15 event"
      : `wettest day of ${year}`;
  return `${event.date} · region-average rainfall ${event.regionAvgMm} mm · ${suffix}`;
}

type Props = {
  eventId: string;
  onEventIdChange: (id: string) => void;
};

export function RiskEventMap({ eventId, onEventIdChange }: Props) {
  const event =
    RAINFALL_EVENTS.find((e) => e.id === eventId) ?? RAINFALL_EVENTS[0];
  const labels = useMemo(() => buildEventLabels(12), []);
  const ranked = useMemo(
    () => [...RAINFALL_EVENTS].sort((a, b) => b.regionAvgMm - a.regionAvgMm),
    []
  );
  const rank = ranked.findIndex((e) => e.id === event.id) + 1;
  const scaleMax = EVENT_SCALE_MAX_MM;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    t === 0 ? "0 mm" : t === 1 ? `≥${Math.round(scaleMax)} mm` : `${Math.round(scaleMax * t)} mm`
  );

  const src =
    eventRasterUrl(event.date) ??
    "/risk-profile/events/2021-09-08_annual_peak.png";

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label
          htmlFor="risk-event-select"
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500"
        >
          Event
        </label>
        <select
          id="risk-event-select"
          className="min-w-[min(100%,28rem)] flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[12.5px] text-ink"
          value={event.id}
          onChange={(e) => onEventIdChange(e.target.value)}
        >
          {[...RAINFALL_EVENTS]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <div className="relative block leading-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`CHIRPS rainfall ${event.date}`}
            className="block h-auto w-full"
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${LABEL_VIEW_W} ${LABEL_VIEW_H}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            {labels.map((it) => (
              <g key={it.name}>
                <rect
                  x={it.x - it.boxW / 2}
                  y={it.y - it.boxH / 2}
                  width={it.boxW}
                  height={it.boxH}
                  rx={4}
                  fill="rgba(10,10,10,0.62)"
                />
                <text
                  x={it.x}
                  y={it.y + 12 * 0.32}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily='ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                  fontWeight={600}
                  fill="#fff"
                >
                  {it.name}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 bg-slate-50 px-4 py-3 text-[13px] text-slate-600">
          <span className="font-mono">{eventCaption(event)}</span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide ${rankBadgeClass(rank)}`}
          >
            #{rank} of {RAINFALL_EVENTS.length} events
          </span>
        </div>
      </div>

      <div className="mt-3.5">
        <div
          className="h-3 rounded"
          style={{
            background:
              "linear-gradient(90deg, #f7fbff, #c6dbef, #6baed6, #2171b5, #08306b, #54278f, #a50f15)",
          }}
        />
        <div className="mt-1.5 flex justify-between font-mono text-[11px] text-slate-500">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Same color scale on every event — values above the top tick saturate to
          the darkest red. Catchment boundaries in black; names labeled directly
          on the map.
        </p>
      </div>
    </div>
  );
}
