"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SPRING } from "@/components/motion";
import { daysBetween } from "@/lib/ranges";
import type { Standing } from "@/lib/scoring";

/**
 * The race, drawn as percent of starting weight lost over time.
 *
 * Plotting raw kilograms would put a 95kg and a 68kg competitor on wildly
 * different parts of one axis (and tempt a second y-axis, which is never the
 * answer). Percent is the quantity the competition is actually scored on, so
 * both lines share one honest scale and the gap between them *is* the lead.
 */

/** The chart earns more vertical room once it isn't sharing a phone screen, but
 *  the type on it must not scale with the box — hence two fixed steps rather
 *  than an aspect ratio. */
const HEIGHT_COMPACT = 240;
const HEIGHT_ROOMY = 300;
const ROOMY_FROM = 560;

const PAD = { top: 16, right: 52, bottom: 28, left: 40 };

/** Width used for the server render, before the container is measured. */
const DEFAULT_W = 720;
const MIN_W = 260;

interface Point {
  x: number;
  y: number;
  pct: number;
  performedOn: string;
}

interface Series {
  userId: number;
  name: string;
  color: string;
  points: Point[];
}

/**
 * Draws at the container's true pixel width instead of scaling a fixed viewBox.
 * A scaled viewBox shrinks the type along with the geometry — at phone width an
 * 11px axis label would land nearer 5px and be unreadable.
 */
