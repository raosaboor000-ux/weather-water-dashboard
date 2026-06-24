/**
 * React Query timing — aligned with MACH dashboard behaviour.
 *
 * MACH does NOT poll every few seconds. It refreshes:
 *   - Current weather: every 5 minutes (stale after 2 minutes)
 *   - Historical data: every 5 minutes
 */
export const weatherQueryConfig = {
  /** Data considered fresh for 2 minutes before background refetch. */
  latestStaleMs: 2 * 60_000,
  /** Auto-refresh current conditions every 5 minutes. */
  latestRefetchMs: 5 * 60_000,
  /** Historical series stale / refetch cadence — 5 minutes. */
  historyStaleMs: 5 * 60_000,
  historyRefetchMs: 5 * 60_000,
} as const;
