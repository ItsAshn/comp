/**
 * The competition maths. Deliberately free of any database import so client
 * components can use these without dragging better-sqlite3 into the browser
 * bundle — keep it that way.
 *
 * The rule: whoever has shed the largest percentage of their starting weight is
 * winning. Percent rather than kilograms, so a heavier and a lighter competitor
 * are asked for the same proportional effort.
 */

import { daysBetween, isoDaysAgo, toISODate, weekGridStart } from "./ranges";

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

/** One cell of the step heatmap. */
export interface StepDay {
  performedOn: string;
  /** Null means no steps were logged that day — which the grid draws differently
   *  from a logged zero, for the same reason the schema won't fold one into the
   *  other. */
  steps: number | null;
  /** A slot in the current week that hasn't arrived yet. The grid keeps it so
   *  the weekday columns stay aligned but draws nothing in it: a day you haven't
   *  lived and a day you didn't walk are not the same absence. */
  pending: boolean;
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
  /** Average kilograms per week between first and last weigh-in. Null until two
   *  weigh-ins on two different days give it a span to average over — one
   *  reading is not a flat week, and a 0 here would claim it was. */
  kgPerWeek: number | null;
  /** Kilograms per week over the last fortnight only — who is moving fastest
   *  now, as opposed to who has moved furthest overall. Null on the same terms
   *  as `kgPerWeek`. */
  recentKgPerWeek: number | null;
  /** Days from now to the goal at the current rate; null if no goal, or if the
   *  rate is flat or moving the wrong way. */
  daysToGoal: number | null;
  weighIns: number;
  daysLogged: number;
  /** Consecutive days with an entry, counting back from today. */
  streak: number;
  totalSteps: number;
  /** Steps per day across the days steps were actually logged, all time. */
  avgSteps: number;
  /** Steps per day over the trailing week, divided by seven whether or not a day
   *  was logged. Deliberately a different denominator from `avgSteps`: that one
   *  answers "how far do you walk when you walk", this one answers "how far are
   *  you walking these days", and a week off is part of that answer. The two are
   *  labelled differently wherever they're shown together. */
  avgSteps7d: number;
  /** The last four whole weeks of daily steps, Monday-first and oldest-first —
   *  exactly the cells of the heatmap, in reading order. */
  stepTrail: StepDay[];
  totalWorkoutMin: number;
  avgWorkoutMin: number;
  /** Straight-line distance implied by the step count. */
  stepsKm: number;
  trend: TrendPoint[];
}

/** Mean stride length in metres, the usual figure for an adult walking. */
const STRIDE_M = 0.762;

/**
 * The step count that makes a day count. Ten thousand has no clinical basis —
 * it began as a 1960s pedometer's brand name — but it's the number everyone
 * already walks against, and a target you recognise beats a defensible one you'd
 * have to explain. Nothing in the competition is scored on it: it only decides
 * whether the heatmap fills a square in.
 */
export const GOAL_STEPS = 10_000;

const WINDOW_DAYS = 7;

/** Momentum needs enough readings to survive scale noise but must still react
 *  to a change of pace; a fortnight is the usual compromise. */
const MOMENTUM_DAYS = 14;

/** The trailing week the step average covers. Its own constant rather than a
 *  borrowed WINDOW_DAYS: the two happen to both be seven days, but retuning the
 *  weight trend has no business moving the step stat. */
const STEP_WEEK_DAYS = 7;

/** Weeks in the step heatmap. Four reads as "this month" without the grid
 *  growing forever as the competition runs long. */
const HEATMAP_WEEKS = 4;

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

  return weighIns.map((entry) => {
    // A window of DAYS, not of readings. Slicing a fixed number of weigh-ins
    // only answers "the last 7 days" for someone who weighs in daily: weigh in
    // every fifth day and the same slice quietly averages a month into a line
    // labelled "7-day avg". The window is defined by the calendar, so it means
    // the same thing at every logging cadence.
    const from = isoDaysAgo(WINDOW_DAYS - 1, new Date(`${entry.performedOn}T00:00:00`));
    const window = weighIns.filter(
      (w) => w.performedOn >= from && w.performedOn <= entry.performedOn,
    );
    const mean = window.reduce((sum, w) => sum + w.weightKg!, 0) / window.length;

    return {
      performedOn: entry.performedOn,
      weightKg: entry.weightKg!,
      averageKg: round(mean, 2),
    };
  });
}

