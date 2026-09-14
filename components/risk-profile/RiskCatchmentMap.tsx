"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CATCHMENTS,
  type MiniDamPoint,
  type RainfallEvent,
} from "@/lib/risk-profile-data";
import { CATCHMENT_POLYGONS, STUDY_BOUNDS } from "@/lib/risk-profile-geo";

const damIcon = L.divIcon({
  className: "",
  html: `<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:14px solid #0f172a;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 14],
});

function FitStudy() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [STUDY_BOUNDS.south, STUDY_BOUNDS.west],
        [STUDY_BOUNDS.north, STUDY_BOUNDS.east],
      ],
      { padding: [16, 16] }
    );
  }, [map]);
  return null;
}

type StudyMapProps = {
  mode?: "study" | "rainfall" | "mini_dams" | "slope";
  event?: RainfallEvent | null;
  miniDams?: MiniDamPoint[];
  showLabels?: boolean;
  className?: string;
};

function rainfallColor(t: number): string {
  if (t >= 0.85) return "#7f1d1d";
  if (t >= 0.65) return "#9f1239";
  if (t >= 0.45) return "#7c3aed";
  if (t >= 0.25) return "#2563eb";
  return "#93c5fd";
}

function slopeColor(mean: number): string {
  const t = Math.min(1, (mean - 3) / 3);
  const g = Math.round(180 - t * 100);
  const b = Math.round(200 + t * 55);
  return `rgb(40, ${g}, ${b})`;
}

export function RiskCatchmentMap({
  mode = "study",
  event = null,
  miniDams = [],
  showLabels = true,
  className = "h-[420px]",
}: StudyMapProps) {
  const maxSpill = useMemo(
    () => Math.max(1, ...miniDams.map((d) => d.spillway)),
    [miniDams]
  );

  const byId = useMemo(
    () => new Map(CATCHMENTS.map((c) => [c.id, c] as const)),
    []
  );

  return (
    <div
      className={`relative z-0 isolate overflow-hidden rounded-2xl border border-slate-200/80 shadow-card ${className}`}
    >
      <MapContainer
        center={[32.88, 72.4]}
        zoom={9}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitStudy />

        {CATCHMENT_POLYGONS.map((p) => {
          const c = byId.get(p.id);
          const fillOpacity =
            mode === "rainfall" && event
              ? 0.35 + event.byCatchment[p.id] * 0.55
              : mode === "slope"
                ? 0.55
                : 0.28;
          const color =
            mode === "rainfall" && event
              ? rainfallColor(event.byCatchment[p.id])
              : mode === "slope" && c
                ? slopeColor(c.terrain.meanSlopeDeg)
                : p.color;

          return p.rings.map((ring, ri) => (
            <Polygon
              key={`${p.id}-${ri}`}
              positions={ring}
              pathOptions={{
                color: mode === "study" ? p.color : "#0f172a",
                weight: mode === "study" ? 2 : 1.5,
                fillColor: color,
                fillOpacity,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{p.name}</p>
                  {c ? (
                    <p className="text-slate-600">{c.areaKm2} km²</p>
                  ) : null}
                  {mode === "rainfall" && event ? (
                    <p className="mt-1">
                      Event intensity:{" "}
                      {(event.byCatchment[p.id] * 160).toFixed(0)} mm (scaled)
                    </p>
                  ) : null}
                  {mode === "slope" && c ? (
                    <p className="mt-1">
                      Mean slope {c.terrain.meanSlopeDeg}° · max{" "}
                      {c.terrain.maxSlopeDeg}° · {c.terrain.steepGt15Pct}%
                      &gt;15°
                    </p>
                  ) : null}
                </div>
              </Popup>
              {showLabels && ri === 0 ? (
                <Tooltip direction="center" permanent opacity={0.9}>
                  <span className="text-[10px] font-semibold">{p.name}</span>
                </Tooltip>
              ) : null}
            </Polygon>
          ));
        })}

        {CATCHMENTS.map((c) => (
          <Marker
            key={`dam-${c.id}`}
            position={[c.lat, c.lng]}
            icon={damIcon}
          >
            <Popup>
              <strong>{c.damLocation} Dam</strong>
            </Popup>
          </Marker>
        ))}

        {mode === "mini_dams" &&
          miniDams.map((d) => {
            const r = 4 + (d.spillway / maxSpill) * 10;
            const inside = d.catchmentId != null;
            return (
              <CircleMarker
                key={d.id}
                center={[d.lat, d.lng]}
                radius={r}
                pathOptions={{
                  color: inside ? "#c2410c" : "#94a3b8",
                  fillColor: inside ? "#fb923c" : "#cbd5e1",
                  fillOpacity: 0.85,
                  weight: 1,
                }}
              >
                <Popup>
                  {inside ? "Within catchment" : "Outside (context)"}
                  <br />
                  Spillway capacity: {d.spillway}
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
