"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Ticks between values when the underlying number changes (e.g. switching
 * range). Renders the true value on first paint rather than counting up from
 * zero on every load.
 *
 * Formatting is described with props rather than a `format` callback: a
 * function can't cross the server/client boundary, and every figure this wraps
 * lives in a server component. The shape mirrors `formatPct` in lib/format.ts —
 * fixed decimals, optional units either side.
 */
export function AnimatedNumber({
  value,
  places = 0,
  prefix = "",
  suffix = "",
  countOnMount = false,
}: {
  value: number;
  /** Decimal places, held constant so the figure can't change width mid-roll. */
  places?: number;
  prefix?: string;
  suffix?: string;
  /**
   * Count up from zero on arrival as well as on change. Off by default: a
   * number that rolls every time you glance at the page is noise. Reserved for
   * the one hero figure a view is actually about, where the roll is what makes
   * the scoreboard feel alive.
   *
   * The server still renders the true value, so this only ever costs a moment
   * of movement after hydration — never a blank or a zero in the HTML.
   */
  countOnMount?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const previous = useRef(value);
  const [display, setDisplay] = useState(value);
  const mounted = useRef(false);

  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;

    const from = first ? (countOnMount ? 0 : value) : previous.current;
    previous.current = value;
    if (reduceMotion || from === value) return;

    const controls = animate(from, value, {
      // The mount roll is longer: it's the page introducing itself, and it has
      // further to travel than a range switch.
      duration: first ? 1.1 : 0.7,
      ease: "easeOut",
      onUpdate: setDisplay,
    });
    return () => controls.stop();
  }, [value, reduceMotion, countOnMount]);

  const shown = reduceMotion ? value : display;

  return (
    <span className="tabular-nums">
      {prefix}
      {shown.toFixed(places)}
      {suffix}
    </span>
  );
}
