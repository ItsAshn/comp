import { PageHeaderSkeleton } from "@/components/page-skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <PageHeaderSkeleton />

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-full max-w-80" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-8 w-full" />
          </div>
          {/* The two field pairs, then notes — the form's real rhythm. */}
          {[0, 1].map((i) => (
            <div key={i} className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ))}
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
