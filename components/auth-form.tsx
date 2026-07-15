"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/app/actions/auth";

interface AuthFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel: string;
  /** Setup asks for confirmation; login doesn't. */
  withConfirm?: boolean;
  /** Path to return to after a successful login. */
  next?: string;
}

export function AuthForm({ action, submitLabel, pendingLabel, withConfirm, next }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="username"
          autoFocus
          required
          placeholder="Your name"
          // React resets the form once the action settles, so a rejected
          // attempt would otherwise clear this too. Passwords are meant to go.
          defaultValue={state?.name ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={withConfirm ? "new-password" : "current-password"}
          required
          placeholder="At least 8 characters"
        />
      </div>

      {withConfirm && (
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Type it again"
          />
        </div>
      )}

      {state?.error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