function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_W);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(MIN_W, Math.round(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/** Positive means weight lost, matching the axis: up the chart is winning.
 *  A gain reads as a negative percentage. */
function formatPct(pct: number): string {
  const rounded = Math.abs(pct) < 0.05 ? 0 : pct;
  return `${rounded.toFixed(1)}%`;
}

/** Round tick values spanning [min, max], always including zero. */
function ticksFor(min: number, max: number): number[] {
  const lo = Math.min(0, Math.floor(min));
  const hi = Math.max(0, Math.ceil(max));
  const span = Math.max(1, hi - lo);
  const step = span <= 4 ? 1 : span <= 10 ? 2 : Math.ceil(span / 5);

  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);
  if (!ticks.includes(hi)) ticks.push(hi);
  return ticks;
}

export function RaceChart({ standings }: { standings: Standing[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const [wrapRef, width] = useMeasuredWidth();
  const plotW = width - PAD.left - PAD.right;
  const height = width >= ROOMY_FROM ? HEIGHT_ROOMY : HEIGHT_COMPACT;
  const plotH = height - PAD.top - PAD.bottom;

  const model = useMemo(() => {
    const dated = standings
      .map((s) => ({ standing: s, weighIns: s.startWeightKg != null ? s.trend : [] }))
      .filter((d) => d.weighIns.length > 0);

    if (dated.length === 0) return null;

    const allDates = [...new Set(dated.flatMap((d) => d.weighIns.map((w) => w.performedOn)))].sort();
    const first = allDates[0];
    const last = allDates[allDates.length - 1];
    const spanDays = Math.max(1, daysBetween(first, last));

    const raw = dated.map(({ standing, weighIns }) => ({
      standing,
      pts: weighIns.map((w) => ({
        day: daysBetween(first, w.performedOn),
        // Against their own starting weight, which is what makes two
        // differently-sized competitors comparable at all.
        pct: ((standing.startWeightKg! - w.weightKg) / standing.startWeightKg!) * 100,
        performedOn: w.performedOn,
      })),
    }));

    const values = raw.flatMap((r) => r.pts.map((p) => p.pct));
    const ticks = ticksFor(Math.min(...values, 0), Math.max(...values, 0));
    const yMin = Math.min(...ticks);
    const yMax = Math.max(...ticks);
    const ySpan = yMax - yMin || 1;

    const toX = (day: number) => PAD.left + (day / spanDays) * plotW;
    // Percent lost grows downward on the scale but should climb on the chart —
    // "up" must mean "winning", so the y scale is inverted deliberately.
    const toY = (pct: number) => PAD.top + plotH - ((pct - yMin) / ySpan) * plotH;

    const series: Series[] = raw.map(({ standing, pts }) => ({
      userId: standing.userId,
      name: standing.name,
      color: standing.color,
      points: pts.map((p) => ({ ...p, x: toX(p.day), y: toY(p.pct) })),
    }));

    // One column per distinct date: the crosshair snaps to these, so the reader
    // aims at a day rather than at a 2px line.
    const columns = allDates.map((iso) => ({ performedOn: iso, x: toX(daysBetween(first, iso)) }));

    return { series, columns, ticks, toY, first, last };
  }, [standings, plotW, plotH]);

  const active = model && hover != null ? model.columns[hover] : null;

  return (
    <div className="space-y-3">
      {/* Always mounted, so the observer measures even before there's data. */}
      <div className="relative" ref={wrapRef}>
        {!model ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            The chart appears once someone logs a weigh-in.
          </p>
        ) : (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            // touch-pan-y, not touch-none: the chart is full-bleed on a phone,
            // so swallowing touch entirely would make a vertical swipe over it
            // dead and trap the page. Vertical scrolling passes through; the
            // crosshair still tracks a horizontal drag.
            className="max-w-full touch-pan-y select-none"
            role="img"
            aria-label="Percent of starting weight lost over time, per competitor"
            tabIndex={0}
            onPointerLeave={() => setHover(null)}
            onBlur={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              const step = e.key === "ArrowRight" ? 1 : -1;
              setHover((h) => {
                const next = (h ?? 0) + step;
                return Math.max(0, Math.min(model.columns.length - 1, next));
              });
            }}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              let best = 0;
              for (let i = 1; i < model.columns.length; i++) {
                const d = Math.abs(model.columns[i].x - x);
                if (d < Math.abs(model.columns[best].x - x)) best = i;
              }
              setHover(best);
            }}
          >
            {model.ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + plotW}
                  y1={model.toY(t)}
                  y2={model.toY(t)}
                  className="stroke-border"
                  strokeWidth={1}
                  // Zero is the start of the race, not just another gridline —
                  // everything above it is progress.
                  strokeOpacity={t === 0 ? 1 : 0.5}
                />
                <text
                  x={PAD.left - 8}
                  y={model.toY(t)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[11px] tabular-nums"
                >
                  {t === 0 ? "0" : `${t}%`}
                </text>
              </g>
            ))}

            <text x={PAD.left} y={height - 8} className="fill-muted-foreground text-[11px]">
              {formatDay(model.first)}
            </text>
            {model.last !== model.first && (
              <text
                x={PAD.left + plotW}
                y={height - 8}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {formatDay(model.last)}
              </text>
            )}

            {active && (
              <line
                x1={active.x}
                x2={active.x}
                y1={PAD.top}
                y2={PAD.top + plotH}
                className="stroke-muted-foreground"
                strokeWidth={1}
              />
            )}

            {model.series.map((s) => {
              const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
              const end = s.points[s.points.length - 1];

              return (
                <g key={s.userId}>
                  {/* The race runs itself: both lines draw left to right at the
                      same rate, so the gap between them opens exactly as it did
                      in life. `initial` only fires on mount, so a resize redraws
                      instantly rather than replaying the whole race. */}
                  {s.points.length > 1 && (
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={reduceMotion ? false : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                    />
                  )}
                  {/* 2px surface ring keeps the end dot legible where the two
                      lines cross or sit on top of each other. Lands as its line
                      arrives. */}
                  <motion.circle
                    cx={end.x}
                    cy={end.y}
                    r={4}
                    fill={s.color}
                    className="stroke-card"
                    strokeWidth={2}
                    initial={reduceMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{ transformOrigin: `${end.x}px ${end.y}px` }}
                    transition={{ ...SPRING, delay: reduceMotion ? 0 : 1 }}
                  />
                  <motion.text
                    x={end.x + 9}
                    y={end.y}
                    dominantBaseline="middle"
                    className="fill-foreground text-[11px] font-medium tabular-nums"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: reduceMotion ? 0 : 1.1 }}
                  >
                    {formatPct(end.pct)}
                  </motion.text>
                </g>
              );
            })}

            {active &&
              model.series.map((s) => {
                const pt = s.points.find((p) => p.performedOn === active.performedOn);
                if (!pt) return null;
                return (
                  <circle
                    key={s.userId}
                    cx={pt.x}
                    cy={pt.y}
                    r={4}
                    fill={s.color}
                    className="stroke-card"
                    strokeWidth={2}
                  />
                );
              })}
          </svg>
        )}

        {model && active && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 rounded-md border bg-popover p-2 text-popover-foreground shadow-md"
            // Clamped so the readout can't hang off either edge on a phone.
            style={{ left: Math.min(Math.max(active.x, 76), width - 76) }}
          >
            <p className="mb-1.5 text-[11px] text-muted-foreground">
              {formatDay(active.performedOn)}
            </p>
            <ul className="space-y-1">
              {model.series.map((s) => {
                const pt = s.points.find((p) => p.performedOn === active.performedOn);
                return (
                  <li key={s.userId} className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden
                      className="h-0.5 w-3 shrink-0 rounded-full"
                      style={{ background: s.color }}
                    />
                    {/* Value leads, name follows: the reader already knows who
                        they're looking at and wants the number. */}
                    <span className="font-semibold tabular-nums">
                      {pt ? formatPct(pt.pct) : "—"}
                    </span>
                    <span className="truncate text-muted-foreground">{s.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {model && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {model.series.map((s) => (
              <span
                key={s.userId}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span
                  aria-hidden
                  className="h-0.5 w-4 rounded-full"
                  style={{ background: s.color }}
                />
                {s.name}
              </span>
            ))}
          </div>

          {/* Every value the tooltip shows, reachable without a pointer. */}
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              View as table
            </summary>
            <div className="mt-2 max-h-72 overflow-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Percent of starting weight lost by date</caption>
                <thead className="text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-1 pr-3 font-medium">
                      Date
                    </th>
                    {model.series.map((s) => (
                      <th key={s.userId} scope="col" className="py-1 pr-3 font-medium">
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {model.columns.map((col) => (
                    <tr key={col.performedOn} className="border-t">
                      <th scope="row" className="py-1 pr-3 font-normal text-muted-foreground">
                        {formatDay(col.performedOn)}
                      </th>
                      {model.series.map((s) => {
                        const pt = s.points.find((p) => p.performedOn === col.performedOn);
                        return (
                          <td key={s.userId} className="py-1 pr-3">
                            {pt ? formatPct(pt.pct) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
