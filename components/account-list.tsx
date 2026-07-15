"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteUser } from "@/app/actions/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Account } from "@/lib/db/queries";

function RemoveAccount({ account }: { account: Account }) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${account.name}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {account.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This also deletes their {account.entryCount}{" "}
            {account.entryCount === 1 ? "entry" : "entries"} and removes them from the
            competition. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteUser(account.id);
                toast.success(`${account.name} removed`);
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AccountList({ accounts, adminId }: { accounts: Account[]; adminId: number }) {
  return (
    <ul className="divide-y">
      {accounts.map((account) => (
        <li key={account.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full"
            style={{ background: account.color }}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{account.name}</span>
              {account.isAdmin && <Badge variant="secondary">Admin</Badge>}
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {account.entryCount} {account.entryCount === 1 ? "entry" : "entries"}
            </p>
          </div>

          {/* The admin can't delete themselves — that would strand the app with
              no way to create accounts. */}
          {account.id !== adminId && <RemoveAccount account={account} />}
        </li>
      ))}
    </ul>
  );
}
