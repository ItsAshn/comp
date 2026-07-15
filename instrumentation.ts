/**
 * Runs once when the server boots (dev and prod alike), so a fresh container
 * migrates itself with no entrypoint script.
 *
 * Importing the migrator here also makes Next trace it into the standalone
 * output — a separate migrate script would not be traced and would break.
 *
 * Note there is deliberately no seeding: the database must start empty so the
 * first person to reach the app becomes the admin. See app/setup.
 */
export async function register() {
  // Only the Node runtime has a filesystem; skip edge and the build phase.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { db } = await import("./lib/db");

  migrate(db, { migrationsFolder: "drizzle" });
}
