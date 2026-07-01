/**
 * Parse dams_data_new.csv — daily readings with static dam metadata on first rows.
 */

import fs from "node:fs";
import path from "node:path";
import type { DamMetadata, DamReading, DamsDataset } from "@/lib/dams-types";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function num(v: string | undefined): number | undefined {
  const t = v?.trim();
  if (!t) return undefined;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/** D/M/YYYY or YYYY-MM-DD → YYYY-MM-DD */
export function parseDamDate(raw: string): string | null {
  const t = raw.trim();
  const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const d = Number(slash[1]);
    const mo = Number(slash[2]);
    const y = Number(slash[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return t;
  return null;
}

function rowToMetadata(cells: string[]): Partial<DamMetadata> {
  return {
    heightFt: num(cells[3]),
    completionCost: num(cells[4]),
    grossStorageAft: num(cells[5]),
    liveStorageAft: num(cells[6]),
    ccaAcres: num(cells[7]),
    channelCapacityCfs: num(cells[8]),
    canalLengthFt: num(cells[9]),
    dslFt: num(cells[10]),
    nplFt: num(cells[11]),
    hflFt: num(cells[12]),
    river: cells[13]?.trim() || undefined,
    yearCompleted: num(cells[14]),
    catchmentSqKm: num(cells[15]),
    latitude: num(cells[16]),
    longitude: num(cells[17]),
  };
}

function mergeMeta(base: DamMetadata, patch: Partial<DamMetadata>): DamMetadata {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v != null && v !== "") {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

export const DAMS_CSV_HEADER =
  "Date,Location,Water_Level_ft,Height (ft),Completion Cost,Gross Storage Capacity (Aft),Live storage (Aft),C.C.A. (Acres),Capacity of Channel (Cfs),Length of Canal (ft),DSL (ft),NPL (ft),HFL (ft),River / Nullah,Year of Completion,Catchment Area (Sq. Km),Latitude,Longitude";

function formatDamDateCsv(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  return `${Number(m[3])}/${Number(m[2])}/${m[1]}`;
}

function cell(v: string | number | undefined): string {
  if (v == null || v === "") return "";
  const s = String(v);
  return s.includes(",") ? `"${s}"` : s;
}

function metadataRow(d: DamMetadata, date: string, waterLevelFt: number): string {
  return [
    formatDamDateCsv(date),
    d.location,
    waterLevelFt,
    d.heightFt,
    d.completionCost,
    d.grossStorageAft,
    d.liveStorageAft,
    d.ccaAcres,
    d.channelCapacityCfs,
    d.canalLengthFt,
    d.dslFt,
    d.nplFt,
    d.hflFt,
    d.river,
    d.yearCompleted,
    d.catchmentSqKm,
    d.latitude,
    d.longitude,
  ]
    .map(cell)
    .join(",");
}

export function serializeDamsCsv(dataset: DamsDataset): string {
  const metaByLoc = new Map(dataset.dams.map((d) => [d.location, d]));
  const byLoc = new Map<string, DamReading[]>();
  for (const r of dataset.readings) {
    if (!byLoc.has(r.location)) byLoc.set(r.location, []);
    byLoc.get(r.location)!.push(r);
  }
  for (const rows of byLoc.values()) {
    rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  const lines = [DAMS_CSV_HEADER];
  const locations = Array.from(byLoc.keys()).sort();

  for (const location of locations) {
    const rows = byLoc.get(location)!;
    const meta = metaByLoc.get(location) ?? { location };
    let metaWritten = false;

    for (const r of rows) {
      if (!metaWritten && hasMetadata(meta)) {
        lines.push(metadataRow(meta, r.date, r.waterLevelFt));
        metaWritten = true;
      } else {
        lines.push(
          [formatDamDateCsv(r.date), r.location, r.waterLevelFt, ...Array(15).fill("")]
            .map(cell)
            .join(",")
        );
      }
    }
  }

  return lines.join("\n") + "\n";
}

function hasMetadata(d: DamMetadata): boolean {
  return (
    d.heightFt != null ||
    d.dslFt != null ||
    d.latitude != null ||
    d.river != null
  );
}

export function mergeDamsDatasets(
  existing: DamsDataset,
  incoming: DamsDataset
): DamsDataset {
  const readingMap = new Map<string, DamReading>();
  for (const r of existing.readings) {
    readingMap.set(`${r.date}|${r.location}`, r);
  }
  for (const r of incoming.readings) {
    readingMap.set(`${r.date}|${r.location}`, r);
  }

  const metaMap = new Map<string, DamMetadata>();
  for (const d of existing.dams) metaMap.set(d.location, d);
  for (const d of incoming.dams) {
    const prev = metaMap.get(d.location);
    metaMap.set(d.location, prev ? mergeMeta(prev, d) : d);
  }

  const readings = Array.from(readingMap.values()).sort((a, b) => {
    const dc = a.date.localeCompare(b.date);
    return dc !== 0 ? dc : a.location.localeCompare(b.location);
  });

  const dates = Array.from(new Set(readings.map((r) => r.date))).sort();
  return {
    dams: Array.from(metaMap.values()).sort((a, b) =>
      a.location.localeCompare(b.location)
    ),
    readings,
    dates,
    latestDate: dates[dates.length - 1] ?? "",
  };
}

export function invalidateDamsCache(): void {
  cached = null;
  cachedMtime = 0;
}

export function saveDamsDataset(csvPath: string, dataset: DamsDataset): void {
  const abs = path.isAbsolute(csvPath)
    ? csvPath
    : path.join(process.cwd(), csvPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, serializeDamsCsv(dataset), "utf8");
  invalidateDamsCache();
}

export function importDamsCsvContent(
  csvPath: string,
  uploadContent: string
): { merged: DamsDataset; rowsAdded: number; rowsUpdated: number } {
  const incoming = parseDamsCsv(uploadContent);
  if (incoming.readings.length === 0) {
    throw new Error("No valid rows found in uploaded CSV");
  }

  const existing = loadDamsDataset(csvPath);
  const before = new Set(
    existing.readings.map((r) => `${r.date}|${r.location}`)
  );
  const merged = mergeDamsDatasets(existing, incoming);
  let rowsAdded = 0;
  let rowsUpdated = 0;
  for (const r of incoming.readings) {
    const key = `${r.date}|${r.location}`;
    if (before.has(key)) rowsUpdated++;
    else rowsAdded++;
  }

  saveDamsDataset(csvPath, merged);
  return { merged, rowsAdded, rowsUpdated };
}

export function parseDamsSheetValues(values: string[][]): DamsDataset {
  if (values.length < 2) {
    return { dams: [], readings: [], dates: [], latestDate: "" };
  }

  let start = 0;
  const first = values[0]?.[0]?.toLowerCase() ?? "";
  if (first.includes("date")) start = 1;

  return parseDamsDataRows(values.slice(start));
}

function parseDamsDataRows(rows: string[][]): DamsDataset {
  const metaByLocation = new Map<string, DamMetadata>();
  const readings: DamReading[] = [];
  const dateSet = new Set<string>();

  for (const cells of rows) {
    if (cells.length < 3) continue;

    const date = parseDamDate(String(cells[0] ?? ""));
    const location = String(cells[1] ?? "").trim();
    const waterLevelFt = num(String(cells[2] ?? ""));
    if (!date || !location || waterLevelFt == null) continue;

    const patch = rowToMetadata(cells.map(String));
    const existing = metaByLocation.get(location) ?? { location };
    metaByLocation.set(location, mergeMeta(existing, patch));

    readings.push({ date, location, waterLevelFt });
    dateSet.add(date);
  }

  const dates = Array.from(dateSet).sort();
  const latestDate = dates[dates.length - 1] ?? "";

  return {
    dams: Array.from(metaByLocation.values()).sort((a, b) =>
      a.location.localeCompare(b.location)
    ),
    readings,
    dates,
    latestDate,
  };
}

export function parseDamsCsv(content: string): DamsDataset {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { dams: [], readings: [], dates: [], latestDate: "" };
  }

  const rows = lines.map(parseCsvLine);
  let start = 1;
  const first = rows[0]?.[0]?.toLowerCase() ?? "";
  if (!first.includes("date")) start = 0;

  return parseDamsDataRows(rows.slice(start));
}

let cached: DamsDataset | null = null;
let cachedMtime = 0;

export function loadDamsDataset(csvPath: string): DamsDataset {
  const abs = path.isAbsolute(csvPath)
    ? csvPath
    : path.join(process.cwd(), csvPath);

  if (!fs.existsSync(abs)) {
    throw new Error(`Dams CSV not found: ${abs}`);
  }

  const stat = fs.statSync(abs);
  if (cached && stat.mtimeMs === cachedMtime) {
    return cached;
  }

  const content = fs.readFileSync(abs, "utf8");
  cached = parseDamsCsv(content);
  cachedMtime = stat.mtimeMs;
  return cached;
}
