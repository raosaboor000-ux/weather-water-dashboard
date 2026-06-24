import { CloudSun, Droplets, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const DASHBOARD_SECTIONS = [
  { id: "current", label: "Current Weather", icon: CloudSun },
  { id: "water-levels", label: "Water Levels", icon: Droplets },
  { id: "historical", label: "Historical Weather", icon: History },
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTIONS)[number]["id"];

export const SECTION_IDS = DASHBOARD_SECTIONS.map((s) => s.id);

/** Sticky top nav offset — matches scroll-margin on sections */
export const SECTION_SCROLL_OFFSET = 88;

export const SECTION_SCROLL_MARGIN = "scroll-mt-[88px]";

export function scrollToSection(id: DashboardSectionId) {
  const el = document.getElementById(id);
  if (!el) return;

  const top =
    el.getBoundingClientRect().top + window.scrollY - SECTION_SCROLL_OFFSET;

  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  window.history.replaceState(null, "", `#${id}`);
}

export function getSectionFromHash(): DashboardSectionId | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace("#", "");
  return SECTION_IDS.includes(hash as DashboardSectionId)
    ? (hash as DashboardSectionId)
    : null;
}

export type SectionNavItem = {
  id: DashboardSectionId;
  label: string;
  icon: LucideIcon;
};
