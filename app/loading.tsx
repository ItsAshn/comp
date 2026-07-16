import { PageHeaderSkeleton } from "@/components/page-skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** The dashboard's shape, before the dashboard: header row, hero + chart pair,
 *  competitor cards, versus boards — same grid, same spans. */
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="h-full lg:col-span-5">
          <CardContent className="flex h-full flex-col justify-between gap-6 py-2">
            <Skeleton className="h-[11px] w-20" />
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-14 w-56 max-w-full md:h-16" />
              <Skeleton className="mt-2 h-5 w-44" />
            </div>
            <Skeleton className="h-5 w-full max-w-72" />
          </CardContent>
        </Card>

        <Card className="h-full lg:col-span-7">
          <CardHeader>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-full max-w-96" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-60 w-full" />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-6 lg:content-start">
          {[0, 1].map((i) => (
            <Card key={i} className="h-full">
              <CardContent className="flex h-full flex-col gap-5">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="size-7 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                  {Array.from({ length: 4 }, (_, j) => (
                    <div key={j} className="space-y-1.5">
                      <Skeleton className="h-[11px] w-16" />
                      <Skeleton className="h-[18px] w-20" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-6 lg:content-start">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} size="sm" className="h-full">
              <CardHeader>
                <Skeleton className="h-[11px] w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[0, 1].map((j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3.5 w-12" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
