"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { changePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state) toast.success("Password changed");
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          placeholder="At least 8 characters"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Type it again"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}
