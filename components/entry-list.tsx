"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, useTransition } from "react";
import { Footprints, Percent, Scale, Timer, Trash2 } from "lucide-react";
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
import {
  formatCount,
  formatDate,
  formatKg,
  formatMinutes,
  formatPct,
  formatRelativeDate,
} from "@/lib/format";

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

function DeleteButton({
  entry,
  onHide,
}: {
  entry: EntryRow;
  /** Hides/restores the row in the list: hide fires before the server is
   *  asked, so the exit plays immediately; restore is the failure path. */
  onHide: (hidden: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Delete entry for ${formatDate(entry.performedOn)}`}
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
                onHide(true);
                try {
                  await deleteEntry(entry.id);
                  toast.success("Entry deleted");
                } catch {
                  // The server kept the row, so the list must too.
                  onHide(false);
                  toast.error("Couldn't delete the entry — try again.");
                }
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

/** A day header, then that day's rows — the query arrives sorted by day, so
 *  grouping is one pass. The header carries the date; rows carry only names. */
type ListItem =
  | { kind: "day"; date: string }
  | { kind: "entry"; entry: EntryRow };

function toItems(entries: EntryRow[]): ListItem[] {
  const items: ListItem[] = [];
  let day: string | null = null;
  for (const entry of entries) {
    if (entry.performedOn !== day) {
      day = entry.performedOn;
      items.push({ kind: "day", date: day });
    }
    items.push({ kind: "entry", entry });
  }
  return items;
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
  // Rows removed optimistically: they leave the moment the delete is confirmed
  // in the dialog, not when the server round-trip lands. Ids linger here after
  // revalidation removes the row for real, which is harmless.
  const [hidden, setHidden] = useState<ReadonlySet<number>>(new Set());

  const setRowHidden = (id: number, hide: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (hide) next.add(id);
      else next.delete(id);
      return next;
    });

  const items = toItems(entries.filter((e) => !hidden.has(e.id)));

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nothing logged in this range yet.
        </CardContent>
      </Card>
    );
  }

  // Day headers and rows share one flat presence list so an emptied day takes
  // its header out with the same fold its last row used.
  const exit = reduceMotion
    ? undefined
    : { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.25 } };

  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {items.map((item, i) => {
          const shared = {
            layout: reduceMotion ? false : ("position" as const),
            initial: reduceMotion ? false : ({ opacity: 0, y: 10 } as const),
            animate: { opacity: 1, y: 0 },
            exit,
            className: "overflow-hidden",
            // Capped: the list can be a month long, and a stagger that keeps
            // accumulating would leave the last row arriving seconds late.
            transition: { ...EASE_OUT, delay: reduceMotion ? 0 : Math.min(i * 0.04, 0.4) },
          };

          if (item.kind === "day") {
            return (
              <motion.li key={`day-${item.date}`} {...shared}>
                {/* Extra air above every header except the one opening the
                    list, so days read as blocks rather than a stripe. */}
                <h2 className={`eyebrow text-muted-foreground ${i > 0 ? "pt-2" : ""}`}>
                  {formatRelativeDate(item.date, today)}
                </h2>
              </motion.li>
            );
          }

          const { entry } = item;
          return (
            <motion.li key={entry.id} {...shared}>
              <Card size="sm" className="transition-colors hover:bg-muted/40">
                <CardContent className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-9 w-1 shrink-0 rounded-full"
                    style={{ background: entry.color }}
                  />

                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="block truncate text-sm font-medium">{entry.userName}</span>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {entry.weightKg != null && (
                        <Metric icon={Scale}>{formatKg(entry.weightKg)}</Metric>
                      )}
                      {entry.bodyFatPct != null && (
                        <Metric icon={Percent}>{formatPct(entry.bodyFatPct)} fat</Metric>
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
                  {entry.userId === viewerId && (
                    <DeleteButton entry={entry} onHide={(hide) => setRowHidden(entry.id, hide)} />
                  )}
                </CardContent>
              </Card>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
