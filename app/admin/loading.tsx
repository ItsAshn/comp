import { FormCardSkeleton, PageHeaderSkeleton } from "@/components/page-skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <PageHeaderSkeleton description />

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>

      <FormCardSkeleton rows={2} />
    </div>
  );
}
