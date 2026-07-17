import { Flame } from "lucide-react";

import { MeterBar } from "@/components/motion";
import { StepHeatmap } from "@/components/step-heatmap";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatCount,
  formatDays,
  formatKg,
  formatKgDelta,
  formatMinutes,
  formatPct,
  formatPctDelta,
} from "@/lib/format";
import type { Standing } from "@/lib/scoring";
import { cn } from "@/lib/utils";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="stat-figure text-lg leading-none">{value}</p>
      {hint && <p className="text-xs leading-tight text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Track is a wash of the competitor's own colour, so the meter reads as theirs
 *  whether it's 5% or 95% full. */
function GoalMeter({ standing }: { standing: Standing }) {
  if (standing.goalProgressPct == null || standing.goalWeightKg == null) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow text-muted-foreground">Goal {formatKg(standing.goalWeightKg)}</span>
        <span className="text-xs font-semibold tabular-nums">
          {formatPct(standing.goalProgressPct, 0)}
        </span>
      </div>
      {/* Track is a wash of the fill's own hue rather than a neutral grey, so
          the meter reads as this competitor's across its whole length. 14%: fill
          and track share a hue, so the track is the only thing the fill has to
          separate from, and every extra percent of wash spends contrast the bar
          can't afford. See --series-N in globals.css. */}
      <MeterBar
        pct={standing.goalProgressPct}
        color={standing.color}
        track={`color-mix(in oklab, ${standing.color} 14%, transparent)`}
        label={`${standing.name} progress to goal weight`}
      />
      {standing.daysToGoal != null && (
        <p className="text-xs text-muted-foreground">
          ~{formatDays(standing.daysToGoal)} away at this rate
        </p>
      )}
    </div>
  );
}

export function CompetitorCard({
  standing,
  rank,
  isViewer,
}: {
  standing: Standing;
  rank: number;
  isViewer: boolean;
}) {
  const smoothed = standing.trend.at(-1)?.averageKg ?? null;
  const ranked = standing.weighIns > 0;
  const leading = ranked && rank === 1;

  return (
    <Card className="relative h-full overflow-hidden">
      {/* Their colour along the top edge — the same device the hero uses, so a
          card is identifiable as a person's before any text is read. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: standing.color }}
      />

      <CardContent className="flex h-full flex-col gap-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ background: standing.color }}
            />
            <span className="truncate font-semibold tracking-tight">{standing.name}</span>
            {isViewer && (
              <Badge variant="secondary" className="shrink-0">
                You
              </Badge>
            )}
          </div>

          {/* Black/white, not volt. This marks a POSITION, and volt is also
              competitor one's colour — a green "1" would read as "the green
              competitor" and quietly claim the lead for them whoever is
              actually ahead. Chrome is the neutral here for a reason. */}
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
              leading ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
            aria-label={ranked ? `Rank ${rank}` : "Unranked"}
          >
            {ranked ? rank : "—"}
          </span>
        </div>

        {standing.weighIns === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {standing.daysLogged > 0
              ? "No weigh-ins yet — the activity below counts, but the race needs a starting weight."
              : "No weigh-ins yet. The first one sets the starting weight everything else is measured against."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              <Stat
                label="Now"
                value={formatKg(standing.currentWeightKg!)}
                hint={smoothed != null ? `${formatKg(smoothed)} 7-day avg` : undefined}
              />
              <Stat
                label="Lost"
                value={formatPct(standing.pctLost, 2)}
                hint={`${formatKgDelta(standing.kgLost)} from ${formatKg(standing.startWeightKg!)}`}
              />
              {/* Both paces read "—" rather than "0/wk" until there are two
                  weigh-ins to draw a line between. A zero would be a claim we
                  haven't measured: it says you held steady, when the truth is
                  nobody has weighed you twice. */}
              <Stat
                label="Pace"
                value={
                  standing.kgPerWeek == null ? "—" : `${formatKgDelta(standing.kgPerWeek, 2)}/wk`
                }
                hint={standing.kgPerWeek == null ? "Needs a second weigh-in" : "Since the first weigh-in"}
              />
              <Stat
                label="Last 14 days"
                value={
                  standing.recentKgPerWeek == null
                    ? "—"
                    : `${formatKgDelta(standing.recentKgPerWeek, 2)}/wk`
                }
                hint={
                  standing.recentKgPerWeek == null
                    ? "Needs two weigh-ins this fortnight"
                    : "Current momentum"
                }
              />
              {/* Only once someone has measured it — an empty stat would nag
                  the competitor who doesn't own calipers. Informational only;
                  the score never looks at it. */}
              {standing.currentBodyFatPct != null && (
                <Stat
                  label="Body fat"
                  value={formatPct(standing.currentBodyFatPct)}
                  hint={
                    standing.bodyFatDeltaPct != null
                      ? `${formatPctDelta(standing.bodyFatDeltaPct)} since first reading`
                      : "First reading"
                  }
                />
              )}
            </div>

            <GoalMeter standing={standing} />
          </>
        )}

        {/* Outside the weigh-in gate on purpose: a steps-only week is still a
            week of work, and hiding it would read as "log weight or nothing". */}
        {standing.daysLogged > 0 && (
          <div className="mt-auto space-y-4 border-t pt-4">
            <div className="grid grid-cols-3 gap-4">
              {/* The trailing week, divided by seven whether or not a day was
                  logged — so a week off reads as one. The all-time total is a
                  versus board's job, not this card's. */}
              <Stat
                label="Steps/day"
                value={formatCount(standing.avgSteps7d)}
                hint="Last 7 days"
              />
              <Stat
                label="Training"
                value={formatMinutes(standing.totalWorkoutMin)}
                hint={`${formatMinutes(standing.avgWorkoutMin)} a session`}
              />
              <div className="space-y-1">
                <p className="eyebrow text-muted-foreground">Streak</p>
                <p className="stat-figure flex items-center gap-1 text-lg leading-none">
                  {/* Volt-ink, not volt: this is a glyph that has to be read on
                      the card surface (7.27:1), where the fill would vanish. */}
                  {standing.streak > 0 && (
                    <Flame className="size-4 shrink-0 text-volt-ink" aria-hidden />
                  )}
                  {standing.streak}d
                </p>
                <p className="text-xs leading-tight text-muted-foreground">
                  {standing.daysLogged} days logged
                </p>
              </div>
            </div>

            <StepHeatmap standing={standing} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
