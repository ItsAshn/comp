"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useTransition, type WheelEvent } from "react";
import { toast } from "sonner";

import { saveEntry, type EntryState } from "@/app/actions/entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface EntryFormProps {
  /** Today in the user's local date, resolved on the server so the default
   *  matches the day they think they're logging. */
  today: string;
  /** The day this log lands on. The page reads it from the URL and shows that
   *  day's totals beside the form; changing the date field navigates rather
   *  than just retargeting the save. */
  date: string;
  /** Whether the day already has something logged — the button says so. */
  hasEntry: boolean;
}

/**
 * A number input under the pointer treats a scroll as an increment: scrolling
 * past a focused field silently edits it. On the one number that decides the
 * competition that's worth defending against — blurring hands the scroll back
 * to the page.
 */
const blurOnWheel = (e: WheelEvent<HTMLInputElement>) => e.currentTarget.blur();

export function EntryForm({ today, date, hasEntry }: EntryFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<EntryState, FormData>(saveEntry, null);
  const [switchingDay, startDayChange] = useTransition();
  const lastToast = useRef(0);

  /**
   * These fields are what you're adding, never what's stored: a save sums into
   * the day, so a prefilled 8,000 steps would become 16,000 the moment you came
   * back to log a walk. The day's totals are on the card above instead.
   *
   * The one time they're filled in is after a rejected save, echoing back what
   * was typed — React resets an uncontrolled form once its action settles, so
   * otherwise a validation error would empty every field.
   */
  const rejected = state?.ok === false ? state.values : null;
  const initial = (field: string) => rejected?.[field] ?? "";

  useEffect(() => {
    // `at` distinguishes two identical outcomes in a row, which would otherwise
    // look like one to an effect keyed on the state object.
    if (!state?.ok || state.at === lastToast.current) return;
    lastToast.current = state.at;
    toast.success("Logged");
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="performedOn">Date</Label>
        <Input
          id="performedOn"
          name="performedOn"
          type="date"
          max={today}
          defaultValue={date}
          required
          aria-describedby="performedOn-hint"
          // Load the day being pointed at instead of retargeting the save at it.
          // Without this the fields would still hold the previously-loaded day
          // and saving would copy them onto the newly-picked one.
          onChange={(e) => {
            const next = e.target.value;
            if (!next || next > today) return;
            startDayChange(() => router.replace(`/log?date=${next}`, { scroll: false }));
          }}
        />
        <p id="performedOn-hint" className="text-xs text-muted-foreground">
          {switchingDay ? "Loading that day…" : "Pick an earlier day to add to it."}
        </p>
      </div>

      {/* Everything below lands on the loaded day, so it's held back while a
          different one is on its way in. */}
      <div className={cn("space-y-5 transition-opacity", switchingDay && "opacity-50")}>
        <div className="space-y-2">
          <Label htmlFor="weightKg">Weight (kg)</Label>
          <Input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            min="1"
            inputMode="decimal"
            placeholder="e.g. 88.4"
            defaultValue={initial("weightKg")}
            onWheel={blurOnWheel}
          />
          <p className="text-xs text-muted-foreground">
            Optional, and the only number that decides the competition. Weigh in twice and the
            later reading replaces the earlier one — weights can&rsquo;t add up.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="steps">Steps</Label>
            <Input
              id="steps"
              name="steps"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="e.g. 9240"
              defaultValue={initial("steps")}
              onWheel={blurOnWheel}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workoutMin">Workout (minutes)</Label>
            <Input
              id="workoutMin"
              name="workoutMin"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="e.g. 45"
              defaultValue={initial("workoutMin")}
              onWheel={blurOnWheel}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Both add to the day&rsquo;s total — log a walk now and another tonight, and the day counts
          all of it.
        </p>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            name="notes"
            maxLength={200}
            placeholder="Optional"
            defaultValue={initial("notes")}
          />
        </div>
      </div>

      {/* Inline and next to the fields, as everywhere else in the app: a toast
          is gone in four seconds and takes the reason with it. */}
      {state?.ok === false && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        variant="volt"
        size="lg"
        className="w-full"
        disabled={pending || switchingDay}
      >
        {pending ? "Saving…" : hasEntry ? "Add to this day" : "Save entry"}
      </Button>
    </form>
  );
}
