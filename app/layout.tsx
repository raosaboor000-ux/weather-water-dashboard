import type { Metadata } from "next";
import "./globals.css";
import { DashboardProviders } from "@/components/providers/DashboardProviders";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "AWS TALAGANG Weather Dashboard",
  description:
    "Live weather and historical trends for AWS TALAGANG (Weather Underground station ITALAG18).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <DashboardProviders>
          <AppShell>{children}</AppShell>
        </DashboardProviders>
      </body>
    </html>
  );
}
