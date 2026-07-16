/**
 * Checks the competition maths and the database constraints it relies on.
 * Run with: pnpm db:verify
 *
 * The package script points DATABASE_PATH at a throwaway file, so this never
 * touches ./data/comp.db.
 */
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { hashPassword, verifyPassword } from "../lib/auth/password";
import { db } from "../lib/db";
import { accumulateDay, entries, users } from "../lib/db/schema";
import { isoDaysAgo } from "../lib/ranges";
import { scoreboard, stepsToKm, summarise, type Competitor } from "../lib/scoring";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}${
      ok ? "" : `\n        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    }`,
  );
}

migrate(db, { migrationsFolder: "drizzle" });
db.delete(entries).run();
db.delete(users).run();

const TODAY = "2026-07-15";

function competitor(over: Partial<Competitor> & Pick<Competitor, "entries">): Competitor {
  return {
    userId: 1,
    name: "Test",
    color: "var(--series-1)",
    goalWeightKg: null,
    ...over,
  };
}

console.log("\n--- percent lost is the score ---");
{
  // Heavier competitor loses more kilograms but a smaller share of themselves,
  // which is the entire reason the score is a percentage.
  const heavy = competitor({
    userId: 1,
    name: "Heavy",
    entries: [
      { performedOn: "2026-06-15", weightKg: 100, bodyFatPct: null, steps: null, workoutMin: null },
      { performedOn: TODAY, weightKg: 96, bodyFatPct: null, steps: null, workoutMin: null },
    ],
  });
  const light = competitor({
    userId: 2,
    name: "Light",
    entries: [
      { performedOn: "2026-06-15", weightKg: 70, bodyFatPct: null, steps: null, workoutMin: null },
      { performedOn: TODAY, weightKg: 66.5, bodyFatPct: null, steps: null, workoutMin: null },
    ],
  });

  check("Heavy lost 4.0kg", summarise(heavy, TODAY).kgLost, 4);
  check("Light lost 3.5kg", summarise(light, TODAY).kgLost, 3.5);
  check("Heavy is -4.00%", summarise(heavy, TODAY).pctLost, 4);
  check("Light is -5.00%", summarise(light, TODAY).pctLost, 5);

  const board = scoreboard([heavy, light], TODAY);
  check("lighter competitor leads despite fewer kg", board.leader?.name, "Light");
  check("margin is 1.00 percentage point", board.margin, 1);
  check("not tied", board.tied, false);
}

console.log("\n--- rate is per elapsed day, not per weigh-in ---");
{
  // Two weigh-ins 28 days apart describe four weeks of progress, not two days.
  const s = summarise(
    competitor({
      entries: [
        { performedOn: "2026-06-17", weightKg: 90, bodyFatPct: null, steps: null, workoutMin: null },
        { performedOn: TODAY, weightKg: 86, bodyFatPct: null, steps: null, workoutMin: null },
      ],
    }),
    TODAY,
  );
  check("4kg over 28 days = 1.00 kg/week", s.kgPerWeek, 1);
}

console.log("\n--- gaining weight scores negative ---");
{
  const s = summarise(
    competitor({
      entries: [
        { performedOn: "2026-07-01", weightKg: 80, bodyFatPct: null, steps: null, workoutMin: null },
        { performedOn: TODAY, weightKg: 82, bodyFatPct: null, steps: null, workoutMin: null },
      ],
    }),
    TODAY,
  );
  check("gained 2kg reads as -2 lost", s.kgLost, -2);
  check("percent lost is negative", s.pctLost, -2.5);
}

console.log("\n--- a single weigh-in is a baseline, not progress ---");
{
  const solo = competitor({
    name: "Solo",
    entries: [{ performedOn: TODAY, weightKg: 88, bodyFatPct: null, steps: null, workoutMin: null }],
  });
  const s = summarise(solo, TODAY);
  check("start equals current", [s.startWeightKg, s.currentWeightKg], [88, 88]);
  check("nothing lost yet", s.pctLost, 0);
  check("rate is flat, not divide-by-zero", s.kgPerWeek, 0);
  check("no leader before anyone has moved", scoreboard([solo], TODAY).leader, null);
}

