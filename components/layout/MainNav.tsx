"use client";

import { useEffect, useState } from "react";
import {
  DASHBOARD_SECTIONS,
  scrollToSection,
  type DashboardSectionId,
} from "@/lib/section-nav";
import { useScrollSpy } from "@/lib/use-scroll-spy";

export function MainNav() {
  const activeId = useScrollSpy("current");
  const [pendingId, setPendingId] = useState<DashboardSectionId | null>(null);
  const displayId = pendingId ?? activeId;

  useEffect(() => {
    if (pendingId && activeId === pendingId) {
      setPendingId(null);
    }
  }, [activeId, pendingId]);

  return (
    <nav className="shrink-0" aria-label="Main navigation">
      <div className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-full border border-slate-200/90 bg-white/85 px-1.5 py-1.5 shadow-sm shadow-slate-200/50 backdrop-blur-md">
        {DASHBOARD_SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = displayId === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setPendingId(id);
                scrollToSection(id);
              }}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition sm:gap-2 sm:px-3 sm:text-sm ${
                active
                  ? "bg-brand-primary text-white shadow-sm shadow-sky-500/30"
                  : "text-ink-muted hover:bg-slate-100/80 hover:text-ink"
              }`}
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                aria-hidden
              />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
