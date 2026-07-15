import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

export const SESSION_COOKIE = "session";

const SESSION_DAYS = 30;

/** The cookie holds the raw token; the table holds only this digest. A dump of
 *  the database therefore hands an attacker nothing they can present as a
 *  cookie. SHA-256 is right here (unlike for passwords) because the token is
 *  256 bits of entropy already — there is nothing to brute force. */
function tokenId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expiryFrom(now = Date.now()): number {
  return Math.floor(now / 1000) + SESSION_DAYS * 24 * 60 * 60;
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = expiryFrom();

  db.insert(sessions).values({ id: tokenId(token), userId, expiresAt }).run();

  // Opportunistic cleanup: no cron in this app, and expired rows are dead
  // weight that would otherwise accumulate forever.
  db.delete(sessions).where(lt(sessions.expiresAt, Math.floor(Date.now() / 1000))).run();

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Plain HTTP on localhost during dev would silently drop a Secure cookie.
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt * 1000),
    path: "/",
  });
}

export interface SessionUser {
  userId: number;
  isAdmin: boolean;
}

/** Resolves the cookie against the database. Returns null for a missing,
 *  unknown or expired token. */
export async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const id = tokenId(token);
  const row = db
    .select({
      expiresAt: sessions.expiresAt,
      userId: users.id,
      isAdmin: users.isAdmin,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .get();

  if (!row) return null;

  if (row.expiresAt <= Math.floor(Date.now() / 1000)) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }

  return { userId: row.userId, isAdmin: row.isAdmin };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) db.delete(sessions).where(eq(sessions.id, tokenId(token))).run();
  store.delete(SESSION_COOKIE);
}
