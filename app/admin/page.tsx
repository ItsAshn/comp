import { AccountList } from "@/components/account-list";
import { CreateUserForm } from "@/components/create-user-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/dal";
import { listAccounts } from "@/lib/db/queries";

export const metadata = { title: "Accounts · Comp" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const accounts = listAccounts();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <p className="eyebrow text-muted-foreground">Admin</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">Accounts</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          You&rsquo;re the admin, so adding competitors is down to you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competitors</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountList accounts={accounts} adminId={admin.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a competitor</CardTitle>
          <CardDescription>
            {accounts.length < 2
              ? "Create your opponent's account to start the race."
              : "This app is built as a duel — a third account will be ranked, but the head-to-head reads best with two."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>
    </div>
  );
}
