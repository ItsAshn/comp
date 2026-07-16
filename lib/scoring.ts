/**
 * The competition maths. Deliberately free of any database import so client
 * components can use these without dragging better-sqlite3 into the browser
 * bundle — keep it that way.
 *
 * The rule: whoever has shed the largest percentage of their starting weight is
 * winning. Percent rather than kilograms, so a heavier and a lighter competitor
 * are asked for the same proportional effort.
 */

import { daysBetween, isoDaysAgo, toISODate } from "./ranges";

export interface DayEntry {
  performedOn: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  steps: number | null;
  workoutMin: number | null;
}

export interface Competitor {
  userId: number;
  name: string;
  /** A CSS colour, resolved from the palette slot — `var(--series-N)` in
   *  practice, so light and dark each get their own step. */
  color: string;
  goalWeightKg: number | null;
  entries: DayEntry[];
}

export interface TrendPoint {
  performedOn: string;
  weightKg: number;
  /** Trailing 7-day mean. Day-to-day scale noise (water, food, time of day) is
   *  larger than real fat loss, so the average is the honest trend line. */
  averageKg: number;
}

export interface Standing {
  userId: number;
  name: string;
  color: string;
  /** Percent of starting weight lost. Positive means down, negative means up. */
  pctLost: number;
  kgLost: number;
  startWeightKg: number | null;
  currentWeightKg: number | null;
  /** Latest body-fat reading, and the change since the first one. Purely
   *  informational — the score never looks at these. */
  currentBodyFatPct: number | null;
  bodyFatDeltaPct: number | null;
  goalWeightKg: number | null;
  /** Percent of the start→goal distance covered, null when no goal is set. */
  goalProgressPct: number | null;
  /** Average kilograms per week between first and last weigh-in. */
  kgPerWeek: number;
  /** Kilograms per week over the last fortnight only — who is moving fastest
   *  now, as opposed to who has moved furthest overall. */
  recentKgPerWeek: number;
  /** Days from now to the goal at the current rate; null if no goal, or if the
   *  rate is flat or moving the wrong way. */
  daysToGoal: number | null;
  weighIns: number;
  daysLogged: number;
  /** Consecutive days with an entry, counting back from today. */
  streak: number;
  totalSteps: number;
  avgSteps: number;
  totalWorkoutMin: number;
  avgWorkoutMin: number;
  /** Straight-line distance implied by the step count. */
  stepsKm: number;
  trend: TrendPoint[];
}

/** Mean stride length in metres, the usual figure for an adult walking. */
const STRIDE_M = 0.762;

const WINDOW_DAYS = 7;

/** Momentum needs enough readings to survive scale noise but must still react
 *  to a change of pace; a fortnight is the usual compromise. */
const MOMENTUM_DAYS = 14;

export function stepsToKm(steps: number): number {
  return (steps * STRIDE_M) / 1000;
}

function round(value: number, places = 1): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

/** Ascending by date, so "first" and "last" mean what they say downstream. */
function byDate(entries: DayEntry[]): DayEntry[] {
  return [...entries].sort((a, b) => a.performedOn.localeCompare(b.performedOn));
}

function buildTrend(sorted: DayEntry[]): TrendPoint[] {
  const weighIns = sorted.filter((e) => e.weightKg != null);

  return weighIns.map((entry, i) => {
    const window = weighIns.slice(Math.max(0, i - WINDOW_DAYS + 1), i + 1);
    const mean = window.reduce((sum, w) => sum + w.weightKg!, 0) / window.length;

    return {
      performedOn: entry.performedOn,
      weightKg: entry.weightKg!,
      averageKg: round(mean, 2),
    };
  });
}

/** Kilograms per week across the weigh-ins inside the trailing window. Returns
 *  0 until there are two readings to draw a line between. */
function momentum(weighIns: DayEntry[], today: string): number {
  const since = isoDaysAgo(MOMENTUM_DAYS, new Date(`${today}T00:00:00`));
  const recent = weighIns.filter((e) => e.performedOn >= since);
  if (recent.length < 2) return 0;

  const first = recent.at(0)!;
  const last = recent.at(-1)!;
  const days = daysBetween(first.performedOn, last.performedOn);
  if (days <= 0) return 0;

  return ((first.weightKg! - last.weightKg!) / days) * 7;
}

/** Counts back from today. A day logged yesterday but not today still keeps the
 *  streak alive — you haven't necessarily missed it until the day is over. */
