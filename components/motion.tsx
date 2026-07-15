"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";
import type { ReactNode } from "react";

/**
 * The house motion vocabulary. Everything on screen borrows from here rather
 * than inventing its own curve, so the page assembles as one movement instead of
 * a dozen competing ones.
 *
 * Every component here answers `prefers-reduced-motion` by rendering the
 * finished state directly — not by playing a shorter animation. Someone who has
 * asked the OS for less motion is telling us that movement makes them ill, and
 * the honest response is none of it.
 */

/** Decelerating, no overshoot. Content arriving should look inevitable. */
export const EASE_OUT: Transition = { duration: 0.42, ease: [0.22, 1, 0.36, 1] };

/** A little overshoot, for things that should feel physical when they land. */
export const SPRING: Transition = { type: "spring", stiffness: 380, damping: 30 };

/** Gap between siblings in a staggered group. Long enough to read as a sequence,
 *  short enough that the last one isn't still arriving after half a second. */
const STEP = 0.06;

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Seconds. Prefer `Stagger` over hand-tuning this. */
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...EASE_OUT, delay: reduce ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Reveals children in sequence. The delay is derived from position, so adding a
 * card doesn't mean re-numbering every delay after it.
 */
export function Stagger({
  children,
  className,
  from = 0,
}: {
  children: ReactNode[];
  className?: string;
  /** Start the sequence partway in, when a group follows another group. */
  from?: number;
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <Reveal key={i} delay={from + i * STEP}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}

/**
 * A bar that grows to its value. Used by every meter in the app — the goal
 * meter and the versus boards — so a bar means the same motion wherever it is.
 *
 * The track and fill are passed as CSS colours rather than classes because they
 * are the competitor's, resolved from --series-N at render time.
 */
export function MeterBar({
  pct,
  color,
  track,
  delay = 0,
  label,
}: {
  /** 0-100. Clamped, and floored to a sliver so an empty bar still reads as a bar. */
  pct: number;
  color: string;
  track: string;
  delay?: number;
  label: string;
}) {
  const reduce = useReducedMotion();
  const width = `${Math.min(100, Math.max(2, pct))}%`;

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full"
      style={{ background: track }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : delay }}
      />
    </div>
  );
}
