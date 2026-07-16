import { PageHeaderSkeleton } from "@/components/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeaderSkeleton description />
        <Skeleton className="h-9 w-56 rounded-full" />
      </div>

      <ul className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <Card size="sm">
              <CardContent className="flex items-center gap-3">
                <Skeleton className="h-9 w-1 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-56 max-w-full" />
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