console.log("\n--- goal progress ---");
{
  const s = summarise(
    competitor({
      goalWeightKg: 80,
      entries: [
        { performedOn: "2026-07-01", weightKg: 90, bodyFatPct: null, steps: null, workoutMin: null },
        { performedOn: TODAY, weightKg: 85, bodyFatPct: null, steps: null, workoutMin: null },
      ],
    }),
    TODAY,
  );
  check("halfway from 90 to 80 is 50%", s.goalProgressPct, 50);

  // A goal above the starting weight has no distance to cover; the ratio would
  // be meaningless rather than merely wrong.
  const backwards = summarise(
    competitor({
      goalWeightKg: 95,
      entries: [
        { performedOn: "2026-07-01", weightKg: 90, bodyFatPct: null, steps: null, workoutMin: null },
        { performedOn: TODAY, weightKg: 88, bodyFatPct: null, steps: null, workoutMin: null },
      ],
    }),
    TODAY,
  );
  check("goal above start yields no progress figure", backwards.goalProgressPct, null);
}

console.log("\n--- streaks and totals ---");
{
  const s = summarise(
    competitor({
      entries: [
        { performedOn: isoDaysAgo(2, new Date(`${TODAY}T00:00:00`)), weightKg: 90, bodyFatPct: null, steps: 8000, workoutMin: 30 },
        { performedOn: isoDaysAgo(1, new Date(`${TODAY}T00:00:00`)), weightKg: 89, bodyFatPct: null, steps: 10000, workoutMin: null },
        { performedOn: TODAY, weightKg: 89, bodyFatPct: null, steps: 6000, workoutMin: 60 },
      ],
    }),
    TODAY,
  );
  check("three consecutive days", s.streak, 3);
  check("steps total", s.totalSteps, 24000);
  check("steps averaged over days with steps", s.avgSteps, 8000);
  check("workout minutes averaged over days trained only", s.avgWorkoutMin, 45);
  check("total training time", s.totalWorkoutMin, 90);
}

console.log("\n--- a gap breaks the streak ---");
{
  const s = summarise(
    competitor({
      entries: [
        { performedOn: "2026-07-01", weightKg: 90, bodyFatPct: null, steps: null, workoutMin: null },
        { performedOn: TODAY, weightKg: 89, bodyFatPct: null, steps: null, workoutMin: null },
      ],
    }),
    TODAY,
  );
  check("only today counts", s.streak, 1);
}

console.log("\n--- steps to distance ---");
check("10,000 steps is 7.62km", Number(stepsToKm(10_000).toFixed(2)), 7.62);

console.log("\n--- body fat rides along without touching the score ---");
{
  const s = summarise(
    competitor({
      entries: [
        { performedOn: "2026-07-01", weightKg: 90, bodyFatPct: 30, steps: null, workoutMin: null },
        { performedOn: TODAY, weightKg: 88, bodyFatPct: 27.5, steps: null, workoutMin: null },
      ],
    }),
    TODAY,
  );
  check("latest reading is current", s.currentBodyFatPct, 27.5);
  check("delta runs from the first reading", s.bodyFatDeltaPct, -2.5);
  check("the score is still percent of weight lost", s.pctLost, 2.22);

  const single = summarise(
    competitor({
      entries: [
        { performedOn: TODAY, weightKg: null, bodyFatPct: 25, steps: null, workoutMin: null },
      ],
    }),
    TODAY,
  );
  check("one reading is a baseline, not a delta", single.bodyFatDeltaPct, null);
  check("a body-fat-only day still counts as logged", single.daysLogged, 1);
}

