import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";

import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { needsSetup } from "@/lib/auth/dal";

export const metadata = { title: "Log in · Comp" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // proxy.ts can't see the database, so an empty install lands here first. Send
  // it on to the one-time setup.
  if (needsSetup()) redirect("/setup");

  const { next } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center">
      <Card className="w-full">
        <CardHeader className="space-y-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-volt text-volt-foreground">
            <Trophy className="size-5" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Log in to weigh in and check the standings.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <AuthForm
            action={login}
            submitLabel="Log in"
            pendingLabel="Logging in…"
            next={next?.startsWith("/") ? next : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
