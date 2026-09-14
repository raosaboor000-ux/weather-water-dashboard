/**
 * Risk profile data sourced from the Catchments Flood Risk Profile HTML export
 * (DATA JSON embedded in the Claude artifact).
 */
import raw from "@/data/risk-profile/data.json";
import catchmentsGeojson from "@/data/risk-profile/catchments.json";
import imageManifest from "@/data/risk-profile/images-manifest.json";

export type RiskTier = "very_high" | "high" | "moderate" | "lower";

export type CatchmentId =
  | "bhugtal"
  | "dharabi"
  | "dhok_hum"
  | "dhurnal"
  | "gurabh"
  | "mial"
  | "peera"
  | "uthwal_lakhwal";

type RawName =
  | "Bhugtal"
  | "Dharabi"
  | "Dhok_Hum"
  | "Dhurnal"
  | "Gurabh"
  | "Mial"
  | "Peera"
  | "Uthwal_Lakhwal";

const NAME_META: Record<
  RawName,
  {
    id: CatchmentId;
    name: string;
    shortName: string;
    damLocation: string;
    color: string;
  }
> = {
  Bhugtal: {
    id: "bhugtal",
    name: "Bhugtal",
    shortName: "Bhugtal",
    damLocation: "Bhugtal",
    color: "#f97316",
  },
  Dharabi: {
    id: "dharabi",
    name: "Dharabi",
    shortName: "Dharabi",
    damLocation: "Dharabi",
    color: "#22c55e",
  },
  Dhok_Hum: {
    id: "dhok_hum",
    name: "Dhok Hum",
    shortName: "Dhok Hum",
    damLocation: "Dhok Hum",
    color: "#a16207",
  },
  Dhurnal: {
    id: "dhurnal",
    name: "Dhurnal",
    shortName: "Dhurnal",
    damLocation: "Dhurnal",
    color: "#3b82f6",
  },
  Gurabh: {
    id: "gurabh",
    name: "Gurabh",
    shortName: "Gurabh",
    damLocation: "Gurabh",
    color: "#ec4899",
  },
  Mial: {
    id: "mial",
    name: "Mial",
    shortName: "Mial",
    damLocation: "Mial",
    color: "#a855f7",
  },
  Peera: {
    id: "peera",
    name: "Peera",
    shortName: "Peera",
    damLocation: "Pira",
    color: "#64748b",
  },
  Uthwal_Lakhwal: {
    id: "uthwal_lakhwal",
    name: "Uthwal Lakhwal",
    shortName: "U-Lakhwal",
    damLocation: "U-Lakhwal",
    color: "#14b8a6",
  },
};

