"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Props = {
  title: string;
  subtitle?: string;
  online?: boolean;
  lastUpdated?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  actions?: ReactNode;
};

export function DashboardHeader({
  title,
  subtitle,
  online = true,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  actions,
}: Props) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge online={online} />
          {lastUpdated ? (
            <span className="text-xs text-ink-subtle">
              Last updated: <span className="font-mono">{lastUpdated}</span>
            </span>
          ) : null}
        </div>
      </div>
      {(actions || onRefresh) && (
        <div className="flex shrink-0 flex-wrap items-start justify-end gap-2 self-start">
          {actions}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-muted shadow-card transition hover:border-brand-primary/40 hover:text-brand-primary-dark hover:shadow-card-hover disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              Refresh
            </button>
          ) : null}
        </div>
      )}
    </header>
  );
}
