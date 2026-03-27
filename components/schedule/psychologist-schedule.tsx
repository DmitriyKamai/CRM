"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ru } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { CalendarSubscriptionBlock } from "@/components/schedule/calendar-subscription";
import { ScheduleGridSkeleton } from "@/components/schedule/schedule-skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { CreateAppointmentDialog } from "@/components/schedule/create-appointment-dialog";
import { SlotDetailPopover } from "@/components/schedule/slot-detail-popover";
import { useScheduleSlots } from "@/hooks/use-schedule-slots";
import { useScheduleClients } from "@/hooks/use-schedule-clients";
import {
  HOLIDAYS_BY_MONTH_DAY,
  HOURS,
  HOUR_ROW_HEIGHT,
  SLOT_STYLE_FREE,
  SLOT_STYLE_PENDING,
  SLOT_STYLE_CONFIRMED,
  startOfWeek,
  addDays,
  isSameDay,
  dayKey,
  monthDayKey,
  formatTimeLabel,
  toMonthKey,
  toFirstOfMonth
} from "@/lib/schedule-utils";

export function PsychologistSchedule() {
  const {
    slots, loading, updatingId,
    createSlot, confirmAppointment, cancelAppointment, deleteSlot, updateSlotTime
  } = useScheduleSlots();
  const { clients, clientsLoading, loadClients } = useScheduleClients();

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => toFirstOfMonth(new Date()));
  const lastMonthKeyRef = useRef<string>(toMonthKey(new Date()));
  const [mounted, setMounted] = useState(false);
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDateTime, setCreateDateTime] = useState<Date | null>(null);

  const currentMonthKey = String(displayedMonth.getMonth() + 1).padStart(2, "0");
  const holidaysThisMonth = Object.entries(HOLIDAYS_BY_MONTH_DAY)
    .filter(([md]) => md.slice(0, 2) === currentMonthKey)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  useEffect(() => {
    void (async () => setMounted(true))();
  }, []);

  function openCreateDialogFor(day: Date, hour: number) {
    const dt = new Date(day.getTime());
    dt.setHours(hour, 0, 0, 0);
    setCreateDateTime(dt);
    setCreateDialogOpen(true);
    loadClients();
  }

  const weekStart = startOfWeek(currentDate);
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) weekDays.push(addDays(weekStart, i));
  const displayDays = isMobileView ? [currentDate] : weekDays;

  const slotsByDay: Record<string, typeof slots> = {};
  for (const slot of slots) {
    const key = dayKey(new Date(slot.start));
    if (!slotsByDay[key]) slotsByDay[key] = [];
    slotsByDay[key].push(slot);
  }
  Object.keys(slotsByDay).forEach(key => {
    slotsByDay[key].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  });

  const dayDotsMap = useMemo(() => {
    const map: Record<string, { free?: boolean; pending?: boolean; scheduled?: boolean }> = {};
    for (const slot of slots) {
      const key = dayKey(new Date(slot.start));
      if (!map[key]) map[key] = {};
      const hasAppointment = Boolean(slot.appointmentId);
      if (!hasAppointment) map[key].free = true;
      else if (slot.appointmentStatus === "PENDING_CONFIRMATION") map[key].pending = true;
      else map[key].scheduled = true;
    }
    return map;
  }, [slots]);

  const timeScrollRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    const el = containerRef.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const updateScale = () => {
      const mdUp = mq.matches;
      setIsMobileView(!mdUp);
      const w = el.offsetWidth;
      if (!mdUp) { setScale(1); return; }
      setScale(w >= 1008 ? 1 : Math.max(0.35, w / 1008));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    mq.addEventListener("change", updateScale);
    return () => { ro.disconnect(); mq.removeEventListener("change", updateScale); };
  }, [mounted]);

  useEffect(() => {
    if (scale >= 1) return;
    const el = innerRef.current;
    if (!el) return;
    const updateHeight = () => setInnerHeight(el.offsetHeight);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale, loading]);

  const ScheduleDayButton = useCallback(
    (props: React.ComponentProps<typeof CalendarDayButton>) => {
      const { day, children, modifiers, ...rest } = props;
      const key = dayKey(day.date);
      const dots = dayDotsMap[key];
      const hasDots = dots && (dots.free || dots.pending || dots.scheduled);
      const isSelectedSingle =
        modifiers?.selected && !modifiers?.range_start && !modifiers?.range_end && !modifiers?.range_middle;
      const dow = day.date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isHoliday = Boolean(HOLIDAYS_BY_MONTH_DAY[monthDayKey(day.date)]);
      const dayNumberClass = cn(
        "block text-center leading-none tabular-nums",
        !isSelectedSingle &&
          (isHoliday
            ? "font-medium text-destructive"
            : isWeekend
              ? "font-medium text-orange-600 dark:text-orange-400"
              : "")
      );
      return (
        <CalendarDayButton day={day} modifiers={modifiers ?? {}} {...rest}>
          <span className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[inherit] pb-1">
            <span className={cn("block w-full text-center leading-none", dayNumberClass)}>
              {children}
            </span>
            {hasDots && (
              <div className="absolute bottom-0 left-0 right-0 flex translate-y-px justify-center gap-0.5 py-0.5" aria-hidden>
                {dots!.free && (
                  <span
                    className={cn("size-[0.3125rem] shrink-0 rounded-full", isSelectedSingle ? "bg-sky-300 dark:bg-sky-400" : "bg-sky-600 dark:bg-sky-500")}
                    title="Свободный слот"
                  />
                )}
                {dots!.pending && (
                  <span
                    className={cn("size-[0.3125rem] shrink-0 rounded-full", isSelectedSingle ? "bg-orange-400 dark:bg-orange-400" : "bg-orange-600 dark:bg-orange-500")}
                    title="Ожидает подтверждения"
                  />
                )}
                {dots!.scheduled && (
                  <span
                    className={cn("size-[0.3125rem] shrink-0 rounded-full", isSelectedSingle ? "bg-emerald-400 dark:bg-emerald-300" : "bg-emerald-600 dark:bg-emerald-500")}
                    title="Подтверждённая запись"
                  />
                )}
              </div>
            )}
          </span>
        </CalendarDayButton>
      );
    },
    [dayDotsMap]
  );

  const handleCalendarSelect = useCallback((date: Date | undefined) => {
    if (!date) return;
    if (isSameDay(date, currentDate)) return;
    setCurrentDate(date);
    setDisplayedMonth(toFirstOfMonth(date));
  }, [currentDate]);

  const handleCalendarMonthChange = useCallback((month: Date | undefined) => {
    if (!month) return;
    const key = toMonthKey(month);
    if (lastMonthKeyRef.current === key) return;
    lastMonthKeyRef.current = key;
    setDisplayedMonth(toFirstOfMonth(month));
  }, []);

  useEffect(() => {
    if (loading) return;
    const node = timeScrollRef.current;
    if (!node) return;
    const scroll = 8 * HOUR_ROW_HEIGHT;
    node.scrollTop = scroll;
    const id = window.requestAnimationFrame(() => { if (node) node.scrollTop = scroll; });
    return () => window.cancelAnimationFrame(id);
  }, [loading]);

  const scaled = scale < 1;

  const weekNavToolbar = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:justify-start sm:flex-initial">
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
          const next = addDays(currentDate, isMobileView ? -1 : -7);
          setCurrentDate(next);
          setDisplayedMonth(toFirstOfMonth(next));
        }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 truncate px-1 text-center text-sm font-medium sm:text-left">
          {isMobileView
            ? currentDate.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" })
            : <>
                {weekStart.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}{" "}–{" "}
                {addDays(weekStart, 6).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "short",
                  year: weekStart.getFullYear() !== addDays(weekStart, 6).getFullYear() ? "numeric" : undefined
                })}
              </>}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
          const next = addDays(currentDate, isMobileView ? 1 : 7);
          setCurrentDate(next);
          setDisplayedMonth(toFirstOfMonth(next));
        }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (!mounted) {
    return (
      <div className="w-full min-w-0">
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,auto)_minmax(0,1fr)] md:grid-rows-[auto_auto] md:gap-4 md:items-start">
          <div className="hidden md:block md:col-start-1 md:row-start-1 min-h-0 min-w-0" aria-hidden />
          <div className="flex min-w-0 flex-col gap-3 row-start-1 md:col-start-1 md:row-start-2">
            <div className="min-w-0 max-w-full overflow-x-clip rounded-md border border-border bg-muted/30 animate-pulse" style={{ minHeight: 320 }} aria-busy="true" aria-label="Загрузка календаря" />
            <div className="min-w-0 max-w-full space-y-2 overflow-x-clip">
              <div className="h-4 w-[75%] rounded-md bg-muted/30 animate-pulse" aria-hidden />
              <div className="h-20 rounded-md bg-muted/30 animate-pulse" aria-hidden />
              <div className="h-16 rounded-md bg-muted/30 animate-pulse" aria-hidden />
            </div>
          </div>
          <div className="row-start-2 h-10 min-w-0 rounded-md bg-muted/30 animate-pulse md:col-start-2 md:row-start-1" aria-hidden />
          <div className="row-start-3 min-w-0 md:col-start-2 md:row-start-2">
            <div className="min-w-0">
              <div className="md:overflow-visible md:pb-0 overflow-x-auto overscroll-x-contain pb-1 [touch-action:pan-x_pan-y]">
                <Card className="overflow-hidden rounded-lg border border-border md:min-w-[1008px]">
                  <CardContent className="space-y-2 px-4 py-3">
                    <ScheduleGridSkeleton />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="w-full min-w-0">
        <div
          className={scaled ? "overflow-hidden" : ""}
          style={{
            width: scaled ? 1008 * scale : "100%",
            height: scaled && innerHeight > 0 ? innerHeight * scale : undefined,
            maxWidth: "100%",
            margin: scaled ? "0 auto" : undefined
          }}
        >
          <div
            ref={innerRef}
            className="isolate grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,auto)_minmax(0,1fr)] md:grid-rows-[auto_auto] md:gap-4 md:items-start"
            style={{
              width: scaled ? 1008 : "100%",
              transform: scaled ? `scale(${scale})` : undefined,
              transformOrigin: "0 0"
            }}
          >
            <div className="hidden md:block md:col-start-1 md:row-start-1 min-h-0 min-w-0" aria-hidden />
            <div className="flex min-w-0 flex-col gap-3 row-start-1 md:col-start-1 md:row-start-2">
              <div className="min-w-0 max-w-full justify-self-stretch overflow-x-auto overflow-y-visible overscroll-x-contain [touch-action:pan-x_pan-y]">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  month={displayedMonth}
                  onSelect={handleCalendarSelect}
                  onMonthChange={handleCalendarMonthChange}
                  locale={ru}
                  initialFocus
                  components={{ DayButton: ScheduleDayButton }}
                  className="max-w-full min-w-0 [--cell-size:2rem]"
                />
              </div>

              <div className="flex min-w-0 max-w-full flex-col gap-3 overflow-x-clip break-words">
                {holidaysThisMonth.length > 0 && (
                  <div className="hidden space-y-1 text-xs text-muted-foreground md:block">
                    <div className="text-sm font-semibold text-foreground">
                      Праздничные дни<span className="hidden sm:inline"> месяца</span>
                    </div>
                    <ul className="space-y-0.5">
                      {holidaysThisMonth.map(([md, title]) => (
                        <li key={md} className="flex gap-2">
                          <span className="shrink-0 whitespace-nowrap tabular-nums text-left font-medium text-foreground">
                            {md.slice(3, 5)}.{currentMonthKey}
                          </span>
                          <span className="min-w-0 break-words">{title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="hidden text-sm font-semibold text-foreground md:block">Условные обозначения</div>
                  <ul className="space-y-0.5">
                    <li className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 shrink-0 rounded-sm border", SLOT_STYLE_FREE)} aria-hidden />
                      <span className="min-w-0">Свободный слот</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 shrink-0 rounded-sm border", SLOT_STYLE_PENDING)} aria-hidden />
                      <span className="min-w-0">Запись, ожидающая подтверждения</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 shrink-0 rounded-sm border", SLOT_STYLE_CONFIRMED)} aria-hidden />
                      <span className="min-w-0">Подтверждённая запись</span>
                    </li>
                  </ul>
                </div>
                <Collapsible className="rounded-lg border border-border/80 bg-muted/20">
                  <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/40 [&[data-state=open]]:rounded-t-lg [&[data-state=closed]]:rounded-lg">
                    <span>Календарь в Google / Apple</span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border/80 px-3 pb-3 pt-2">
                    <CalendarSubscriptionBlock variant="embedded" />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            <div className="min-w-0 row-start-2 md:col-start-2 md:row-start-1">{weekNavToolbar}</div>

            <div className="row-start-3 min-w-0 md:col-start-2 md:row-start-2">
              <div className="min-w-0 md:min-w-0">
                <div className={isMobileView ? "" : "overflow-x-auto overscroll-x-contain pb-2 [touch-action:pan-x_pan-y] md:overflow-visible md:pb-0"}>
                  <Card className={cn("overflow-hidden rounded-lg border border-border", !isMobileView && "min-w-[1008px] md:min-w-0")}>
                    <CardContent className="space-y-2 px-4 py-3">
                      {loading ? (
                        <ScheduleGridSkeleton />
                      ) : (
                        <>
                          {!isMobileView && (
                            <div className={cn("grid border-b border-border pb-2 text-xs text-muted-foreground", "grid-cols-[64px,repeat(7,minmax(0,1fr))]")}>
                              <div />
                              {displayDays.map(day => {
                                const isToday = isSameDay(day, new Date());
                                const holiday = HOLIDAYS_BY_MONTH_DAY[monthDayKey(day)];
                                return (
                                  <div key={day.toISOString()} className="px-2">
                                    <div className={isToday ? "font-semibold text-foreground" : ""}>
                                      {day.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "2-digit" })}
                                    </div>
                                    {holiday && <div className="text-sm text-destructive">{holiday}</div>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div ref={timeScrollRef}>
                            <div className={cn("grid text-xs", isMobileView ? "grid-cols-[48px,1fr]" : "grid-cols-[64px,repeat(7,minmax(0,1fr))]")}>
                              {HOURS.map((hour, index) => {
                                const isLastRow = index === HOURS.length - 1;
                                return (
                                  <div key={hour} className="contents">
                                    <div className="border-r border-border pr-2 text-right align-top text-sm text-muted-foreground">
                                      {formatTimeLabel(hour)}
                                    </div>
                                    {displayDays.map((day, dayIndex) => {
                                      const key = dayKey(day);
                                      const daySlots = (slotsByDay[key] || []).filter(s => new Date(s.start).getHours() === hour);
                                      const isLastCol = dayIndex === displayDays.length - 1;
                                      const cellClass =
                                        "border-t border-l border-border/40 px-1 touch-manipulation" +
                                        (isLastCol ? " border-r border-border/40" : "") +
                                        (isLastRow ? " pb-2" : "");
                                      return (
                                        <div
                                          key={`${key}_${hour}`}
                                          className={cellClass}
                                          style={{ minHeight: HOUR_ROW_HEIGHT }}
                                          onClick={() => { if (daySlots.length === 0) openCreateDialogFor(day, hour); }}
                                        >
                                          <div className="relative h-full">
                                            {daySlots.map(slot => (
                                              <SlotDetailPopover
                                                key={slot.id}
                                                slot={slot}
                                                isOpen={openSlotId === slot.id}
                                                onOpenChange={open => setOpenSlotId(open ? slot.id : null)}
                                                isUpdating={updatingId === slot.id}
                                                isMobileView={isMobileView}
                                                onConfirm={() => { confirmAppointment.mutate({ slot }); setOpenSlotId(null); }}
                                                onCancel={() => void cancelAppointment.mutateAsync({ slot })}
                                                onDelete={() => void deleteSlot.mutateAsync(slot.id)}
                                                onUpdateTime={(time, dur) => void updateSlotTime.mutateAsync({ slot, newTime: time, durationMinutes: dur })}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateAppointmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        initialDateTime={createDateTime}
        clients={clients}
        clientsLoading={clientsLoading}
        onCreated={async params => { await createSlot.mutateAsync(params); }}
      />
    </>
  );
}
