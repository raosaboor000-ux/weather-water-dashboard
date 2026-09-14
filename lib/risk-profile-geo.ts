import {
  CATCHMENTS,
  CATCHMENTS_GEOJSON,
  STUDY_BOUNDS,
  type CatchmentId,
  type CatchmentProfile,
  type InteractiveMapLayer,
  type RainfallEvent,
  resolveGeoName,
} from "@/lib/risk-profile-data";

export { STUDY_BOUNDS };

export type LatLngRing = [number, number][];

/** Leaflet [lat, lng] rings from GeoJSON (lng,lat) polygons. */
export function geojsonToLeafletRings(feature: {
  geometry?:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
}): LatLngRing[] {
  const g = feature.geometry;
  if (!g) return [];
  if (g.type === "Polygon") {
    return g.coordinates.map((ring: number[][]) =>
      ring.map((pt: number[]) => [pt[1], pt[0]] as [number, number])
    );
  }
  if (g.type === "MultiPolygon") {
    return g.coordinates.flatMap((poly: number[][][]) =>
      poly.map((ring: number[][]) =>
        ring.map((pt: number[]) => [pt[1], pt[0]] as [number, number])
      )
    );
  }
  return [];
}

export const CATCHMENT_POLYGONS: {
  id: CatchmentId;
  name: string;
  rawName: string;
  rings: LatLngRing[];
  lat: number;
  lng: number;
  color: string;
}[] = CATCHMENTS_GEOJSON.features.map((f) => {
  const name = String(f.properties?.name ?? "");
  const c = resolveGeoName(name);
  return {
    id: c?.id ?? ("bhugtal" as CatchmentId),
    name: c?.name ?? name,
    rawName: name,
    rings: geojsonToLeafletRings(f),
    lat: c?.lat ?? 0,
    lng: c?.lng ?? 0,
    color: c?.color ?? "#64748b",
  };
});

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nearestCatchmentIntensity(
  lat: number,
  lng: number,
  event: RainfallEvent
): number {
  let best = 0;
  let bestD = Infinity;
  for (const c of CATCHMENTS) {
    const d =
      (lat - c.lat) ** 2 +
      ((lng - c.lng) * Math.cos((c.lat * Math.PI) / 180)) ** 2;
    const falloff = Math.exp(-d / (c.mapRadiusKm * 0.00009));
    const v = event.byCatchment[c.id] * falloff;
    if (d < bestD) bestD = d;
    best = Math.max(best, v);
  }
  const regional = event.regionAvgMm / 160;
  return Math.min(
    1,
    best * 0.85 + regional * 0.45 + (1 - Math.min(1, bestD * 40)) * 0.15
  );
}

function rainfallRgba(t: number): [number, number, number, number] {
  if (t < 0.15) return [230, 242, 255, 255];
  if (t < 0.3) return [147, 197, 253, 255];
  if (t < 0.45) return [59, 130, 246, 255];
  if (t < 0.6) return [99, 102, 241, 255];
  if (t < 0.75) return [147, 51, 234, 255];
  if (t < 0.88) return [190, 24, 93, 255];
  return [127, 29, 29, 255];
}

function builtupRgba(density: number): [number, number, number, number] {
  if (density < 0.08) return [0, 0, 0, 0];
  const a = Math.min(255, Math.round(80 + density * 175));
  const r = Math.round(120 + density * 80);
  const g = Math.round(40 + density * 30);
  const b = Math.round(20 + density * 20);
  return [r, g, b, a];
}

function growthRgba(v: number): [number, number, number, number] {
  if (v < 0.12) return [0, 0, 0, 0];
  return [
    Math.round(190 + v * 50),
    Math.round(20 + v * 40),
    Math.round(90 + v * 40),
    Math.round(100 + v * 140),
  ];
}

function slopeRgba(t: number): [number, number, number, number] {
  const r = Math.round(220 - t * 180);
  const g = Math.round(200 - t * 40);
  const b = Math.round(140 + t * 100);
  return [r, g, b, 255];
}

function hash2(ix: number, iy: number, seed: number): number {
  const rand = mulberry32(seed + ix * 73856093 + iy * 19349663);
  return rand();
}

function settlementField(
  lat: number,
  lng: number,
  year: 2000 | 2020
): number {
  let dens = 0;
  for (const c of CATCHMENTS) {
    const dx = (lng - c.lng) * 90;
    const dy = (lat - c.lat) * 110;
    const d2 = dx * dx + dy * dy;
    const base =
      year === 2000
        ? c.builtUp.pctCatchment2000
        : c.builtUp.pctCatchment2020;
    dens += (base / 2) * Math.exp(-d2 / (c.mapRadiusKm * 0.35));
    dens +=
      0.15 *
      Math.exp(
        -((dx - 0.4) ** 2 + (dy + 0.2) ** 2) / (c.mapRadiusKm * 0.2)
      ) *
      (year === 2020 ? 1.35 : 0.7);
  }
  return Math.min(1, dens);
}

