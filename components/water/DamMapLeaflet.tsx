"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { DamSnapshot } from "@/lib/dams-types";
import {
  spillStatusColor,
  spillStatusLabel,
  storageStatusColor,
  storageStatusLabel,
} from "@/lib/dams-status";
import "leaflet/dist/leaflet.css";

type Props = {
  snapshots: DamSnapshot[];
  highlightLocation?: string;
  onSelect?: (location: string) => void;
};

function markerColor(s: DamSnapshot): string {
  if (s.spillStatus !== "none") return spillStatusColor(s.spillStatus);
  return storageStatusColor(s.storageStatus);
}

function markerRadius(s: DamSnapshot, active: boolean): number {
  if (s.spillStatus !== "none") return active ? 14 : 11;
  return active ? 11 : 8;
}

export function DamMapLeaflet({
  snapshots,
  highlightLocation,
  onSelect,
}: Props) {
  const withCoords = useMemo(
    () =>
      snapshots.filter(
        (s) => s.latitude != null && s.longitude != null
      ),
    [snapshots]
  );

  const center = useMemo((): [number, number] => {
    if (withCoords.length === 0) return [32.88, 72.4];
    const lat =
      withCoords.reduce((a, s) => a + s.latitude!, 0) / withCoords.length;
    const lng =
      withCoords.reduce((a, s) => a + s.longitude!, 0) / withCoords.length;
    return [lat, lng];
  }, [withCoords]);

  if (withCoords.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-ink-subtle">
        No dam coordinates available for the map.
      </p>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={9}
      scrollWheelZoom
      className="z-0 h-[420px] w-full rounded-xl"
      style={{ minHeight: 420 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.map((s) => {
        const active = s.location === highlightLocation;
        const color = markerColor(s);
        return (
          <CircleMarker
            key={s.location}
            center={[s.latitude!, s.longitude!]}
            radius={markerRadius(s, active)}
            pathOptions={{
              color: active ? "#0f172a" : "#ffffff",
              weight: active ? 2.5 : 2,
              fillColor: color,
              fillOpacity: 0.92,
            }}
            eventHandlers={{
              click: () => onSelect?.(s.location),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{s.location}</p>
                <p>{s.waterLevelFt.toFixed(1)} ft</p>
                <p>{storageStatusLabel(s.storageStatus)}</p>
                {s.spillStatus !== "none" && (
                  <p className="text-blue-700">
                    {spillStatusLabel(s.spillStatus)}
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
