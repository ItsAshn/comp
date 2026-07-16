import { FormCardSkeleton, PageHeaderSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <PageHeaderSkeleton description />
      <FormCardSkeleton rows={1} />
      <FormCardSkeleton rows={3} />
    </div>
  );
}