function asRaw(name: string): RawName {
  return name as RawName;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round0(n: number) {
  return Math.round(n);
}

export type CatchmentProfile = {
  id: CatchmentId;
  rawName: RawName;
  name: string;
  shortName: string;
  damLocation: string;
  color: string;
  areaKm2: number;
  lat: number;
  lng: number;
  mapRadiusKm: number;
  rainfall: {
    avgAnnualMm: number;
    avgDailyMm: number;
    avgAnnualMaxDailyMm: number;
    allTimeMaxDailyMm: number;
    allTimeMaxDate: string;
  };
  builtUp: {
    km2_2000: number;
    km2_2020: number;
    increaseKm2: number;
    increasePct: number;
    pctCatchment2000: number;
    pctCatchment2020: number;
    growthPp: number;
  };
  terrain: {
    meanSlopeDeg: number;
    maxSlopeDeg: number;
    steepGt15Pct: number;
  };
  miniDams: {
    count: number;
    combinedSpillway: number;
    avgSpillway: number;
  };
  score: number;
  tier: RiskTier;
};

function tierFromScore(score: number): RiskTier {
  if (score >= 55) return "very_high";
  if (score >= 35) return "high";
  if (score >= 20) return "moderate";
  return "lower";
}

const rainByName = new Map(
  raw.rainfall_stats.map((r) => [r.name, r] as const)
);
const slopeByName = new Map(raw.slope.map((r) => [r.name, r] as const));
const builtByName = new Map(
  raw.builtup_summary.map((r) => [r.name, r] as const)
);
const miniByName = new Map(
  raw.mini_dams_summary.map((r) => [r.name, r] as const)
);
const riskByName = new Map(raw.risk.map((r) => [r.name, r] as const));

export const CATCHMENTS: CatchmentProfile[] = raw.names.map((rawNameStr) => {
  const rawName = asRaw(rawNameStr);
  const meta = NAME_META[rawName];
  const rain = rainByName.get(rawName)!;
  const slope = slopeByName.get(rawName)!;
  const built = builtByName.get(rawName)!;
  const mini = miniByName.get(rawName)!;
  const risk = riskByName.get(rawName)!;
  const [lng, lat] = raw.representative_points[
    rawName as keyof typeof raw.representative_points
  ];
  const avgSpwy =
    mini.mini_dam_count > 0
      ? Math.round(mini.mini_dam_spwy_cap_total / mini.mini_dam_count)
      : 0;

  return {
    id: meta.id,
    rawName,
    name: meta.name,
    shortName: meta.shortName,
    damLocation: meta.damLocation,
    color: meta.color,
    areaKm2: round1(rain.area_km2),
    lat,
    lng,
    mapRadiusKm: Math.sqrt(rain.area_km2 / Math.PI),
    rainfall: {
      avgAnnualMm: round0(rain.avg_annual_rainfall_mm),
      avgDailyMm: round1(rain.avg_daily_rainfall_mm),
      avgAnnualMaxDailyMm: round1(rain.avg_of_annual_max_daily_mm),
      allTimeMaxDailyMm: round1(rain.alltime_max_daily_mm),
      allTimeMaxDate: rain.alltime_max_date,
    },
    builtUp: {
      km2_2000: built.built_km2_y0,
      km2_2020: built.built_km2_y1,
      increaseKm2: built.increase_km2,
      increasePct: round0(built.increase_pct),
      pctCatchment2000: round1(built.built_pct_y0),
      pctCatchment2020: round1(built.built_pct_y1),
      /** Screening table uses risk.builtup_growth rounded to 1 dp */
      growthPp: round1(risk.builtup_growth_pct_points),
    },
    terrain: {
      meanSlopeDeg: round1(slope.mean_slope_deg),
      maxSlopeDeg: round1(slope.max_slope_deg),
      steepGt15Pct: round1(slope.pct_area_slope_gt15),
    },
    miniDams: {
      count: mini.mini_dam_count,
      combinedSpillway: mini.mini_dam_spwy_cap_total,
      avgSpillway: avgSpwy,
    },
    score: risk.flash_flood_risk_score,
    tier: tierFromScore(risk.flash_flood_risk_score),
  };
});

/** Screening table built-up % now (1 decimal as in HTML risk table). */
export function screeningBuiltUpPctNow(c: CatchmentProfile): number {
  const risk = riskByName.get(c.rawName)!;
  return round1(risk.builtup_pct_current);
}

export const RISK_YEARS = Array.from(
  new Set(raw.rainfall_annual.map((r) => r.year))
).sort((a, b) => a - b);

export const RISK_SCORE_WEIGHTS = {
  slopeMean: 0.16,
  slopeGt15: 0.12,
  builtupNow: 0.16,
  builtupGrowth: 0.16,
  rainfallMaxDaily: 0.2,
  minidamCount: 0.1,
  minidamSpwy: 0.1,
} as const;

export const RISK_TIER_META: Record<
  RiskTier,
  { label: string; min: number; className: string; bar: string }
> = {
  very_high: {
    label: "Very High",
    min: 55,
    className: "bg-red-100 text-red-800 ring-red-200",
    bar: "#dc2626",
  },
  high: {
    label: "High",
    min: 35,
    className: "bg-orange-100 text-orange-800 ring-orange-200",
    bar: "#ea580c",
  },
  moderate: {
    label: "Moderate",
    min: 20,
    className: "bg-amber-100 text-amber-900 ring-amber-200",
    bar: "#d97706",
  },
  lower: {
    label: "Lower",
    min: 0,
    className: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    bar: "#059669",
  },
};

const peera = CATCHMENTS.find((c) => c.id === "peera")!;

export const RISK_SUMMARY = {
  catchmentCount: 8,
  combinedAreaKm2: 754,
  avgAnnualRainfallMm: 696,
  highestRiskName: "Dharabi",
  highestRiskScore: 66.2,
  highestDailyMm: round0(peera.rainfall.allTimeMaxDailyMm),
  highestDailyWhere: "Peera",
  highestDailyDate: peera.rainfall.allTimeMaxDate,
  rainfallRecord: "2000–present (CHIRPS)",
  miniDamsSurveyed: raw.mini_dams_total,
  miniDamsInCatchments: raw.mini_dams_matched_total,
};

export function annualMaxDailySeries(c: CatchmentProfile): number[] {
  return RISK_YEARS.map((year) => {
    const row = raw.rainfall_annual.find(
      (r) => r.name === c.rawName && r.year === year
    );
    return row ? round1(row.annual_max_daily_mm) : 0;
  });
}

export function annualTotalSeries(c: CatchmentProfile): number[] {
  return RISK_YEARS.map((year) => {
    const row = raw.rainfall_annual.find(
      (r) => r.name === c.rawName && r.year === year
    );
    return row ? round0(row.annual_total_mm) : 0;
  });
}

/** Year-by-year annual totals for sparkline cards (complete years only). */
export function annualTotalPoints(
  c: CatchmentProfile
): { year: number; value: number }[] {
  return raw.rainfall_annual
    .filter((r) => r.name === c.rawName && r.is_complete_year)
    .sort((a, b) => a.year - b.year)
    .map((r) => ({ year: r.year, value: r.annual_total_mm }));
}

/** GHSL built-up % of catchment for each published epoch. */
export function builtUpPctPoints(
  c: CatchmentProfile
): { year: number; value: number }[] {
  return raw.builtup
    .filter((r) => r.name === c.rawName)
    .sort((a, b) => a.year - b.year)
    .map((r) => ({ year: r.year, value: r.built_pct }));
}

export type RainfallEventCategory =
  | "year peak"
  | "top event"
  | "annual peak"
  | "catalog top-15";

export type RainfallEvent = {
  id: string;
  date: string;
  regionAvgMm: number;
  category: RainfallEventCategory;
  label: string;
  byCatchment: Record<CatchmentId, number>;
};

export const RAINFALL_EVENTS: RainfallEvent[] = raw.events.map((e) => {
  const regionAvgMm = round1(e.region_mean_mm);
  const byCatchment = {} as Record<CatchmentId, number>;
  for (const c of CATCHMENTS) {
    const intensity =
      (regionAvgMm / 160) *
      (0.75 + (c.rainfall.avgAnnualMaxDailyMm / 64.2) * 0.35);
    byCatchment[c.id] = Math.min(1, intensity);
  }

  return {
    id: e.event_id || e.date,
    date: e.date,
    regionAvgMm,
    category:
      e.event_type === "top_overall" ? "top event" : ("year peak" as const),
    label:
      e.event_type === "top_overall"
        ? `${e.date} — ${regionAvgMm} mm region avg (top event)`
        : `${e.date} — ${regionAvgMm} mm region avg (year peak)`,
    byCatchment,
  };
});

export type InteractiveMapLayer =
  | "rainfall"
  | "builtup_2000"
  | "builtup_2020"
  | "builtup_growth"
  | "slope";

export const INTERACTIVE_MAP_LAYERS: {
  id: InteractiveMapLayer;
  label: string;
}[] = [
  { id: "rainfall", label: "Rainfall — CHIRPS daily event" },
  { id: "builtup_2000", label: "Built-up surface — 2000 (GHSL)" },
  { id: "builtup_2020", label: "Built-up surface — 2020 (GHSL)" },
  { id: "builtup_growth", label: "Where built-up grew, 2000 → 2020" },
  { id: "slope", label: "Terrain slope (SRTM)" },
];

export type MiniDamPoint = {
  id: string;
  lat: number;
  lng: number;
  spillway: number;
  catchmentId: CatchmentId | null;
  matched: boolean;
};

export function buildMiniDamPoints(): MiniDamPoint[] {
  return raw.mini_dams.map((d, i) => {
    const catchments = Array.isArray(d.catchment) ? d.catchment : [];
    const first = catchments[0] ? String(catchments[0]) : null;
    const meta = first ? NAME_META[asRaw(first)] : null;
    return {
      id: `md-${d.sr_no ?? i}`,
      lat: d.lat,
      lng: d.lon,
      spillway: d.spwy_cap,
      catchmentId: meta?.id ?? null,
      matched: Boolean(d.matched),
    };
  });
}

export const CATCHMENTS_GEOJSON = catchmentsGeojson as {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties?: { name?: string };
    geometry:
      | {
          type: "Polygon";
          coordinates: number[][][];
        }
      | {
          type: "MultiPolygon";
          coordinates: number[][][][];
        };
  }>;
};

