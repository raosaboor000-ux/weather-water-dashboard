"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ImageOverlay,
  LayerGroup,
  MapContainer,
  Marker,
  Polygon,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  EVENT_SCALE_MAX_MM,
  GROWTH_BOUNDS,
  INTERACTIVE_MAP_LAYERS,
  RAINFALL_EVENTS,
  eventRasterUrl,
  growthRasterUrl,
  layerRasterUrl,
  type InteractiveMapLayer,
  type RainfallEvent,
} from "@/lib/risk-profile-data";
import {
  CATCHMENT_POLYGONS,
  STUDY_BOUNDS,
} from "@/lib/risk-profile-geo";

function damLabelIcon(name: string) {
  return L.divIcon({
    className: "risk-dam-label",
    html: `<span style="
      display:inline-block;
      background:#0a0a0a;
      color:#fff;
      font:600 10px/1.2 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding:3px 6px;
      border-radius:3px;
      white-space:nowrap;
      box-shadow:0 1px 3px rgba(0,0,0,.45);
      letter-spacing:0.02em;
    ">${name}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function FitStudy() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [STUDY_BOUNDS.south, STUDY_BOUNDS.west],
        [STUDY_BOUNDS.north, STUDY_BOUNDS.east],
      ],
      { padding: [0, 0], animate: false }
    );
  }, [map]);
  return null;
}

const REGION_BOUNDS = L.latLngBounds(
  [STUDY_BOUNDS.south, STUDY_BOUNDS.west],
  [STUDY_BOUNDS.north, STUDY_BOUNDS.east]
);

function legendFor(
  layer: InteractiveMapLayer,
  event: RainfallEvent
): { title: string; stops: { label: string; color: string }[]; note: string } {
  const max = EVENT_SCALE_MAX_MM;
  if (layer === "rainfall") {
    return {
      title: `CHIRPS daily rainfall — ${event.date}`,
      stops: [
        { label: "0", color: "#f7fbff" },
        { label: `${(max * 0.33).toFixed(1)} mm`, color: "#6baed6" },
        { label: `${(max * 0.66).toFixed(1)} mm`, color: "#54278f" },
        { label: `≥${max.toFixed(1)} mm`, color: "#a50f15" },
      ],
      note: `Region-mean rainfall this event: ${event.regionAvgMm} mm. Shared 0–${max.toFixed(1)} mm scale across every event so days are directly comparable.`,
    };
  }
  if (layer === "slope") {
    return {
      title: "SRTM terrain slope",
      stops: [
        { label: "0°", color: "#ffffcc" },
        { label: "10°", color: "#a1dab4" },
        { label: "20°", color: "#41b6c4" },
        { label: "≥30°", color: "#253494" },
      ],
      note: "Steeper catchments (deeper blue) concentrate runoff faster and give less warning time between rainfall onset and peak flow at the dam.",
    };
  }
  if (layer === "builtup_growth") {
    return {
      title: "Where built-up grew, 2000 → 2020",
      stops: [
        { label: "no change", color: "#fafafa" },
        { label: "+small", color: "#ffd6e0" },
        { label: "+more", color: "#eb4696" },
        { label: "+largest", color: "#aa003c" },
      ],
      note: "Each pixel compares built-up share in 2000 vs 2020 — color marks only pixels that got more built-up. Cropped tight to each catchment.",
    };
  }
  const year = layer === "builtup_2000" ? "2000" : "2020";
  return {
    title: `GHSL built-up surface — ${year}`,
    stops: [
      { label: "0%", color: "#fcfcfb" },
      { label: "10%", color: "#fee08b" },
      { label: "20%", color: "#eb6834" },
      { label: "≥40%", color: "#7f0000" },
    ],
    note: "Per-pixel share of a 100 m cell covered by built-up surface. Same 0–40%+ scale for 2000 and 2020.",
  };
}

type MapBodyProps = {
  layer: InteractiveMapLayer;
  event: RainfallEvent;
  opacity: number;
  showBoundaries: boolean;
};

function InteractiveMapBody({
  layer,
  event,
  opacity,
  showBoundaries,
}: MapBodyProps) {
  const lightBase =
    layer === "builtup_2000" ||
    layer === "builtup_2020" ||
    layer === "builtup_growth";

  const rainfallUrl =
    layer === "rainfall" ? eventRasterUrl(event.date) : null;
  const singleUrl =
    layer === "rainfall"
      ? rainfallUrl
      : layer === "builtup_growth"
        ? null
        : layerRasterUrl(layer);

  const growthOverlays = useMemo(() => {
    if (layer !== "builtup_growth") return [];
    return Object.entries(GROWTH_BOUNDS).map(([rawName, bounds]) => {
      const url = growthRasterUrl(rawName);
      if (!url) return null;
      // growth_bounds: [[south, west], [north, east]]
      const [[south, west], [north, east]] = bounds;
      return {
        key: rawName,
        url,
        bounds: L.latLngBounds([south, west], [north, east]),
      };
    }).filter(Boolean) as {
      key: string;
      url: string;
      bounds: L.LatLngBounds;
    }[];
  }, [layer]);

  return (
    <MapContainer
      center={[32.9, 72.45]}
      zoom={9}
      className="risk-interactive-leaflet h-full w-full"
      style={{ background: lightBase ? "#f8fafc" : "#f1f5f9" }}
      zoomControl
      scrollWheelZoom
      attributionControl={false}
    >
      <FitStudy />

      {singleUrl ? (
        <ImageOverlay
          key={`${layer}-${event.date}-${singleUrl}`}
          url={singleUrl}
          bounds={REGION_BOUNDS}
          opacity={opacity / 100}
          zIndex={200}
        />
      ) : null}

      {layer === "builtup_growth" ? (
        <LayerGroup key={`growth-${opacity}`}>
          {growthOverlays.map((g) => (
            <ImageOverlay
              key={g.key}
              url={g.url}
              bounds={g.bounds}
              opacity={opacity / 100}
              zIndex={200}
            />
          ))}
        </LayerGroup>
      ) : null}

      {showBoundaries &&
        CATCHMENT_POLYGONS.map((p) =>
          p.rings.map((ring, ri) => (
            <Polygon
              key={`${p.id}-${ri}`}
              positions={ring}
              pathOptions={{
                color: "#0a0a0a",
                weight: 2,
                fillOpacity: 0,
                opacity: 0.95,
              }}
            />
          ))
        )}

      {showBoundaries &&
        CATCHMENT_POLYGONS.map((p) => (
          <Marker
            key={`lbl-${p.id}`}
            position={[p.lat, p.lng]}
            icon={damLabelIcon(p.name)}
            interactive={false}
          />
        ))}
    </MapContainer>
  );
}

export function RiskInteractiveMapPanel() {
  const [layer, setLayer] = useState<InteractiveMapLayer>("rainfall");
  const [eventId, setEventId] = useState(
    () =>
      RAINFALL_EVENTS.find((e) => e.date === "2000-09-25")?.id ??
      RAINFALL_EVENTS[0].id
  );
  const [opacity, setOpacity] = useState(90);
  const [showBoundaries, setShowBoundaries] = useState(true);

  const event =
    RAINFALL_EVENTS.find((e) => e.id === eventId) ?? RAINFALL_EVENTS[0];
  const legend = legendFor(layer, event);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-ink shadow-card">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-ink">
          08 Interactive map
        </h3>
      </div>

      <div className="flex flex-wrap items-end gap-4 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <label className="min-w-[200px] flex-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          Data layer
          <select
            className="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-sky-400"
            value={layer}
            onChange={(e) => setLayer(e.target.value as InteractiveMapLayer)}
          >
            {INTERACTIVE_MAP_LAYERS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {layer === "rainfall" ? (
          <label className="min-w-[240px] flex-[1.4] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Rainfall event
            <select
              className="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-sky-400"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              {[...RAINFALL_EVENTS]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
            </select>
          </label>
        ) : null}

        <label className="min-w-[160px] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          Layer opacity {opacity}%
          <input
            type="range"
            min={40}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="mt-3 block w-full accent-sky-500"
          />
        </label>

        <label className="mb-1 flex cursor-pointer items-center gap-2 pb-1 text-[11px] font-medium text-ink">
          <input
            type="checkbox"
            checked={showBoundaries}
            onChange={(e) => setShowBoundaries(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-500"
          />
          Dam names
        </label>
      </div>

      <div className="relative z-0 h-[520px] isolate overflow-hidden bg-slate-100">
        <InteractiveMapBody
          layer={layer}
          event={event}
          opacity={opacity}
          showBoundaries={showBoundaries}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-ink-muted">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{legend.title}</p>
          <p className="mt-0.5 w-full max-w-none leading-relaxed">
            {legend.note}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {legend.stops.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1">
              <span
                className="h-2.5 w-5 rounded-sm border border-slate-200"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
