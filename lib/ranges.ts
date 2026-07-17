/**
 * Pure time-range helpers. Deliberately free of any database import so client
 * components can use these without dragging better-sqlite3 into the browser
 * bundle — keep it that way.
 */

export type Range = "week" | "month" | "all";

export const RANGES: Range[] = ["week", "month", "all"];

export const RANGE_LABELS: Record<Range, string> = {
  week: "7 days",
  month: "30 days",
  all: "All time",
};

export function isRange(value: unknown): value is Range {
  return typeof value === "string" && (RANGES as string[]).includes(value);
}

/** Local-date ISO string. Uses local parts, not toISOString(), so a late-evening
 *  workout isn't filed under tomorrow in UTC. */
export function toISODate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * A real calendar day in YYYY-MM-DD, not merely something shaped like one.
 *
 * The shape alone isn't enough: "2026-00-00" and "2026-02-31" both match
 * /\d{4}-\d{2}-\d{2}/ and neither is a day anyone can weigh in on. Round-tripping
 * through Date and comparing back catches both, since Date rolls 02-31 forward
 * to 03-03 and rejects month 00 outright.
 */
export function isISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && toISODate(parsed) === value;
}

/** Rolling windows rather than calendar weeks — avoids "does the week start
 *  Monday?" arguments and keeps the comparison always like-for-like. */
export function rangeStart(range: Range): string | null {
  if (range === "all") return null;
  const date = new Date();
  date.setDate(date.getDate() - (range === "week" ? 7 : 30));
  return toISODate(date);
}

/** Whole days from one ISO date to another. Parsed at local midnight so a DST
 *  boundary can't round the difference down to 0.96 of a day. */
export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** ISO date `days` before `from`. */
export function isoDaysAgo(days: number, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return toISODate(date);
}

/**
 * The Monday that opens a grid of `weeks` whole weeks ending with the week
 * `today` falls in.
 *
 * The one place in the app that doesn't use a rolling window, and deliberately:
 * a rolling 28 days starts on whatever weekday you happen to open it, so its
 * columns can't mean anything. The step heatmap exists to show *weekday* habit —
 * the Sunday you never walk, the Monday you always do — and that pattern only
 * surfaces if every column is one weekday.
 *
 * Weeks start Monday as a fixed rule rather than a locale lookup, because the
 * two competitors' grids sit side by side and have to be read against each
 * other. A grid that started on Sunday for one of them and Monday for the other
 * would put different days in the same column.
 */
export function weekGridStart(today: string, weeks: number): string {
  const date = new Date(`${today}T00:00:00`);
  // getDay() is Sunday-based (0=Sun); shift it so Monday is 0.
  const sinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - sinceMonday - (weeks - 1) * 7);
  return toISODate(date);
}
