import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

export const DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/comp.db";

function createConnection() {
  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });

  const sqlite = new Database(DATABASE_PATH);

  // Must come first: switching journal_mode takes a write lock, and without a
  // busy timeout already in place that fails outright rather than waiting. The
  // production build opens this file from ~11 workers at once, which is exactly
  // the race that trips it.
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("journal_mode = WAL");
  // SQLite defaults foreign keys OFF; without this, the users->entries cascade
  // is silently not enforced.
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = NORMAL");

  return sqlite;
}

// Next's dev server re-evaluates modules on hot reload; without a global the
// process accumulates a new SQLite handle per edit.
const globalForDb = globalThis as unknown as { __sqlite?: Database.Database };

const sqlite = globalForDb.__sqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") globalForDb.__sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
