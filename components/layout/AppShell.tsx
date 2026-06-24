"use client";

import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <TopNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
