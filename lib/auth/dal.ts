import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { seriesColor } from "@/lib/palette";

import { readSession } from "./session";

/**
 * Centralised authorisation. Every page and Server Action funnels through these
 * helpers so an auth check can't be forgotten at a call site — Server Actions
 * are public endpoints and must each check for themselves.
 *
 * `cache` memoises for the duration of one render pass, so a dashboard that
 * needs the current user in three places still costs one query.
 */

/** Public view of an account: never carries the password hash. */
export interface Viewer {
  id: number;
  name: string;
  color: string;
  isAdmin: boolean;
  goalWeightKg: number | null;
}

function toViewer(user: User): Viewer {
  return {
    id: user.id,
    name: user.name,
    color: seriesColor(user.paletteSlot),
    isAdmin: user.isAdmin,
    goalWeightKg: user.goalWeightKg,
  };
}

export const countUsers = cache((): number => {
  return db.select().from(users).all().length;
});

/** True before anyone has ever registered. The first person through the door
 *  becomes the admin; see app/setup. */
export const needsSetup = cache((): boolean => countUsers() === 0);

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await readSession();
  if (!session) return null;

  const user = db.select().from(users).where(eq(users.id, session.userId)).get();
  return user ? toViewer(user) : null;
});

/** Use in any page or action that requires a login. Redirects rather than
 *  returning null so callers can't accidentally proceed unauthenticated. */
export const requireViewer = cache(async (): Promise<Viewer> => {
  const viewer = await getViewer();
  if (!viewer) redirect(needsSetup() ? "/setup" : "/login");
  return viewer;
});

export const requireAdmin = cache(async (): Promise<Viewer> => {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) redirect("/");
  return viewer;
});
