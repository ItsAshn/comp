import "server-only";

import { and, eq, gte, sql, type SQL } from "drizzle-orm";

import { seriesColor } from "@/lib/palette";
import { rangeStart, type Range } from "@/lib/ranges";
import { scoreboard, type Competitor, type Scoreboard } from "@/lib/scoring";

import { db } from "./index";
import { entries, users } from "./schema";

/**
 * Everyone in the competition with their full history attached. The scoreboard
 * is always computed over all time: "who is losing weight faster" is a question
 * about the whole contest, so a date filter here would silently rewrite each
 * competitor's starting weight.
 */
export function getCompetitors(): Competitor[] {
  const roster = db.select().from(users).orderBy(users.id).all();

  const rows = db
    .select({
      userId: entries.userId,
      performedOn: entries.performedOn,
      weightKg: entries.weightKg,
      bodyFatPct: entries.bodyFatPct,
      steps: entries.steps,
      workoutMin: entries.workoutMin,
    })
    .from(entries)
    .orderBy(entries.performedOn)
    .all();

  return roster.map((user) => ({
    userId: user.id,
    name: user.name,
    color: seriesColor(user.paletteSlot),
    goalWeightKg: user.goalWeightKg,
    entries: rows.filter((r) => r.userId === user.id),
  }));
}

export function getScoreboard(): Scoreboard {
  return scoreboard(getCompetitors());
}

export function getEntry(userId: number, performedOn: string) {
  return db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), eq(entries.performedOn, performedOn)))
    .get();
}

/** The viewer's most recent weigh-in, if any — the log form shows it as the
 *  weight field's placeholder so logging from the scale is a one-glance diff. */
export function getLastWeight(userId: number): number | null {
  const row = db
    .select({ weightKg: entries.weightKg })
    .from(entries)
    .where(and(eq(entries.userId, userId), sql`${entries.weightKg} is not null`))
    .orderBy(sql`${entries.performedOn} desc`)
    .limit(1)
    .get();
  return row?.weightKg ?? null;
}

function withinRange(range: Range, extra?: SQL): SQL | undefined {
  const start = rangeStart(range);
  return and(start ? gte(entries.performedOn, start) : undefined, extra);
}

export function getEntries(range: Range, userId?: number) {
  return db
    .select({
      id: entries.id,
      userId: entries.userId,
      performedOn: entries.performedOn,
      weightKg: entries.weightKg,
      bodyFatPct: entries.bodyFatPct,
      steps: entries.steps,
      workoutMin: entries.workoutMin,
      notes: entries.notes,
      userName: users.name,
      paletteSlot: users.paletteSlot,
    })
    .from(entries)
    .innerJoin(users, eq(entries.userId, users.id))
    .where(withinRange(range, userId ? eq(entries.userId, userId) : undefined))
    .orderBy(sql`${entries.performedOn} desc, ${entries.id} desc`)
    .all()
    .map((row) => ({ ...row, color: seriesColor(row.paletteSlot) }));
}

export type EntryRow = ReturnType<typeof getEntries>[number];

export function listAccounts() {
  return db
    .select({
      id: users.id,
      name: users.name,
      paletteSlot: users.paletteSlot,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      // Built via $count rather than a raw sql`` fragment: columns embedded in
      // a raw selected field render unqualified, and inside the subquery the
      // bare "id" resolves to entries.id — silently breaking the correlation.
      entryCount: db.$count(entries, eq(entries.userId, users.id)),
    })
    .from(users)
    .orderBy(users.id)
    .all()
    .map((row) => ({ ...row, color: seriesColor(row.paletteSlot) }));
}

export type Account = ReturnType<typeof listAccounts>[number];
