/**
 * infra/analytics.ts
 *
 * PRS telemetry re-export. All modules use this path so the underlying
 * implementation (in-memory ring buffer → future: Postgres / time-series store)
 * can be swapped without touching callers.
 */
export {
  trackPrsEvent,
  getAggregates,
  getRecentEvents,
  type PrsEventKind,
  type PrsEvent,
  type LocalePair,
} from "../lib/prsAnalytics.js";
