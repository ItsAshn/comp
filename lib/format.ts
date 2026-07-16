/** Display helpers. Pure and client-safe — no database imports. */

export function formatKg(kg: number, places = 1): string {
  return `${kg.toFixed(places)} kg`;
}

/** Signed to the reader's benefit: "−1.2 kg" reads as progress. */
export function formatKgDelta(kg: number, places = 1): string {
  if (Math.abs(kg) < 0.05) return `0 kg`;
  return `${kg > 0 ? "−" : "+"}${Math.abs(kg).toFixed(places)} kg`;
}

export function formatPct(pct: number, places = 1): string {
  return `${pct.toFixed(places)}%`;
}

/** Signed change in percentage points: "−2.4%" is body fat going down. */
export function formatPctDelta(pts: number, places = 1): string {
  if (Math.abs(pts) < 0.05) return "0%";
  return `${pts < 0 ? "−" : "+"}${Math.abs(pts).toFixed(places)}%`;
}

export function formatCount(n: number): string {
  return n.toLocaleString();
}

/** Minutes as hours and minutes: 75 → "1h 15m". */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/** "today" / "yesterday" / a date. Relative labels only where they're unambiguous. */
export function formatRelativeDate(iso: string, today: string): string {
  if (iso === today) return "Today";

  const yesterday = new Date(`${today}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(
    yesterday.getDate(),
  ).padStart(2, "0")}`;

  return iso === y ? "Yesterday" : formatDate(iso);
}

export function formatDays(days: number): string {
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}