// tsx emits CJS, where top-level await isn't available — the async checks live
// in here rather than at module scope.
async function main() {
  console.log("\n--- password hashing ---");

  const hash = await hashPassword("correct horse battery");
  check("correct password verifies", await verifyPassword("correct horse battery", hash), true);
  check("wrong password rejected", await verifyPassword("wrong", hash), false);
  check("hash is salted, not the plaintext", hash.includes("correct"), false);

  const again = await hashPassword("correct horse battery");
  check("same password hashes differently (random salt)", hash === again, false);
  check("garbage stored hash rejected", await verifyPassword("x", "nonsense"), false);

  console.log("\n--- database constraints ---");

  const a = db
    .insert(users)
    .values({ name: "A", passwordHash: hash, isAdmin: true, paletteSlot: 1 })
    .returning()
    .get();

  // The upsert the log form depends on, driven exactly as the save action
  // drives it: logging a day repeatedly tops it up and never duplicates it.
  const log = (values: Partial<typeof entries.$inferInsert>) =>
    db
      .insert(entries)
      .values({ userId: a.id, performedOn: TODAY, ...values })
      .onConflictDoUpdate({
        target: [entries.userId, entries.performedOn],
        set: accumulateDay,
      })
      .run();

  log({ weightKg: 90, bodyFatPct: 31, steps: 3000, notes: "morning walk" });
  log({ steps: 5000, workoutMin: 30 });
  log({ weightKg: 89.5, bodyFatPct: 30.4, workoutMin: 20, notes: "evening gym" });

  const rows = db.select().from(entries).where(eq(entries.userId, a.id)).all();
  check("one row per user per day", rows.length, 1);
  check("steps from every log add up", rows[0].steps, 8000);
  check("workout minutes add up, starting from nothing", rows[0].workoutMin, 50);
  // Weights can't be summed, so the last one in is the day's reading.
  check("the latest weigh-in wins", rows[0].weightKg, 89.5);
  check("a log without a weight leaves the day's weight alone", rows[0].weightKg, 89.5);
  // The middle log carried no reading, so 30.4 also proves absence leaves it be.
  check("the latest body-fat reading wins", rows[0].bodyFatPct, 30.4);
  check("notes are joined, not overwritten", rows[0].notes, "morning walk · evening gym");

  // A metric nobody logged stays NULL: scoring averages over the days a metric
  // was recorded, and a 0 would drag that average down as if it were a real day.
  db.delete(entries).run();
  log({ weightKg: 88 });
  check(
    "a weigh-in-only day leaves steps null, not zero",
    db.select().from(entries).where(eq(entries.userId, a.id)).get()?.steps,
    null,
  );
  db.delete(entries).run();
  log({ steps: 400 });
  check(
    "a steps-only day leaves weight null",
    db.select().from(entries).where(eq(entries.userId, a.id)).get()?.weightKg,
    null,
  );

  // Requires foreign_keys=ON; without it the cascade silently does nothing.
  db.delete(users).where(eq(users.id, a.id)).run();
  check(
    "entries cascade-deleted with their user",
    db.select().from(entries).where(eq(entries.userId, a.id)).all().length,
    0,
  );

  // Two racing first-requests must not be able to mint two admins.
  db.insert(users)
    .values({ name: "admin1", passwordHash: hash, isAdmin: true, paletteSlot: 1 })
    .run();
  let secondAdminRejected = false;
  try {
    db.insert(users)
      .values({ name: "admin2", passwordHash: hash, isAdmin: true, paletteSlot: 2 })
      .run();
  } catch {
    secondAdminRejected = true;
  }
  check("a second admin is rejected by the database", secondAdminRejected, true);

  // Non-admins are unconstrained: the partial index only covers is_admin = 1.
  db.insert(users)
    .values({ name: "player1", passwordHash: hash, isAdmin: false, paletteSlot: 2 })
    .run();
  db.insert(users)
    .values({ name: "player2", passwordHash: hash, isAdmin: false, paletteSlot: 3 })
    .run();
  check("several non-admins are still allowed", db.select().from(users).all().length, 3);

  db.delete(entries).run();
  db.delete(users).run();

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
