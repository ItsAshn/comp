"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { createUser } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, null);
  const wasPending = useRef(false);

  useEffect(() => {
    // A settled action with no error means the account was created. React
    // clears the fields itself once the action resolves, so there's no reset to
    // do here — which also means the password doesn't linger on screen.
    if (wasPending.current && !pending && !state) toast.success("Account created");
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-name">Name</Label>
        <Input
          id="new-name"
          name="name"
          required
          placeholder="Their name"
          autoComplete="off"
          defaultValue={state?.name ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">Password</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          required
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          Pick one now and pass it on — they can&rsquo;t reset it themselves.
        </p>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
