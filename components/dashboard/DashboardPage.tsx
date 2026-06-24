"use client";

import { useEffect } from "react";
import { CurrentWeatherPage } from "@/components/current/CurrentWeatherPage";
import { HistoricalWeatherPage } from "@/components/historical/HistoricalWeatherPage";
import { WaterLevelsPage } from "@/components/water/WaterLevelsPage";
import {
  getSectionFromHash,
  scrollToSection,
  SECTION_SCROLL_MARGIN,
  type DashboardSectionId,
} from "@/lib/section-nav";

type Props = {
  initialSection?: DashboardSectionId;
};

export function DashboardPage({ initialSection }: Props) {
  useEffect(() => {
    const target = initialSection ?? getSectionFromHash();
    if (!target || target === "current") return;

    const scrollWhenReady = (attempts = 0) => {
      const el = document.getElementById(target);
      if (el) {
        scrollToSection(target);
        return;
      }
      if (attempts < 30) {
        requestAnimationFrame(() => scrollWhenReady(attempts + 1));
      }
    };

    scrollWhenReady();
  }, [initialSection]);

  useEffect(() => {
    const onHashChange = () => {
      const section = getSectionFromHash();
      if (section) scrollToSection(section);
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <>
      <section id="current" className={SECTION_SCROLL_MARGIN}>
        <CurrentWeatherPage />
      </section>

      <section
        id="water-levels"
        className={`${SECTION_SCROLL_MARGIN} border-t border-slate-200/80`}
      >
        <WaterLevelsPage />
      </section>

      <section
        id="historical"
        className={`${SECTION_SCROLL_MARGIN} border-t border-slate-200/80`}
      >
        <HistoricalWeatherPage />
      </section>
    </>
  );
}
