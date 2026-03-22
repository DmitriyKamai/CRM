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
        <Skeleton className="h-8 w-full" />
      </CardContent>
      <CardFooter className="px-3 pb-4 pt-1">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}

export default function PsychologistsListLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Skeleton className="h-20 w-full rounded-none" />
        <div className="space-y-2 p-5 sm:p-7">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-16 w-full max-w-2xl" />
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-10 w-full" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
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
