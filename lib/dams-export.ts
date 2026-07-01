import type { DamSnapshot } from "@/lib/dams-types";
import {
  calculatedStorageAft,
  displayStatusLabel,
  spillStatusLabel,
  trendLabel,
} from "@/lib/dams-status";
import { formatDamDateLabel } from "@/lib/dams-format";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function snapshotsToCsv(rows: DamSnapshot[]): string {
  const header = [
    "Date",
    "Dam",
    "Water Level (ft)",
    "DSL (ft)",
    "NPL (ft)",
    "Fill %",
    "Calc. Storage (Aft)",
    "Status",
    "Spill Status",
    "7-day Trend",
  ].join(",");

  const lines = rows.map((s) => {
    const storageAft = calculatedStorageAft(s.liveStorageAft, s.fillPct);
    return [
      formatDamDateLabel(s.date),
      s.location,
      s.waterLevelFt.toFixed(1),
      s.dslFt?.toFixed(1) ?? "",
      s.nplFt?.toFixed(1) ?? "",
      s.fillPct != null ? s.fillPct.toFixed(1) : "",
      storageAft != null ? storageAft.toFixed(0) : "",
      displayStatusLabel(s),
      s.spillStatus !== "none" ? spillStatusLabel(s.spillStatus) : "",
      trendLabel(s.trend7d),
    ]
      .map(csvEscape)
      .join(",");
  });

  return [header, ...lines].join("\n") + "\n";
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
