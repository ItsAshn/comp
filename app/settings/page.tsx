import { ChangePasswordForm } from "@/components/change-password-form";
import { GoalForm } from "@/components/goal-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/dal";

export const metadata = { title: "Settings · Comp" };

export default async function SettingsPage() {
  const viewer = await requireViewer();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <p className="eyebrow text-muted-foreground">Your account</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Signed in as {viewer.name}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your goal</CardTitle>
          <CardDescription>Somewhere to aim, separate from the competition.</CardDescription>
        </CardHeader>
        <CardContent>
          <GoalForm goalWeightKg={viewer.goalWeightKg} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>
            Replace the password you were given. Other devices will be signed out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
