"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTransition } from "react";
import { Footprints, Scale, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteEntry } from "@/app/actions/entries";
import { EASE_OUT } from "@/components/motion";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EntryRow } from "@/lib/db/queries";
import { formatCount, formatKg, formatMinutes, formatRelativeDate } from "@/lib/format";

function Metric({
  icon: Icon,
  children,
}: {
  icon: typeof Scale;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium tabular-nums">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {children}
    </span>
  );
}

function DeleteButton({ entry }: { entry: EntryRow }) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Delete entry for ${formatRelativeDate(entry.performedOn, entry.performedOn)}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            Removing a weigh-in changes the standings — if it&rsquo;s your first one, the next
            oldest becomes your starting weight.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteEntry(entry.id);
                toast.success("Entry deleted");
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

export function EntryList({
  entries,
  viewerId,
  today,
}: {
  entries: EntryRow[];
  viewerId: number;
  today: string;
}) {
  const reduceMotion = useReducedMotion();

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nothing logged in this range yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry, i) => (
        <motion.li
          key={entry.id}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          // Capped: the list can be a month long, and a stagger that keeps
          // accumulating would leave the last row arriving seconds late.
          transition={{ ...EASE_OUT, delay: reduceMotion ? 0 : Math.min(i * 0.04, 0.4) }}
        >
          <Card size="sm" className="transition-colors hover:bg-muted/40">
            <CardContent className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-9 w-1 shrink-0 rounded-full"
                style={{ background: entry.color }}
              />

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-medium">{entry.userName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeDate(entry.performedOn, today)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {entry.weightKg != null && (
                    <Metric icon={Scale}>{formatKg(entry.weightKg)}</Metric>
                  )}
                  {entry.steps != null && (
                    <Metric icon={Footprints}>{formatCount(entry.steps)}</Metric>
                  )}
                  {entry.workoutMin != null && (
                    <Metric icon={Timer}>{formatMinutes(entry.workoutMin)}</Metric>
                  )}
                </div>

                {entry.notes && (
                  <p className="truncate text-xs text-muted-foreground">{entry.notes}</p>
                )}
              </div>

              {/* Only your own days are yours to delete; the action re-checks. */}
              {entry.userId === viewerId && <DeleteButton entry={entry} />}
            </CardContent>
          </Card>
        </motion.li>
      ))}
    </ul>
  );
}