/**
 * Kilograms per week, as the least-squares slope through every weigh-in in the
 * trailing window. Null until two readings on two different days give it a line
 * to fit.
 *
 * Taking the window's endpoints was the obvious implementation and the wrong
 * one: it makes a fortnight's verdict hostage to exactly two readings, and daily
 * scale noise (water, food, time of day) is larger than the real weekly change.
 * One heavy Monday morning at either end could report a steady loss as flat. A
 * fit spends every reading in the window, so a single bad day tugs the line
 * instead of defining it.
 */
function momentum(weighIns: DayEntry[], today: string): number | null {
  const since = isoDaysAgo(MOMENTUM_DAYS, new Date(`${today}T00:00:00`));
  const recent = weighIns.filter((e) => e.performedOn >= since);
  if (recent.length < 2) return null;

  const base = recent[0].performedOn;
  const points = recent.map((e) => ({
    day: daysBetween(base, e.performedOn),
    kg: e.weightKg!,
  }));

  const meanDay = points.reduce((sum, p) => sum + p.day, 0) / points.length;
  const meanKg = points.reduce((sum, p) => sum + p.kg, 0) / points.length;

  let covariance = 0;
  let variance = 0;
  for (const p of points) {
    covariance += (p.day - meanDay) * (p.kg - meanKg);
    variance += (p.day - meanDay) ** 2;
  }
  // Every reading landed on the same day, so there's no slope to speak of —
  // several weigh-ins on one morning describe that morning, not a trend.
  if (variance === 0) return null;

  // The slope is kilograms of change per day, negative when weight is falling.
  // Negated so that losing reads positive, matching kgLost and kgPerWeek.
  return (-covariance / variance) * 7;
}

/**
 * Every day of the heatmap's four weeks, in reading order, whether or not it was
 * logged. The grid is a calendar: it has to carry the empty days too, or it
 * would show four weeks of walking with the rest days quietly removed.
 */
function buildStepTrail(sorted: DayEntry[], today: string): StepDay[] {
  const byDay = new Map(
    sorted.filter((e) => e.steps != null).map((e) => [e.performedOn, e.steps!]),
  );

  const start = new Date(`${weekGridStart(today, HEATMAP_WEEKS)}T00:00:00`);

  return Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    const iso = toISODate(day);

    return {
      performedOn: iso,
      steps: byDay.get(iso) ?? null,
      pending: iso > today,
    };
  });
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
  // Null, not 0, when there's no span to average over: a competitor with one
  // weigh-in hasn't held steady, they simply haven't been measured twice, and
  // "0 kg/wk" would report the second as though it were the first.
  const kgPerWeek = spanDays > 0 ? (kgLost / spanDays) * 7 : null;
  const recentKgPerWeek = momentum(weighIns, today);

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

  // Bounded at both ends: `>= weekStart` is the week, and `<= today` keeps a
  // day logged ahead of time out of an average that claims to be the last seven.
  const weekStart = isoDaysAgo(STEP_WEEK_DAYS - 1, new Date(`${today}T00:00:00`));
  const weekSteps = sorted
    .filter((e) => e.performedOn >= weekStart && e.performedOn <= today)
    .reduce((sum, e) => sum + (e.steps ?? 0), 0);

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
    kgPerWeek: kgPerWeek == null ? null : round(kgPerWeek, 2),
    recentKgPerWeek: recentKgPerWeek == null ? null : round(recentKgPerWeek, 2),
    daysToGoal,
    weighIns: weighIns.length,
    daysLogged: sorted.length,
    streak: currentStreak(sorted, today),
    totalSteps,
    avgSteps: stepDays > 0 ? Math.round(totalSteps / stepDays) : 0,
    avgSteps7d: Math.round(weekSteps / STEP_WEEK_DAYS),
    stepTrail: buildStepTrail(sorted, today),
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
