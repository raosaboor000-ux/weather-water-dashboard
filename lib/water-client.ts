import type {
  DamMetadata,
  DamReading,
  DamSnapshot,
  TrendDirection,
} from "@/lib/dams-types";
import type { WaterKpis } from "@/lib/dams-status";

export type WaterOverviewResponse = {
  date: string;
  snapshots: DamSnapshot[];
  overview: {
    maxStorage?: DamSnapshot;
    lowestStorage?: DamSnapshot;
    belowDead: DamSnapshot[];
    spillAlerts: DamSnapshot[];
    kpis: WaterKpis;
  };
};

export type WaterMetaResponse = {
  dams: DamMetadata[];
  dates: string[];
  latestDate: string;
  source: "google_sheets" | "csv";
  spreadsheetId?: string;
  worksheetName?: string;
  spreadsheetUrl?: string;
  csvPath?: string;
};

export type WaterReadingsResponse = {
  location: string;
  from?: string;
  to?: string;
  readings: DamReading[];
  trend?: TrendDirection;
};

async function readApi<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { error?: string }).error ?? "Unable to fetch water level data"
    );
  }
  return body as T;
}

export async function fetchWaterMeta(refresh = false): Promise<WaterMetaResponse> {
  const params = new URLSearchParams({ mode: "meta" });
  if (refresh) params.set("refresh", "true");
  return readApi<WaterMetaResponse>(`/api/water-levels?${params}`);
}

export async function fetchWaterOverview(
  date: string,
  latestOnly = false,
  refresh = false
): Promise<WaterOverviewResponse> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (latestOnly) params.set("latestOnly", "true");
  if (refresh) params.set("refresh", "true");
  const q = params.toString();
  return readApi<WaterOverviewResponse>(
    `/api/water-levels${q ? `?${q}` : ""}`
  );
}

export async function fetchDamReadings(
  location: string,
  from: string,
  to: string
): Promise<WaterReadingsResponse> {
  const params = new URLSearchParams({
    mode: "readings",
    location,
    from,
    to,
  });
  return readApi<WaterReadingsResponse>(`/api/water-levels?${params}`);
}

export type CsvUploadResult = {
  ok: boolean;
  rowsAdded: number;
  rowsUpdated: number;
  latestDate: string;
  damCount: number;
};

export async function uploadDamsCsv(file: File): Promise<CsvUploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/water-levels/upload", {
    method: "POST",
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { error?: string }).error ?? "CSV upload failed"
    );
  }
  return body as CsvUploadResult;
}