function slopeField(lat: number, lng: number): number {
  let t = 0.25;
  for (const c of CATCHMENTS) {
    const dx = (lng - c.lng) * 95;
    const dy = (lat - c.lat) * 110;
    const ridge =
      Math.abs(Math.sin(dx * 2.2 + dy * 1.1)) *
      Math.exp(-(dx * dx + dy * dy) / (c.mapRadiusKm * 0.9));
    t += (c.terrain.meanSlopeDeg / 8) * ridge;
    t +=
      0.35 *
      Math.exp(-Math.abs(dx * 0.7 + dy * 1.4) * 3) *
      Math.exp(-(dx * dx + dy * dy) / (c.mapRadiusKm * 1.2));
  }
  return Math.min(1, t);
}

export function paintInteractiveRaster(opts: {
  layer: InteractiveMapLayer;
  event: RainfallEvent;
  cols?: number;
  rows?: number;
}): string {
  const cols = opts.cols ?? 96;
  const rows = opts.rows ?? 64;
  const { south, north, west, east } = STUDY_BOUNDS;
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const img = ctx.createImageData(cols, rows);
  const lightBase =
    opts.layer === "builtup_2000" ||
    opts.layer === "builtup_2020" ||
    opts.layer === "builtup_growth";

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const lat = north - ((y + 0.5) / rows) * (north - south);
      const lng = west + ((x + 0.5) / cols) * (east - west);
      const i = (y * cols + x) * 4;
      let rgba: [number, number, number, number];

      if (opts.layer === "rainfall") {
        const noise = (hash2(x, y, 9) - 0.5) * 0.08;
        const t = Math.min(
          1,
          Math.max(0, nearestCatchmentIntensity(lat, lng, opts.event) + noise)
        );
        rgba = rainfallRgba(t);
      } else if (opts.layer === "builtup_2000") {
        const n = hash2(x, y, 2000);
        const d = settlementField(lat, lng, 2000) * (n > 0.55 ? n : 0);
        rgba = builtupRgba(d);
        if (rgba[3] === 0) rgba = [245, 245, 242, 255];
      } else if (opts.layer === "builtup_2020") {
        const n = hash2(x, y, 2020);
        const d = settlementField(lat, lng, 2020) * (n > 0.42 ? n : 0);
        rgba = builtupRgba(d);
        if (rgba[3] === 0) rgba = [245, 245, 242, 255];
      } else if (opts.layer === "builtup_growth") {
        const n = hash2(x, y, 2010);
        const g0 = settlementField(lat, lng, 2000);
        const g1 = settlementField(lat, lng, 2020);
        const grew = Math.max(0, g1 - g0) * (n > 0.5 ? 1.4 : 0.2);
        rgba = growthRgba(grew);
        if (rgba[3] === 0) rgba = [250, 250, 248, 255];
      } else {
        const n = (hash2(x, y, 77) - 0.5) * 0.12;
        rgba = slopeRgba(Math.min(1, Math.max(0, slopeField(lat, lng) + n)));
      }

      if (lightBase && opts.layer === "builtup_growth") {
        // keep pale base
      }

      img.data[i] = rgba[0];
      img.data[i + 1] = rgba[1];
      img.data[i + 2] = rgba[2];
      img.data[i + 3] = rgba[3];
    }
  }

  ctx.putImageData(img, 0, 0);
  const big = document.createElement("canvas");
  big.width = cols * 6;
  big.height = rows * 6;
  const bctx = big.getContext("2d");
  if (!bctx) return canvas.toDataURL("image/png");
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(canvas, 0, 0, big.width, big.height);
  return big.toDataURL("image/png");
}

export function interactiveLegend(layer: InteractiveMapLayer): {
  title: string;
  stops: { label: string; color: string }[];
} {
  if (layer === "rainfall") {
    return {
      title: "CHIRPS daily rainfall",
      stops: [
        { label: "0 mm", color: "#e6f2ff" },
        { label: "low", color: "#3b82f6" },
        { label: "mid", color: "#9333ea" },
        { label: "≥ high", color: "#7f1d1d" },
      ],
    };
  }
  if (layer === "slope") {
    return {
      title: "Terrain slope (SRTM)",
      stops: [
        { label: "flat", color: "#dcc88c" },
        { label: "moderate", color: "#5f9e9a" },
        { label: "steep", color: "#2864c8" },
      ],
    };
  }
  if (layer === "builtup_growth") {
    return {
      title: "New built-up 2000→2020",
      stops: [
        { label: "no change", color: "#fafaf8" },
        { label: "+small", color: "#f472b6" },
        { label: "+more", color: "#be123c" },
      ],
    };
  }
  return {
    title:
      layer === "builtup_2000"
        ? "Built-up 2000 (GHSL)"
        : "Built-up 2020 (GHSL)",
    stops: [
      { label: "0%", color: "#f5f5f2" },
      { label: "sparse", color: "#9a4a28" },
      { label: "dense", color: "#5c2410" },
    ],
  };
}

export type { CatchmentProfile };