export const STUDY_BOUNDS = {
  west: raw.region_bounds[0],
  south: raw.region_bounds[1],
  east: raw.region_bounds[2],
  north: raw.region_bounds[3],
} as const;

/** Wider extent used by the mini-dams overview raster (HTML artifact). */
export const MINI_DAMS_BOUNDS = {
  west: raw.mini_dams_region_bounds[0],
  south: raw.mini_dams_region_bounds[1],
  east: raw.mini_dams_region_bounds[2],
  north: raw.mini_dams_region_bounds[3],
} as const;

export function catchmentsByScoreDesc(): CatchmentProfile[] {
  return [...CATCHMENTS].sort((a, b) => b.score - a.score);
}

export function catchmentsByAnnualRainDesc(): CatchmentProfile[] {
  return [...CATCHMENTS].sort(
    (a, b) => b.rainfall.avgAnnualMm - a.rainfall.avgAnnualMm
  );
}

export function catchmentsByMaxDailyDesc(): CatchmentProfile[] {
  return [...CATCHMENTS].sort(
    (a, b) =>
      b.rainfall.avgAnnualMaxDailyMm - a.rainfall.avgAnnualMaxDailyMm
  );
}

export function catchmentsBySlopeDesc(): CatchmentProfile[] {
  return [...CATCHMENTS].sort(
    (a, b) => b.terrain.meanSlopeDeg - a.terrain.meanSlopeDeg
  );
}

