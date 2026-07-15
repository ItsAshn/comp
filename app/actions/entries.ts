"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireViewer } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { accumulateDay, entries } from "@/lib/db/schema";
import { isISODate, toISODate } from "@/lib/ranges";

/**
 * A rejected save echoes back what was typed. React resets an uncontrolled form
 * once its action settles, so without `values` a validation error would empty
 * every field the user had just filled in.
 */
export type EntryState =
  | { ok: true; at: number }
  | { ok: false; error: string; at: number; values: Record<string, string> }
  | null;

function echo(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/** Unfilled number inputs arrive as "" in FormData; treat them as absent. */
const optionalNumber = (schema: z.ZodType<number>) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());

const entrySchema = z
  .object({
    // The date field is a real day, in the past or today. A regex on the shape
    // would wave through "2026-00-00", and the form's `max` attribute is only a
    // hint — neither survives a hand-rolled POST, and both would land a row the
    // scoreboard then has to make sense of.
    performedOn: z
      .string()
      .refine(isISODate, "Pick a valid date")
      .refine((v) => v <= toISODate(), "You can't log a day that hasn't happened yet"),
    weightKg: optionalNumber(z.coerce.number().positive().max(1000)),
    steps: optionalNumber(z.coerce.number().int().nonnegative().max(200_000)),
    workoutMin: optionalNumber(z.coerce.number().int().nonnegative().max(24 * 60)),
    notes: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.string().max(200).optional(),
    ),
  })
  .refine((v) => v.weightKg != null || v.steps != null || v.workoutMin != null, {
    message: "Add a weight, steps or workout time",
  });

/**
 * Adds one log to a day for the signed-in competitor. The user id comes from
 * the session, never the form — otherwise anyone could post entries as their
 * rival. Logging the same day again tops it up rather than replacing it; see
 * `accumulateDay`.
 */
export async function saveEntry(_prev: EntryState, formData: FormData): Promise<EntryState> {
  const viewer = await requireViewer();

  const parsed = entrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0].message,
      at: Date.now(),
      values: echo(formData),
    };
  }

  const { performedOn, weightKg, steps, workoutMin, notes } = parsed.data;

  db.insert(entries)
    .values({
      userId: viewer.id,
      performedOn,
      weightKg: weightKg ?? null,
      steps: steps ?? null,
      workoutMin: workoutMin ?? null,
      notes: notes ?? null,
    })
    // Re-logging a day tops it up instead of failing on the unique index.
    .onConflictDoUpdate({
      target: [entries.userId, entries.performedOn],
      set: accumulateDay,
    })
    .run();

  revalidatePath("/");
  revalidatePath("/log");
  revalidatePath("/history");
  return { ok: true, at: Date.now() };
}

export async function deleteEntry(id: number) {
  const viewer = await requireViewer();

  // Scoped to the owner: an id alone must not be enough to delete a rival's day.
  db.delete(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, viewer.id)))
    .run();

  revalidatePath("/");
  revalidatePath("/history");
}
