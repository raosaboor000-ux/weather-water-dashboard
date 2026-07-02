import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Card } from "@/components/ui/Card";
import { appConfig } from "@/lib/config";
import { googleSheetsStorage } from "@/lib/google-sheets-storage";
import { weatherQueryConfig } from "@/lib/query-config";

export default async function SettingsPage() {
  const sheetStatus = await googleSheetsStorage.getStatus();

  return (
    <div className="dashboard-shell pb-12">
      <DashboardHeader title="Settings" subtitle="Configuration overview" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold text-ink">
            Weather Underground
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-subtle">Station ID</dt>
              <dd className="font-mono text-ink">{appConfig.station.id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-subtle">Station name</dt>
              <dd className="text-ink">{appConfig.station.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-subtle">Refresh</dt>
              <dd className="text-ink">
                every {weatherQueryConfig.latestRefetchMs / 60_000} min
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold text-ink">
            Google Sheets
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-subtle">Status</dt>
              <dd
                className={
                  sheetStatus.configured ? "text-emerald-600" : "text-amber-600"
                }
              >
                {sheetStatus.configured ? "Connected" : "Not configured"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-subtle">Rows stored</dt>
              <dd className="text-ink">{sheetStatus.rowCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-subtle">Worksheet</dt>
              <dd className="text-ink">{sheetStatus.worksheetName}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-ink-subtle">Service account</dt>
              <dd className="break-all font-mono text-xs text-ink">
                {appConfig.googleSheets.serviceAccountEmail}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-ink-subtle">Spreadsheet</dt>
              <dd>
                <a
                  href={appConfig.googleSheets.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline"
                >
                  AWS 6 (Google Sheets)
                </a>
              </dd>
            </div>
          </dl>
          {!sheetStatus.configured ? (
            <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
              Share the spreadsheet with the service account email above (Editor
              access), and set{" "}
              <code className="rounded bg-slate-100 px-1">
                GOOGLE_SERVICE_ACCOUNT_JSON
              </code>{" "}
              to the full service account JSON (single line in{" "}
              <code className="rounded bg-slate-100 px-1">.env.local</code>).
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
