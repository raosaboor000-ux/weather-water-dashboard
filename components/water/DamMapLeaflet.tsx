"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { DamSnapshot } from "@/lib/dams-types";
import {
  capacityBandColor,
  spillStatusColor,
  spillStatusLabel,
  snapshotCapacityBand,
  storageStatusColor,
  storageStatusLabel,
} from "@/lib/dams-status";
import {
  formatAcres,
  formatAft,
  getDamSlideProfile,
} from "@/lib/dams-profiles";
import "leaflet/dist/leaflet.css";

type Props = {
  snapshots: DamSnapshot[];
  highlightLocation?: string;
  onSelect?: (location: string) => void;
};

function markerColor(s: DamSnapshot): string {
  if (s.spillStatus !== "none") return spillStatusColor(s.spillStatus);
  return capacityBandColor(snapshotCapacityBand(s));
}

function markerRadius(s: DamSnapshot, active: boolean): number {
  if (s.spillStatus !== "none") return active ? 14 : 11;
  return active ? 11 : 8;
}

function PopupFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 py-1 last:border-b-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p className="text-right text-[11px] font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function DamPopup({ snapshot }: { snapshot: DamSnapshot }) {
  const profile = getDamSlideProfile(snapshot.location);
  const fillColor = capacityBandColor(snapshotCapacityBand(snapshot));
  const fillWidth =
    snapshot.fillPct != null ? Math.max(4, Math.min(100, snapshot.fillPct)) : 0;

  return (
    <div className="dam-popup w-[300px] overflow-hidden bg-white text-sm">
      <div className="relative h-[148px] bg-slate-800">
        {profile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.imageSrc}
            alt={profile.slideTitle}
            className="h-full w-full object-cover object-center"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5 pr-11">
          <p className="font-display text-[15px] font-semibold leading-tight text-white drop-shadow">
            {profile?.slideTitle ?? snapshot.location}
          </p>
          {snapshot.river ? (
            <p className="mt-0.5 line-clamp-1 text-[10px] text-sky-100">
              {snapshot.river}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5 p-2.5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Water level
            </p>
            <p className="font-display text-lg font-semibold leading-none text-slate-900">
              {snapshot.waterLevelFt.toFixed(1)}
              <span className="ml-1 text-xs font-medium text-slate-500">ft</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Fill
            </p>
            <p
              className="text-sm font-semibold leading-none"
              style={{ color: fillColor }}
            >
              {snapshot.fillPct != null
                ? `${snapshot.fillPct.toFixed(0)}%`
                : "—"}
            </p>
          </div>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${fillWidth}%`, background: fillColor }}
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ background: storageStatusColor(snapshot.storageStatus) }}
          >
            {storageStatusLabel(snapshot.storageStatus)}
          </span>
          {snapshot.spillStatus !== "none" ? (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ background: spillStatusColor(snapshot.spillStatus) }}
            >
              {spillStatusLabel(snapshot.spillStatus)}
            </span>
          ) : null}
        </div>

        {profile ? (
          <div>
            <PopupFact label="District" value={profile.district} />
            <PopupFact label="Tehsil" value={profile.tehsil} />
            <PopupFact
              label="Gross storage"
              value={formatAft(profile.grossStorageAft)}
            />
            <PopupFact label="C.C.A." value={formatAcres(profile.ccaAcres)} />
            <PopupFact label="Water supply" value={profile.waterSupply} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DamMapLeaflet({
  snapshots,
  highlightLocation,
  onSelect,
}: Props) {
  const withCoords = useMemo(
    () => snapshots.filter((s) => s.latitude != null && s.longitude != null),
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
            <Popup
              maxWidth={320}
              minWidth={300}
              className="dam-map-popup"
              autoPan
              autoPanPadding={[20, 28]}
            >
              <DamPopup snapshot={s} />
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
