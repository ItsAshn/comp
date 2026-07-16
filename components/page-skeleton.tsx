import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The loading mirrors of the blocks every page opens with. Each route's
 * loading.tsx composes these inside the same container classes as the real
 * page, so the content swaps in place instead of reflowing the column.
 *
 * Dimensions track the real type: the eyebrow is 11px, the h1 is text-2xl
 * (2rem line) stepping to text-3xl on md. Widths are guesses on purpose —
 * they only have to look like a header, not measure one.
 */
export function PageHeaderSkeleton({ description = false }: { description?: boolean }) {
  return (
    <div>
      <Skeleton className="h-[11px] w-24" />
      <Skeleton className="mt-1.5 h-8 w-40 md:h-9" />
      {description && <Skeleton className="mt-1.5 h-5 w-64 max-w-full" />}
    </div>
  );
}

/** A settings-style card: title, description, then labelled form rows and a
 *  submit. Close enough for every single-column form page. */
export function FormCardSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-full max-w-72" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}
