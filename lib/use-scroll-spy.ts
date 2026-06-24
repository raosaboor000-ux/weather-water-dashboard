"use client";

import { useEffect, useState } from "react";
import {
  SECTION_IDS,
  SECTION_SCROLL_OFFSET,
  type DashboardSectionId,
} from "@/lib/section-nav";

export function useScrollSpy(
  defaultId: DashboardSectionId = "current"
): DashboardSectionId {
  const [activeId, setActiveId] = useState<DashboardSectionId>(defaultId);

  useEffect(() => {
    const update = () => {
      const position = window.scrollY + SECTION_SCROLL_OFFSET + 4;
      let active: DashboardSectionId = SECTION_IDS[0];

      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= position) {
          active = id;
        }
      }

      setActiveId(active);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return activeId;
}
