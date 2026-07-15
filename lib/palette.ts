/**
 * Competitor colours live as CSS custom properties (see --series-N in
 * app/globals.css) rather than as hex in the database, because each slot needs a
 * different step in light and dark mode — one stored hex cannot do that.
 */

export const PALETTE_SLOTS = 4;

/** Slot for the nth account, 1-based and never cycled by rank. */
export function slotForIndex(index: number): number {
  return (index % PALETTE_SLOTS) + 1;
}

export function seriesColor(slot: number): string {
  return `var(--series-${slot})`;
}