function currentStreak(sorted: DayEntry[], today = toISODate()): number {
  const logged = new Set(sorted.map((e) => e.performedOn));
  if (logged.size === 0) return 0;

  const cursor = new Date(`${today}T00:00:00`);
  if (!logged.has(today)) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (logged.has(toISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function summarise(competitor: Competitor, today = toISODate()): Standing {
  const sorted = byDate(competitor.entries);
  const weighIns = sorted.filter((e) => e.weightKg != null);

  const startWeightKg = weighIns.at(0)?.weightKg ?? null;
  const currentWeightKg = weighIns.at(-1)?.weightKg ?? null;

  // Body fat keeps its own timeline: a caliper day and a scale day are often
  // different days, so it can't ride along with the weigh-ins.
  const fatReadings = sorted.filter((e) => e.bodyFatPct != null);
  const startBodyFatPct = fatReadings.at(0)?.bodyFatPct ?? null;
  const currentBodyFatPct = fatReadings.at(-1)?.bodyFatPct ?? null;
  const bodyFatDeltaPct =
    // Two readings, not one twice: a delta of a reading against itself is noise.
    fatReadings.length > 1 && startBodyFatPct != null && currentBodyFatPct != null
      ? round(currentBodyFatPct - startBodyFatPct)
      : null;

  const kgLost =
    startWeightKg != null && currentWeightKg != null ? startWeightKg - currentWeightKg : 0;
  const pctLost = startWeightKg != null && startWeightKg > 0 ? (kgLost / startWeightKg) * 100 : 0;

  // Elapsed days between the bookend weigh-ins, not the number of weigh-ins:
  // two readings a month apart describe a month of progress, not two days of it.
  const spanDays =
    weighIns.length > 1
      ? daysBetween(weighIns.at(0)!.performedOn, weighIns.at(-1)!.performedOn)
      : 0;
  const kgPerWeek = spanDays > 0 ? (kgLost / spanDays) * 7 : 0;

  const goalWeightKg = competitor.goalWeightKg;
  let goalProgressPct: number | null = null;
  let daysToGoal: number | null = null;

  if (goalWeightKg != null && startWeightKg != null && currentWeightKg != null) {
    const toLose = startWeightKg - goalWeightKg;
    // A goal at or above the starting weight has no distance to cover, so the
    // ratio would be meaningless (or divide by zero).
    goalProgressPct = toLose > 0 ? Math.min(100, Math.max(0, (kgLost / toLose) * 100)) : null;

    const remaining = currentWeightKg - goalWeightKg;
    const kgPerDay = spanDays > 0 ? kgLost / spanDays : 0;
    if (remaining > 0 && kgPerDay > 0) daysToGoal = Math.ceil(remaining / kgPerDay);
  }

  const totalSteps = sorted.reduce((sum, e) => sum + (e.steps ?? 0), 0);
  const stepDays = sorted.filter((e) => e.steps != null).length;
  const totalWorkoutMin = sorted.reduce((sum, e) => sum + (e.workoutMin ?? 0), 0);
  const workoutDays = sorted.filter((e) => e.workoutMin != null).length;

  return {
    userId: competitor.userId,
    name: competitor.name,
    color: competitor.color,
    pctLost: round(pctLost, 2),
    kgLost: round(kgLost, 1),
    startWeightKg,
    currentWeightKg,
    currentBodyFatPct,
    bodyFatDeltaPct,
    goalWeightKg,
    goalProgressPct: goalProgressPct == null ? null : round(goalProgressPct),
    kgPerWeek: round(kgPerWeek, 2),
    recentKgPerWeek: round(momentum(weighIns, today), 2),
    daysToGoal,
    weighIns: weighIns.length,
    daysLogged: sorted.length,
    streak: currentStreak(sorted, today),
    totalSteps,
    avgSteps: stepDays > 0 ? Math.round(totalSteps / stepDays) : 0,
    totalWorkoutMin,
    avgWorkoutMin: workoutDays > 0 ? Math.round(totalWorkoutMin / workoutDays) : 0,
    stepsKm: round(stepsToKm(totalSteps)),
    trend: buildTrend(sorted),
  };
}

export interface Scoreboard {
  standings: Standing[];
  leader: Standing | null;
  /** Percentage points between first and second. Zero when nobody leads yet. */
  margin: number;
  /** True when two competitors are level and at least one has weighed in. */
  tied: boolean;
}

export function scoreboard(competitors: Competitor[], today = toISODate()): Scoreboard {
  const standings = competitors
    .map((c) => summarise(c, today))
    .sort((a, b) => b.pctLost - a.pctLost || a.name.localeCompare(b.name));

  // Nobody has stepped on a scale yet, so there is no race to lead.
  const started = standings.some((s) => s.weighIns > 0 && s.pctLost !== 0);
  const [first, second] = standings;

  return {
    standings,
    leader: started ? (first ?? null) : null,
    margin: started && first && second ? round(first.pctLost - second.pctLost, 2) : 0,
    tied: started && first != null && second != null && first.pctLost === second.pctLost,
  };
}
