import { EntryList } from "@/components/entry-list";
import { RangeTabs } from "@/components/range-tabs";
import { requireViewer } from "@/lib/auth/dal";
import { getEntries } from "@/lib/db/queries";
import { isRange, toISODate, type Range } from "@/lib/ranges";

export const metadata = { title: "History · Comp" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const viewer = await requireViewer();
  const { range: raw } = await searchParams;
  const range: Range = isRange(raw) ? raw : "week";

  const entries = getEntries(range);

  return (
    // The log is a list, and a list doesn't get better at 1100px — it just gets
    // harder to track a row across. Held to a reading measure on desktop.
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">The record</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">History</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Every day either of you logged.</p>
        </div>
        <RangeTabs current={range} />
      </div>

      <EntryList entries={entries} viewerId={viewer.id} today={toISODate()} />
    </div>
  );
}
