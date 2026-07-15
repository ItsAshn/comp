import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";

import { setupAdmin } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { needsSetup } from "@/lib/auth/dal";

export const metadata = { title: "Set up · Comp" };

export default async function SetupPage() {
  // The bootstrap is a one-time door. Once an account exists this route is
  // meaningless, and leaving it open would let anyone mint a second admin.
  if (!needsSetup()) redirect("/login");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center">
      <Card className="w-full">
        <CardHeader className="space-y-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-volt text-volt-foreground">
            <Trophy className="size-5" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <CardTitle>Start the competition</CardTitle>
            <CardDescription>
              You&rsquo;re the first one here, so this account becomes the admin. You&rsquo;ll create
              your opponent&rsquo;s account next.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <AuthForm
            action={setupAdmin}
            submitLabel="Create admin account"
            pendingLabel="Creating…"
            withConfirm
          />
        </CardContent>
      </Card>
    </div>
  );
}
