import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Скелетон страницы профиля (не списка каталога). */
export default function PsychologistProfileLoading() {
  return (
    <div className="relative mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <Skeleton className="h-5 w-44 rounded-md" aria-hidden />

      <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Skeleton
          className="h-24 w-full rounded-none sm:h-28"
          aria-hidden
        />
        <div className="flex flex-col gap-8 p-6 pt-2 lg:flex-row lg:items-start lg:gap-10 lg:p-8">
          <div className="mx-auto flex shrink-0 justify-center lg:mx-0 lg:-mt-12">
            <Skeleton className="h-36 w-36 rounded-full sm:h-40 sm:w-40 lg:h-[22rem] lg:w-[17rem] lg:rounded-3xl" />
          </div>
          <div className="min-w-0 flex-1 space-y-5 lg:pt-2">
            <div className="space-y-3 text-center lg:text-left">
              <Skeleton className="mx-auto h-8 w-56 max-w-full lg:mx-0" />
              <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <Skeleton className="h-px w-full opacity-60" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-6 w-48 max-w-full" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <Skeleton className="mt-6 h-10 w-32" />
        <Skeleton className="mt-4 h-px w-full" />
        <Skeleton className="mt-4 h-24 w-full rounded-lg" />
      </Card>
    </div>
  );
}
