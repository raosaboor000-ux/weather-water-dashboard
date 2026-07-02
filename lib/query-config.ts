/**
 * React Query timing.
 *
 * On load, refresh, or refocus: history syncs all unsaved WU readings to the sheet.
 * While the tab is open, both current and history refetch every 5 minutes.
 */
export const weatherQueryConfig = {
  latestStaleMs: 2 * 60_000,
  latestRefetchMs: 5 * 60_000,
  historyStaleMs: 5 * 60_000,
  historyRefetchMs: 5 * 60_000,
} as const;
