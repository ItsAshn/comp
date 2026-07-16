import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    /** scrypt digest, encoded by lib/auth/password.ts. Never leaves the server. */
    passwordHash: text("password_hash").notNull(),
    /** The first account ever created. Only an admin may create other accounts. */
    isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
    /** Index into the categorical chart palette (1-based), not a hex value: each
     *  slot resolves to a different step in light and dark mode, which a stored
     *  colour could never do. See --series-N in app/globals.css. */
    paletteSlot: integer("palette_slot").notNull().default(1),
    /** Optional target. Drives the goal-progress stat; the competition itself is
     *  scored on percent lost, so this is never required. */
    goalWeightKg: real("goal_weight_kg"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    // Bootstrapping the admin is a check-then-insert, which two simultaneous
    // first requests could both pass. A partial unique index makes a second
    // admin impossible in the database rather than merely unlikely in the code.
    uniqueIndex("idx_users_single_admin")
      .on(t.isAdmin)
      .where(sql`${t.isAdmin} = 1`),
  ],
);

/**
 * Opaque server-side sessions. The `id` is a SHA-256 digest of the token held
 * in the user's cookie, so a stolen database still yields no usable cookies.
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("idx_sessions_user").on(t.userId)],
);

/**
 * One row per person per day, holding that day's running totals. Every field is
 * optional because a day where you only stepped on the scale is still worth
 * recording — the competition needs weigh-ins, not complete days.
 */
export const entries = sqliteTable(
  "entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 'YYYY-MM-DD'. A weigh-in happens on a day, not an instant — this keeps
     *  range filtering free of timezone skew. */
    performedOn: text("performed_on").notNull(),
    weightKg: real("weight_kg"),
    /** Percent of body weight, 0–100. Informational only — the competition is
     *  scored on percent of weight lost, never on this. */
    bodyFatPct: real("body_fat_pct"),
    steps: integer("steps"),
    workoutMin: integer("workout_min"),
    notes: text("notes"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    // Logging the same day twice folds into that day rather than creating a
    // rival row; the upsert in app/actions/entries.ts depends on this
    // constraint existing. See `accumulateDay` below for what folding means.
    uniqueIndex("idx_entries_user_day").on(t.userId, t.performedOn),
  ],
);

/**
 * The conflict clause every save uses, so a day is a running total you can add
 * to all day long: a morning walk and an evening one are two logs and one
 * eight-thousand-step day.
 *
 * Weight and body fat are the exceptions — you can't add two readings together,
 * so the latest one of the day wins and earlier ones read as corrections of it.
 * Notes are joined instead of replaced, so the morning's note survives the
 * evening's.
 *
 * Every branch preserves NULL rather than folding it to 0: scoring counts the
 * days a metric was actually recorded, and a 0 there would claim you walked
 * nowhere on a day you simply never mentioned steps.
 */
export const accumulateDay = {
  weightKg: sql`coalesce(excluded.weight_kg, ${entries.weightKg})`,
  bodyFatPct: sql`coalesce(excluded.body_fat_pct, ${entries.bodyFatPct})`,
  steps: sql`case
    when excluded.steps is null then ${entries.steps}
    else coalesce(${entries.steps}, 0) + excluded.steps
  end`,
  workoutMin: sql`case
    when excluded.workout_min is null then ${entries.workoutMin}
    else coalesce(${entries.workoutMin}, 0) + excluded.workout_min
  end`,
  notes: sql`case
    when excluded.notes is null then ${entries.notes}
    when ${entries.notes} is null then excluded.notes
    else ${entries.notes} || ' · ' || excluded.notes
  end`,
  updatedAt: sql`(unixepoch())`,
};

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
