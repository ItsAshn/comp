import { MeterBar, Stagger } from "@/components/motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCount, formatMinutes } from "@/lib/format";
import type { Standing } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface Board {
  key: string;
  label: string;
  /** Rendered value; the bar only carries the comparison. */
  format: (s: Standing) => string;
  value: (s: Standing) => number;
}

/**
 * The work behind the weight loss. These don't decide the competition — only
 * percent lost does — but they're what the two of you will argue about.
 */
const BOARDS: Board[] = [
  {
    key: "steps",
    label: "Total steps",
    value: (s) => s.totalSteps,
    format: (s) => formatCount(s.totalSteps),
  },
  {
    key: "training",
    label: "Time trained",
    value: (s) => s.totalWorkoutMin,
    format: (s) => formatMinutes(s.totalWorkoutMin),
  },
  {
    key: "distance",
    label: "Distance walked",
    value: (s) => s.stepsKm,
    format: (s) => `${s.stepsKm.toFixed(1)} km`,
  },
  {
    key: "consistency",
    label: "Days logged",
    value: (s) => s.daysLogged,
    format: (s) => `${s.daysLogged}`,
  },
];

function Row({
  standing,
  board,
  max,
  leading,
  delay,
}: {
  standing: Standing;
  board: Board;
  max: number;
  leading: boolean;
  /** Staggers this row's bar against the one above it. */
  delay: number;
}) {
  const value = board.value(standing);
  // Share of the leader's bar, so the two are compared against each other
  // rather than against an arbitrary axis.
  const width = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: standing.color }}
          />
          <span className="truncate text-muted-foreground">{standing.name}</span>
        </span>
        <span
          className={cn(
            "shrink-0 tabular-nums",
            leading ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
          )}
        >
          {board.format(standing)}
        </span>
      </div>
      <MeterBar
        pct={width}
        color={standing.color}
        track="var(--muted)"
        delay={delay}
        label={`${standing.name}: ${board.format(standing)} ${board.label.toLowerCase()}`}
      />
    </div>
  );
}

export function VersusBars({
  standings,
  className,
  from = 0,
}: {
  standings: Standing[];
  /** The dashboard places these boards inside its own grid, so the layout is
   *  the caller's to decide rather than baked in here. */
  className?: string;
  /** Where these boards fall in the page's reveal sequence — the caller's to
   *  decide, for the same reason the layout is. */
  from?: number;
}) {
  return (
    <Stagger className={cn("grid gap-4 sm:grid-cols-2", className)} from={from}>
      {BOARDS.map((board) => {
        const max = Math.max(...standings.map(board.value), 0);
        // Who is winning this board — used only to weight the type, never to
        // recolour anyone: a competitor keeps their own colour throughout.
        const top = standings.reduce((a, b) => (board.value(b) > board.value(a) ? b : a));

        return (
          <Card key={board.key} size="sm" className="h-full">
            <CardHeader>
              <CardTitle className="eyebrow text-muted-foreground">{board.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {standings.map((s, i) => (
                <Row
                  key={s.userId}
                  standing={s}
                  board={board}
                  max={max}
                  leading={max > 0 && s.userId === top.userId}
                  delay={i * 0.08}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </Stagger>
  );
}
