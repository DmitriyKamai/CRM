import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function CatalogCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl shadow-sm">
      <Skeleton className="aspect-[4/3] w-full rounded-t-2xl rounded-b-none" />
      <CardContent className="space-y-2 p-3">
        <Skeleton className="mx-auto h-4 w-2/3 sm:h-5" />
        <div className="flex justify-center gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-[3.75rem] w-full" />
      </CardContent>
      <CardFooter className="border-t border-border/60 px-3 pb-4 pt-3">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}

export default function PsychologistsListLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Skeleton className="h-14 w-full rounded-none" />
        <div className="space-y-2 p-5 pb-4 pt-2 sm:px-7">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-12 w-full max-w-2xl" />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <Skeleton className="h-14 w-full max-w-xs rounded-md" />
          <Skeleton className="h-14 w-full max-w-[14rem] rounded-md" />
          <Skeleton className="h-14 w-full max-w-[14rem] rounded-md" />
          <div className="flex flex-1 justify-end gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CatalogCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
