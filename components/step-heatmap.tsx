import { formatCount, formatDate } from "@/lib/format";
import { GOAL_STEPS, type Standing, type StepDay } from "@/lib/scoring";
import { cn } from "@/lib/utils";

/**
 * Four weeks of steps as a small calendar, sized and placed as the footnote it
 * is: it lives inside its competitor's own card, under their step figures.
 *
 * It had a card of its own once, full width, and that was the wrong shape twice
 * over — a grid this small marooned in a wide box is mostly empty box, and a
 * fourth card on the page argues for attention the question doesn't deserve.
 * Percent lost decides the competition; the figures above say how far you
 * walked. This only answers *when*, so it sits where that question comes up
 * rather than interrupting the page to ask it.
 *
 * Deliberately server-rendered: the cells carry native titles, the summary above
 * carries the count, and the sr-only line carries the dates, so there's nothing
 * here worth shipping JavaScript for.
 */

/**
 * A day is filled in the competitor's colour or it is blank — no ramp between.
 *
 * A shaded ramp is the obvious form for a heatmap and the wrong one here: it
 * spends the whole grid re-encoding "how much", which the figures directly above
 * it already say, and it needs a scale shared across both competitors, which
 * makes every square's meaning depend on the busiest day either of them ever
 * had. A threshold asks one question with one answer — did you hit ten thousand
 * — so a square means the same thing today, next month, and on the other card.
 */
function isHit(day: StepDay): boolean {
  return day.steps != null && day.steps >= GOAL_STEPS;
}

function cellTitle(day: StepDay): string {
  const when = formatDate(day.performedOn);
  if (day.pending) return `${when} — still to come`;
  if (day.steps == null) return `${when} — no steps logged`;
  return `${when} — ${formatCount(day.steps)} steps`;
}

export function StepHeatmap({
  standing,
  className,
}: {
  standing: Standing;
  className?: string;
}) {
  const days = standing.stepTrail;
  const hits = days.filter(isHit);

  return (
    // Capped rather than stretched, and capped as a block: left to fill the card
    // the squares would grow into a chunky calendar and take back exactly the
    // prominence this is meant to give up. The label and count share the cap so
    // the tally sits over the grid it counts instead of drifting to the far edge
    // of the card.
    <div className={cn("w-full max-w-38 space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="eyebrow text-muted-foreground">Over {formatCount(GOAL_STEPS)}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {hits.length}/{days.filter((d) => !d.pending).length}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1" aria-hidden>
        {/* Weekday letters read off the first row's real dates rather than a
            hardcoded list, so the header can't drift out of step with the grid
            it labels. */}
        {days.slice(0, 7).map((day) => (
          <span
            key={day.performedOn}
            className="text-center text-[9px] leading-none text-muted-foreground"
          >
            {new Date(`${day.performedOn}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "narrow",
            })}
          </span>
        ))}

        {days.map((day) => (
          <span
            key={day.performedOn}
            title={cellTitle(day)}
            className={cn(
              "aspect-square rounded-[2px]",
              // A day that hasn't arrived keeps its slot so the weekday columns
              // stay aligned, but carries no outline: an empty Saturday
              // shouldn't read as a missed one just because it's Thursday.
              !day.pending && "ring-1 ring-border ring-inset",
            )}
            style={{ background: isHit(day) ? standing.color : undefined }}
          />
        ))}
      </div>

      {/* The grid's actual content, for anyone not looking at it: which days,
          not just how many. The squares above are aria-hidden in favour of this
          — 28 titled spans read aloud one by one would be a maze. */}
      <p className="sr-only">
        {hits.length === 0
          ? `No days over ${formatCount(GOAL_STEPS)} steps in the last four weeks.`
          : `${hits.length} days over ${formatCount(GOAL_STEPS)} steps in the last four weeks: ${hits
              .map((d) => formatDate(d.performedOn))
              .join(", ")}.`}
      </p>
    </div>
  );
}
