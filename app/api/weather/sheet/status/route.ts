import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { googleSheetsStorage } from "@/lib/google-sheets-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await googleSheetsStorage.getStatus();
  return NextResponse.json({
    ...status,
    serviceAccountEmail: appConfig.googleSheets.serviceAccountEmail,
    spreadsheetUrl: appConfig.googleSheets.spreadsheetUrl,
    enabled: appConfig.googleSheets.enabled,
  });
}
