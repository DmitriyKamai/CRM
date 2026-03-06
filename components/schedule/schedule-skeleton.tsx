"use client";

/** Минимальный прелоадер для сетки слотов: мало DOM, без тяжёлой анимации. */
export function ScheduleGridSkeleton() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground min-h-[400px]"
      aria-busy="true"
      aria-label="Загрузка расписания"
    >
      <span>Загрузка расписания…</span>
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: "120ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: "240ms" }} />
      </div>
    </div>
  );
}
