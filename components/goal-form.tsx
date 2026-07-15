"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { updateGoal } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GoalForm({ goalWeightKg }: { goalWeightKg: number | null }) {
  const [state, formAction, pending] = useActionState(updateGoal, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state) toast.success("Goal saved");
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="goalWeightKg">Goal weight (kg)</Label>
        <Input
          id="goalWeightKg"
          name="goalWeightKg"
          type="number"
          step="0.1"
          min="1"
          inputMode="decimal"
          placeholder="Leave blank for no goal"
          defaultValue={goalWeightKg ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Only used for your progress meter and estimate. It has no bearing on who&rsquo;s
          winning — that&rsquo;s always percent of starting weight lost.
        </p>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save goal"}
      </Button>
    </form>
  );
}
