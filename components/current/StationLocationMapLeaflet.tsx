"use client";

import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import { appConfig } from "@/lib/config";
import "leaflet/dist/leaflet.css";

export const STATION_MAP_HEIGHT = 288;

/** Wide Pakistan context — map center is always the station */
const OVERVIEW_ZOOM = 5.8;
const DETAIL_ZOOM = 12;

type MarkerProps = {
  position: [number, number];
  zoomedIn: boolean;
  onToggle: () => void;
};

function ZoomToggleMarker({ position, zoomedIn, onToggle }: MarkerProps) {
  const map = useMap();

  const handleClick = () => {
    const nextZoom = zoomedIn ? OVERVIEW_ZOOM : DETAIL_ZOOM;
    map.flyTo(position, nextZoom, { duration: 0.85 });
    onToggle();
  };

  return (
    <CircleMarker
      center={position}
      radius={zoomedIn ? 10 : 7}
      pathOptions={{
        color: "#c2410c",
        weight: zoomedIn ? 3 : 2,
        fillColor: "#f97316",
        fillOpacity: 0.92,
      }}
      eventHandlers={{ click: handleClick }}
    />
  );
}

export function StationLocationMapLeaflet() {
  const { lat, lng } = appConfig.station;
  const position: [number, number] = [lat, lng];
  const [zoomedIn, setZoomedIn] = useState(false);

  return (
    <MapContainer
      center={position}
      zoom={OVERVIEW_ZOOM}
      minZoom={4}
      maxZoom={14}
      scrollWheelZoom={false}
      zoomControl={false}
      className="z-0 w-full rounded-2xl"
      style={{
        height: STATION_MAP_HEIGHT,
        minHeight: STATION_MAP_HEIGHT,
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomToggleMarker
        position={position}
        zoomedIn={zoomedIn}
        onToggle={() => setZoomedIn((value) => !value)}
      />
    </MapContainer>
  );
}
