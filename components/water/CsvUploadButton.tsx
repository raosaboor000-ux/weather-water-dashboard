"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadDamsCsv } from "@/lib/water-client";

export function CsvUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const result = await uploadDamsCsv(file);
      await queryClient.invalidateQueries({ queryKey: ["water"] });
      setMessage(
        `Imported ${result.rowsAdded} new row(s), updated ${result.rowsUpdated}. Latest date: ${result.latestDate}.`
      );
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Upload failed"
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-muted shadow-card transition hover:border-brand-primary/40 hover:text-brand-primary-dark disabled:opacity-60"
      >
        <Upload className="h-4 w-4" aria-hidden />
        {uploading ? "Uploading…" : "Upload CSV"}
      </button>
      {message ? (
        <p
          className={`max-w-xs text-right text-xs ${message.includes("failed") || message.includes("Invalid") || message.includes("No valid") ? "text-red-600" : "text-emerald-600"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
