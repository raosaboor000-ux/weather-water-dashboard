/**
 * Server-side logging for API requests, errors, and storage events.
 * Writes to console; extend to file logging in a later phase.
 */

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const prefix = `[weather] ${ts} ${level.toUpperCase()}`;
  if (meta) {
    console[level](prefix, message, meta);
  } else {
    console[level](prefix, message);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
