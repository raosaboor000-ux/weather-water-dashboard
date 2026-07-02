/** Extract first numeric value from formatted strings like "1,018.96 hPa". */
export function firstNumber(s: unknown): number | null {
  if (typeof s === "number" && Number.isFinite(s)) return s;
  if (typeof s !== "string") return null;
  const m = s.match(/-?[\d,]+\.?\d*/);
  if (!m) return null;
  return parseFloat(m[0].replace(/,/g, ""));
}

export function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseFloat(v.replace(/,/g, ""));
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

export function relativeHumidityFromDewpoint(tempC: number, dewptC: number): number {
  if (!Number.isFinite(tempC) || !Number.isFinite(dewptC)) return 0;
  const es = (t: number) => 6.112 * Math.exp((17.67 * t) / (t + 243.5));
  const rh = 100 * (es(dewptC) / es(tempC));
  return Math.min(100, Math.max(0, Math.round(rh)));
}

export function degToCompass(deg: number): string {
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16] ?? "N";
}

export function uvRiskLabel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very high";
  return "Extreme";
}

const COMPASS_TO_DEG: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

export function windFromToDegrees(windFrom: string): number {
  const k = windFrom.trim().toUpperCase();
  return COMPASS_TO_DEG[k] ?? 0;
}
