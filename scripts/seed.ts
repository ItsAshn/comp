/**
 * Fills a development database with two competitors and a month of plausible
 * history, so the dashboard has something to draw. Run with: pnpm db:seed
 *
 * Never run this against real data — it clears the tables first. Production
 * starts empty on purpose: the first person to visit becomes the admin.
 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { hashPassword } from "../lib/auth/password";
import { db } from "../lib/db";
import { entries, users } from "../lib/db/schema";
import { isoDaysAgo } from "../lib/ranges";

const PASSWORD = "password123";
const DAYS = 30;

interface Plan {
  name: string;
  isAdmin: boolean;
  paletteSlot: number;
  startKg: number;
  /** Kilograms shed per day, before noise. */
  kgPerDay: number;
  goalWeightKg: number;
  baseSteps: number;
}

const PLANS: Plan[] = [
  {
    name: "Ash",
    isAdmin: true,
    paletteSlot: 1,
    startKg: 92,
    kgPerDay: 0.09,
    goalWeightKg: 85,
    baseSteps: 9000,
  },
  {
    name: "Sam",
    isAdmin: false,
    paletteSlot: 2,
    startKg: 74,
    kgPerDay: 0.06,
    goalWeightKg: 70,
    baseSteps: 11000,
  },
];

/** Deterministic pseudo-noise: a seeded run looks the same every time, which
 *  makes eyeballing a chart change actually mean something. */
function wobble(seed: number): number {
  return Math.sin(seed * 12.9898) * 0.6;
}

async function main() {
  migrate(db, { migrationsFolder: "drizzle" });

  db.delete(entries).run();
  db.delete(users).run();

  const passwordHash = await hashPassword(PASSWORD);

  for (const plan of PLANS) {
    const user = db
      .insert(users)
      .values({
        name: plan.name,
        passwordHash,
        isAdmin: plan.isAdmin,
        paletteSlot: plan.paletteSlot,
        goalWeightKg: plan.goalWeightKg,
      })
      .returning()
      .get();

    for (let ago = DAYS; ago >= 0; ago--) {
      const elapsed = DAYS - ago;
      // Rest days: no entry at all, so streaks and averages have something real
      // to chew on.
      if (elapsed % 7 === 5) continue;

      const trend = plan.startKg - plan.kgPerDay * elapsed;
      const weightKg = Number((trend + wobble(elapsed + plan.startKg)).toFixed(1));
      const trained = elapsed % 3 !== 0;
      // Sparse on purpose — a weekly caliper reading, not a daily one — so the
      // dashboard is exercised with the gaps real body-fat data has.
      const measuredFat = elapsed % 7 === 2;
      const bodyFatPct = Number((32 - elapsed * 0.08 + wobble(elapsed * 3)).toFixed(1));

      db.insert(entries)
        .values({
          userId: user.id,
          performedOn: isoDaysAgo(ago),
          weightKg,
          bodyFatPct: measuredFat ? bodyFatPct : null,
          steps: Math.round(plan.baseSteps + wobble(elapsed) * 3000),
          workoutMin: trained ? 30 + ((elapsed * 7) % 40) : null,
        })
        .run();
    }
  }

  const seeded = db.select().from(users).all();
  console.log("Seeded competitors:");
  for (const u of seeded) {
    console.log(`  ${u.name}${u.isAdmin ? " (admin)" : ""} — password: ${PASSWORD}`);
  }
  console.log(`\n${db.select().from(entries).all().length} entries over ${DAYS} days.`);
}

main();
