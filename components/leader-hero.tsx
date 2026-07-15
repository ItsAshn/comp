import { Crown, Minus } from "lucide-react";

import { AnimatedNumber } from "@/components/animated-number";
import { Card, CardContent } from "@/components/ui/card";
import { formatKgDelta, formatPct } from "@/lib/format";
import type { Scoreboard } from "@/lib/scoring";

/**
 * The one thing the dashboard is for: who is winning. This carries the view's
 * single hero figure — every other number on the page stays smaller than this
 * one on purpose.
 */
export function LeaderHero({ board }: { board: Scoreboard }) {
  const { leader, margin, tied, standings } = board;

  if (!leader) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Crown className="size-5" aria-hidden />
          </span>
          <p className="mt-4 font-semibold tracking-tight">The competition hasn&rsquo;t started</p>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            Both competitors need a weigh-in before there&rsquo;s a leader. The first one becomes
            the baseline everything is measured from.
          </p>
        </CardContent>
      </Card>
    );
  }

  const runnerUp = standings.find((s) => s.userId !== leader.userId);

  return (
    <Card
      className="relative h-full overflow-hidden"
      // A wash of the leader's own colour, so the card belongs to whoever is
      // winning and visibly changes hands when the lead does.
      style={{
        background: `linear-gradient(160deg, color-mix(in oklab, ${leader.color} 14%, var(--card)) 0%, var(--card) 62%)`,
      }}
    >
      {/* Their colour as a full-bleed rule across the top edge. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: leader.color }}
      />

      <CardContent className="flex h-full flex-col justify-between gap-6 py-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          {tied ? (
            <Minus className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <Crown className="size-3.5 shrink-0" aria-hidden />
          )}
          <span className="eyebrow">{tied ? "Dead heat" : "In the lead"}</span>
        </div>

        <div>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ background: leader.color }}
            />
            <span className="truncate text-lg font-semibold tracking-tight">
              {tied ? "All square" : leader.name}
            </span>
          </div>

          {/* The hero figure: percent of starting weight lost. Everything else
              on the page is deliberately smaller than this — and it's the one
              number in the app that rolls up on arrival, for the same reason
              it's the biggest. */}
          {/* Grows with the card. On lg this sits beside the race chart and
              stretches to its height, so a 7xl figure leaves a hole above and
              below it — the hero should fill the space it was given, not float
              in the middle of it. */}
          <p className="stat-figure mt-2 text-6xl leading-none md:text-7xl lg:text-8xl">
            <AnimatedNumber value={leader.pctLost} places={2} suffix="%" countOnMount />
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatKgDelta(leader.kgLost)} of starting weight
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          {tied ? (
            "Both competitors have shed the same share of their starting weight."
          ) : runnerUp && runnerUp.weighIns > 0 ? (
            <>
              Ahead of {runnerUp.name} by{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatPct(margin, 2)}
              </span>{" "}
              of starting weight.
            </>
          ) : (
            "Waiting for an opponent to weigh in."
          )}
        </p>
      </CardContent>
    </Card>
  );
}
