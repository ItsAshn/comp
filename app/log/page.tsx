import { Footprints, Percent, Scale, Timer } from "lucide-react";

import { EntryForm } from "@/components/entry-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/dal";
import { getEntry, getLastWeight } from "@/lib/db/queries";
import { formatCount, formatKg, formatMinutes, formatPct, formatRelativeDate } from "@/lib/format";
import { isISODate, toISODate } from "@/lib/ranges";

export const metadata = { title: "Log · Comp" };

/**
 * What the day already holds. The form's fields are what you're adding, so
 * without this there'd be nowhere to see the totals you're adding to.
 */
function DayTotals({
  entry,
}: {
  entry: {
    weightKg: number | null;
    bodyFatPct: number | null;
    steps: number | null;
    workoutMin: number | null;
    notes: string | null;
  };
}) {
  const totals = [
    entry.weightKg != null && { icon: Scale, label: formatKg(entry.weightKg) },
    entry.bodyFatPct != null && { icon: Percent, label: `${formatPct(entry.bodyFatPct)} fat` },
    entry.steps != null && { icon: Footprints, label: formatCount(entry.steps) },
    entry.workoutMin != null && { icon: Timer, label: formatMinutes(entry.workoutMin) },
  ].filter((t) => t !== false);

  if (totals.length === 0 && !entry.notes) return null;

  return (
    <div className="space-y-1.5 rounded-lg bg-muted/50 px-3 py-2.5">
      {totals.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {totals.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-sm font-medium tabular-nums"
            >
              <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {label}
            </span>
          ))}
        </div>
      )}
      {/* The note is part of what the day holds; a new one appends to it. */}
      {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
    </div>
  );
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const viewer = await requireViewer();
  const today = toISODate();

  /**
   * The day being logged lives in the URL, and the form's date field writes to
   * it. That indirection is the whole point: a save lands on whichever day is
   * named in the form, so the totals on screen have to be that day's, read back
   * from the database. Letting the date field wander would show you one day's
   * totals while topping up another.
   *
   * ISO dates sort lexicographically, so `<= today` is a real future check.
   * Anything malformed falls back to today rather than erroring someone out of
   * their own log.
   */
  const { date: raw } = await searchParams;
  const date = isISODate(raw) && raw <= today ? raw : today;

  const existing = getEntry(viewer.id, date) ?? null;
  const lastWeightKg = getLastWeight(viewer.id);
  const dayLabel = formatRelativeDate(date, today);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <p className="eyebrow text-muted-foreground">Weigh in</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">Log</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {existing ? `${dayLabel}, so far` : dayLabel}
          </CardTitle>
          <CardDescription>
            {existing
              ? "Here's what this day holds. Anything you add below is counted on top of it."
              : "Fill in what you have — a weigh-in alone is a perfectly good day."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Keyed on the day so switching dates remounts the fields; the inputs
              are uncontrolled, so a plain re-render would leave whatever was
              half-typed for the previous day sitting there. The totals ride
              along as children so the form can dim them while the day they
              belong to is being swapped out. */}
          <EntryForm
            key={date}
            today={today}
            date={date}
            hasEntry={existing != null}
            lastWeightKg={lastWeightKg}
          >
            {existing && <DayTotals entry={existing} />}
          </EntryForm>
        </CardContent>
      </Card>
    </div>
  );
}