export function resolveGeoName(featureName: string): CatchmentProfile | undefined {
  const meta = NAME_META[asRaw(featureName)];
  if (!meta) return CATCHMENTS.find((c) => c.rawName === featureName);
  return CATCHMENTS.find((c) => c.id === meta.id);
}

export function eventRasterUrl(date: string): string | null {
  const key = `event:${date}` as keyof typeof imageManifest;
  return (imageManifest[key] as string | undefined) ?? null;
}

export function layerRasterUrl(
  layer: InteractiveMapLayer
): string | null {
  if (layer === "builtup_2000") {
    return imageManifest["ghsl2/ghsl_builtup_2000.png"] ?? null;
  }
  if (layer === "builtup_2020") {
    return imageManifest["ghsl2/ghsl_builtup_2020.png"] ?? null;
  }
  if (layer === "slope") {
    return imageManifest["slope_map.png"] ?? null;
  }
  return null;
}

export function growthRasterUrl(rawName: string): string | null {
  const key = `growth/growth_${rawName}.png` as keyof typeof imageManifest;
  return (imageManifest[key] as string | undefined) ?? null;
}

/** HTML growth-card caption style: +1.38 km² (+0.66 pp) from GHSL year delta. */
export function growthCardStats(c: CatchmentProfile): {
  increaseKm2: number;
  growthPp: number;
  imageSrc: string | null;
} {
  const y0 = raw.builtup_years[0];
  const y1 = raw.builtup_years[1];
  const before = raw.builtup.find((r) => r.name === c.rawName && r.year === y0);
  const after = raw.builtup.find((r) => r.name === c.rawName && r.year === y1);
  const deltaKm2 = (after?.built_km2 ?? 0) - (before?.built_km2 ?? 0);
  const deltaPct = (after?.built_pct ?? 0) - (before?.built_pct ?? 0);
  return {
    increaseKm2: Math.round(deltaKm2 * 100) / 100,
    growthPp: Math.round(deltaPct * 100) / 100,
    imageSrc: growthRasterUrl(c.rawName),
  };
}

export const GROWTH_BOUNDS = raw.growth_bounds as unknown as Record<
  string,
  [[number, number], [number, number]]
>;

export const EVENT_SCALE_MAX_MM = raw.event_scale_max_mm;
