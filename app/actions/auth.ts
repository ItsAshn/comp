"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { requireAdmin, requireViewer } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { slotForIndex } from "@/lib/palette";

/**
 * `name` echoes back what was typed. React resets an uncontrolled form once its
 * action settles, so without this a wrong password also wipes the name field and
 * the user retypes both.
 */
export type FormState = { error: string; name?: string } | null;

function nameFrom(formData: FormData): string {
  const raw = formData.get("name");
  return typeof raw === "string" ? raw : "";
}

const credentials = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(24, "Name must be 24 characters or fewer"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

/** Names are compared case-insensitively so "Ash" and "ash" can't both exist
 *  and quietly split one person's history in two. */
function findByName(name: string) {
  return db
    .select()
    .from(users)
    .where(sql`lower(${users.name}) = ${name.toLowerCase()}`)
    .get();
}

function countUsers(): number {
  return db.select().from(users).all().length;
}

async function createAccount(name: string, password: string, isAdmin: boolean) {
  const passwordHash = await hashPassword(password);
  // Assigned on join and never reshuffled, so the admin is always slot 1 (blue)
  // and their opponent slot 2 (orange).
  const paletteSlot = slotForIndex(countUsers());

  return db
    .insert(users)
    .values({ name, passwordHash, isAdmin, paletteSlot })
    .returning({ id: users.id })
    .get();
}

/**
 * First run only. Whoever registers first becomes the admin — this is the
 * bootstrap the whole account model hangs off, so it must be impossible to call
 * a second time.
 */
export async function setupAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  if (countUsers() > 0) return { error: "Setup has already been completed" };

  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, name: nameFrom(formData) };

  const { name, password } = parsed.data;
  if (formData.get("confirm") !== password) {
    return { error: "Passwords do not match", name };
  }

  const created = await createAccount(name, password, true);
  await createSession(created.id);
  redirect("/");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  // Deliberately vague: a precise message would confirm which names exist.
  if (!parsed.success) return { error: "Incorrect name or password", name: nameFrom(formData) };

  const user = findByName(parsed.data.name);

  // Hash even when the user is unknown, so a missing account and a wrong
  // password take the same time to answer and can't be told apart.
  const stored = user?.passwordHash ?? (await hashPassword("placeholder"));
  const ok = await verifyPassword(parsed.data.password, stored);

  if (!user || !ok) return { error: "Incorrect name or password", name: parsed.data.name };

  await createSession(user.id);

  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/** Admin-only: adds the opponent. */
export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, name: nameFrom(formData) };

  const { name, password } = parsed.data;
  if (findByName(name)) return { error: `"${name}" is already taken`, name };

  await createAccount(name, password, false);

  revalidatePath("/admin");
  revalidatePath("/");
  return null;
}

export async function deleteUser(userId: number) {
  const admin = await requireAdmin();

  // Deleting yourself would leave the app with no admin and no way to make one
  // short of wiping the database.
  if (userId === admin.id) return;

  db.delete(users).where(eq(users.id, userId)).run();

  revalidatePath("/admin");
  revalidatePath("/");
}

const goalSchema = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().positive().max(1000).optional(),
);

/** Each competitor sets their own target; it feeds the goal-progress stat and
 *  never affects who is winning. */
export async function updateGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();

  const parsed = goalSchema.safeParse(formData.get("goalWeightKg"));
  if (!parsed.success) return { error: "Enter a valid goal weight, or leave it blank" };

  db.update(users)
    .set({ goalWeightKg: parsed.data ?? null })
    .where(eq(users.id, viewer.id))
    .run();

  revalidatePath("/");
  revalidatePath("/settings");
  return null;
}
