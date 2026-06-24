"use client";

import { MainNav } from "@/components/layout/MainNav";
import { Waves } from "lucide-react";

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-3 px-2 py-4 sm:min-h-[4.5rem] sm:justify-center sm:py-5">
        <div className="flex w-full shrink-0 items-center gap-3 sm:absolute sm:left-3 sm:top-1/2 sm:w-auto sm:-translate-y-1/2 lg:left-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-md shadow-sky-500/25 sm:h-11 sm:w-11">
            <Waves className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" aria-hidden />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-display text-base font-bold tracking-tight text-ink sm:text-lg">
              Weather and Water Level
            </p>
            <p className="mt-0.5 font-display text-xs font-medium text-ink-muted sm:text-sm">
              Dashboard
            </p>
          </div>
        </div>

        <MainNav />
      </div>
    </header>
  );
}
