"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { ScheduleGridSkeleton } from "@/components/schedule/schedule-skeleton";

type SlotStatus = "FREE" | "BOOKED" | "CANCELED";
type AppointmentStatus = "PENDING_CONFIRMATION" | "SCHEDULED" | null;

type SlotDto = {
  id: string;
  start: string;
  end: string;
  status: SlotStatus;
  appointmentId?: string | null;
  appointmentStatus?: AppointmentStatus;
  clientName?: string | null;
};

type ClientOption = {
  id: string;
  firstName: string;
  lastName: string;
  hasAccount?: boolean;
};

const HOLIDAYS_BY_MONTH_DAY: Record<string, string> = {
  "01-01": "Новый год",
  "01-02": "Новый год",
  "01-07": "Рождество Христово (православное)",
  "03-08": "Международный женский день",
  "04-21": "Радуница",
  "05-01": "День труда",
  "05-09": "День Победы",
  "07-03": "День Независимости Республики Беларусь",
  "11-07": "День Октябрьской революции",
  "12-25": "Рождество Христово (католическое)"
};

const HOURS: number[] = [];
for (let h = 0; h <= 23; h += 1) {
  HOURS.push(h);
}

const HOUR_ROW_HEIGHT = 56;

function startOfWeek(date: Date): Date {
  const d = new Date(date.getTime());
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

function formatTimeLabel(hour: number): string {
  const hh = hour < 10 ? `0${hour}` : String(hour);
  return `${hh}:00`;
}

function formatHumanRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const hStart = String(start.getHours()).padStart(2, "0");
  const mStart = String(start.getMinutes()).padStart(2, "0");
  const hEnd = String(end.getHours()).padStart(2, "0");
  const mEnd = String(end.getMinutes()).padStart(2, "0");

  return `${hStart}:${mStart}–${hEnd}:${mEnd}`;
}

function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toFirstOfMonth(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), 1);
  return out;
}

export function PsychologistSchedule() {
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => toFirstOfMonth(new Date()));
  const lastMonthKeyRef = useRef<string>(toMonthKey(new Date()));

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState<boolean>(false);

  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [createDateTime, setCreateDateTime] = useState<Date | null>(null);
  const [createClientId, setCreateClientId] = useState<string | undefined>(undefined);
  const [createDuration, setCreateDuration] = useState<number>(50);
  const [creating, setCreating] = useState<boolean>(false);
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);

  const currentMonthKey = String(displayedMonth.getMonth() + 1).padStart(2, "0");
  const holidaysThisMonth = Object.entries(HOLIDAYS_BY_MONTH_DAY)
    .filter(([md]) => md.slice(0, 2) === currentMonthKey)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  async function loadSlots(retries = 2): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schedule/slots");
      if (!res.ok) {
        let msg = "Не удалось загрузить расписание";
        try {
          const body = await res.json();
          if (body && typeof body.message === "string") msg = body.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      const data = (await res.json()) as SlotDto[];
      setSlots(data);
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => void loadSlots(retries - 1), 500);
        return;
      }
      const msg =
        err instanceof Error ? err.message : "Не удалось подключиться к серверу расписания";
      console.error(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSlots();
  }, []);

  async function loadClientsOnce(): Promise<void> {
    if (clients.length > 0 || clientsLoading) return;
    setClientsLoading(true);
    try {
      const res = await fetch("/api/psychologist/clients");
      if (!res.ok) return;
      const body = (await res.json().catch(() => null)) as
        | { clients?: { id: string; firstName: string; lastName: string; hasAccount?: boolean }[] }
        | null;
      if (!body || !Array.isArray(body.clients)) return;
      setClients(
        body.clients.map(c => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          hasAccount: c.hasAccount
        }))
      );
    } catch {
      // ignore
    } finally {
      setClientsLoading(false);
    }
  }

  function openCreateDialogFor(day: Date, hour: number): void {
    const dt = new Date(day.getTime());
    dt.setHours(hour, 0, 0, 0);
    setCreateDateTime(dt);
    setCreateClientId(undefined);
    setCreateDuration(50);
    setCreateDialogOpen(true);
    void loadClientsOnce();
  }

  async function handleCreateAppointment(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!createDateTime) return;
    setCreating(true);
    setError(null);
    try {
      const startIso = createDateTime.toISOString();
      let res: Response;

      if (createClientId) {
        res = await fetch(`/api/psychologist/clients/${createClientId}/appointments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start: startIso,
            durationMinutes: createDuration
          })
        });
      } else {
        res = await fetch("/api/schedule/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start: startIso,
            durationMinutes: createDuration
          })
        });
      }

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // ignore
      }

      if (!res.ok) {
        const msg =
          body && typeof body.message === "string"
            ? body.message
            : "Не удалось создать слот";
        throw new Error(msg);
      }

      toast.success(
        createClientId ? "Запись предложена клиенту." : "Свободный слот создан."
      );
      setCreateDialogOpen(false);
      setCreateDateTime(null);
      await loadSlots();
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Не удалось создать запись";
      setError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmAppointment(slot: SlotDto): Promise<void> {
    if (!slot.appointmentId) return;
    setUpdatingId(slot.id);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${slot.appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SCHEDULED" })
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          body && typeof body.message === "string"
            ? body.message
            : "Не удалось подтвердить запись";
        throw new Error(msg);
      }
      setSlots(prev =>
        prev.map(s =>
          s.id === slot.id ? { ...s, appointmentStatus: "SCHEDULED" as AppointmentStatus } : s
        )
      );
      setOpenSlotId(null);
      toast.success("Запись подтверждена.");
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Не удалось подтвердить запись";
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCancelAppointment(slot: SlotDto): Promise<void> {
    if (!slot.appointmentId) return;
    setUpdatingId(slot.id);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${slot.appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" })
      });
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // ignore
      }
      if (!res.ok) {
        const msg =
          body && typeof body.message === "string"
            ? body.message
            : "Не удалось отменить запись";
        throw new Error(msg);
      }
      setSlots(prev =>
        prev.map(s =>
          s.id === slot.id
            ? { ...s, status: "FREE" as SlotStatus, appointmentId: null, clientName: null }
            : s
        )
      );
      toast.success("Запись отменена.");
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Не удалось отменить запись";
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteSlot(slotId: string): Promise<void> {
    setUpdatingId(slotId);
    setError(null);
    try {
      const res = await fetch(`/api/schedule/slots/${slotId}`, {
        method: "DELETE"
      });
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // ignore
      }
      if (!res.ok) {
        const msg =
          body && typeof body.message === "string"
            ? body.message
            : "Не удалось удалить слот";
        throw new Error(msg);
      }
      setSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Не удалось удалить слот";
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleUpdateSlotTime(
    slot: SlotDto,
    newTime: string,
    durationMinutes: number
  ): Promise<void> {
    setUpdatingId(slot.id);
    setError(null);
    try {
      const base = new Date(slot.start);
      const parts = newTime.split(":");
      const hours = parseInt(parts[0] ?? "0", 10);
      const minutes = parseInt(parts[1] ?? "0", 10);
      base.setHours(hours, minutes, 0, 0);

      const res = await fetch(`/api/schedule/slots/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: base.toISOString(),
          durationMinutes
        })
      });

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // ignore
      }

      if (!res.ok) {
        const msg =
          body && typeof body.message === "string"
            ? body.message
            : "Не удалось обновить слот";
        throw new Error(msg);
      }

      const updated = body as SlotDto;
      setSlots(prev =>
        prev.map(s =>
          s.id === slot.id
            ? { ...s, start: updated.start, end: updated.end, status: updated.status }
            : s
        )
      );
      toast.success("Слот обновлён.");
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Не удалось обновить слот";
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  const weekStart = startOfWeek(currentDate);
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    weekDays.push(addDays(weekStart, i));
  }

  const slotsByDay: Record<string, SlotDto[]> = {};
  for (const slot of slots) {
    const d = new Date(slot.start);
    const key = dayKey(d);
    if (!slotsByDay[key]) {
      slotsByDay[key] = [];
    }
    slotsByDay[key].push(slot);
  }
  Object.keys(slotsByDay).forEach(key => {
    slotsByDay[key].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  });

  /** По дням: какие типы записей есть (для точек под датой в календаре). */
  const dayDotsMap = useMemo(() => {
    const map: Record<
      string,
      { free?: boolean; pending?: boolean; scheduled?: boolean }
    > = {};
    for (const slot of slots) {
      const key = dayKey(new Date(slot.start));
      if (!map[key]) map[key] = {};
      const hasAppointment = Boolean(slot.appointmentId);
      if (!hasAppointment) {
        map[key].free = true;
      } else if (slot.appointmentStatus === "PENDING_CONFIRMATION") {
        map[key].pending = true;
      } else {
        map[key].scheduled = true;
      }
    }
    return map;
  }, [slots]);

  const timeScrollRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateScale = () => {
      const w = el.offsetWidth;
      setScale(w >= 1008 ? 1 : Math.max(0.25, w / 1008));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      const hasDots =
        dots && (dots.free || dots.pending || dots.scheduled);
      const isSelectedSingle =
        modifiers?.selected &&
        !modifiers?.range_start &&
        !modifiers?.range_end &&
        !modifiers?.range_middle;
      return (
        <CalendarDayButton day={day} modifiers={modifiers ?? {}} {...rest}>
          <span className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[inherit]">
            <span className="block w-full text-center leading-none">{children}</span>
            {hasDots && (
              <div
                className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 py-0.5"
                aria-hidden
              >
                {dots!.free && (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      isSelectedSingle ? "bg-sky-300" : "bg-sky-500"
                    )}
                    title="Свободный слот"
                  />
                )}
                {dots!.pending && (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      isSelectedSingle ? "bg-amber-300" : "bg-amber-400"
                    )}
                    title="Ожидает подтверждения"
                  />
                )}
                {dots!.scheduled && (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      isSelectedSingle ? "bg-emerald-400" : "bg-emerald-500"
                    )}
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
    const targetHour = 8;
    const scroll = targetHour * HOUR_ROW_HEIGHT;
    node.scrollTop = scroll;
    const id = window.requestAnimationFrame(() => {
      if (node) {
        node.scrollTop = scroll;
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [loading]);

  const scaled = scale < 1;

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
            className="flex gap-1 items-start"
            style={{
              width: scaled ? 1008 : "100%",
              transform: scaled ? `scale(${scale})` : undefined,
              transformOrigin: "0 0"
            }}
          >
        <div className="w-72 shrink-0 flex flex-col">
          <div className="h-10 shrink-0" aria-hidden />
          <Calendar
            mode="single"
            selected={currentDate}
            month={displayedMonth}
            onSelect={handleCalendarSelect}
            onMonthChange={handleCalendarMonthChange}
            locale={ru}
            initialFocus
            components={{ DayButton: ScheduleDayButton }}
          />
          {holidaysThisMonth.length > 0 && (
            <div className="mt-3 space-y-3 text-xs text-muted-foreground">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  Праздничные дни месяца
                </div>
                <ul className="space-y-0.5">
                  {holidaysThisMonth.map(([md, title]) => {
                    const day = md.slice(3, 5);
                    return (
                      <li key={md} className="flex gap-2">
                        <span className="w-8 text-left font-medium text-foreground">
                          {day}.{currentMonthKey}
                        </span>
                        <span className="flex-1">{title}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  Условные обозначения
                </div>
                <ul className="space-y-0.5">
                  <li className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-sky-500/40 border border-sky-500/60" />
                    <span>Свободный слот</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-amber-400/60 border border-amber-500/70" />
                    <span>Запись, ожидающая подтверждения</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-emerald-500/60 border border-emerald-500/70" />
                    <span>Подтверждённая запись</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const next = addDays(currentDate, -7);
                  setCurrentDate(next);
                  setDisplayedMonth(toFirstOfMonth(next));
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-1 text-sm font-medium">
                {weekStart.toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "short"
                })}{" "}
                –{" "}
                {addDays(weekStart, 6).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "short",
                  year:
                    weekStart.getFullYear() !== addDays(weekStart, 6).getFullYear()
                      ? "numeric"
                      : undefined
                })}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const next = addDays(currentDate, 7);
                  setCurrentDate(next);
                  setDisplayedMonth(toFirstOfMonth(next));
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border border-border rounded-lg">
            <CardContent className="space-y-2 px-4 py-3">
          {error && (
            <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
              {error}
            </div>
          )}

          {loading ? (
            <ScheduleGridSkeleton />
          ) : error ? null : (
            <>
                <div className="grid grid-cols-[64px,repeat(7,minmax(0,1fr))] border-b border-border pb-2 text-xs text-muted-foreground">
                  <div />
                  {weekDays.map(day => {
                    const isToday = isSameDay(day, new Date());
                    const mdKey = monthDayKey(day);
                    const holiday = HOLIDAYS_BY_MONTH_DAY[mdKey];
                    return (
                      <div key={day.toISOString()} className="px-2">
                        <div className={isToday ? "font-semibold text-foreground" : ""}>
                          {day.toLocaleDateString("ru-RU", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit"
                          })}
                        </div>
                        {holiday ? (
                          <div className="text-sm text-red-500">{holiday}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div ref={timeScrollRef}>
                  <div className="grid grid-cols-[64px,repeat(7,minmax(0,1fr))] text-xs">
                    {HOURS.map((hour, index) => {
                      const hourLabel = formatTimeLabel(hour);
                      const isLastRow = index === HOURS.length - 1;
                      return (
                        <div key={hour} className="contents">
                          <div className="border-r border-border pr-2 text-right align-top text-sm text-muted-foreground">
                            {hourLabel}
                          </div>

                          {weekDays.map((day, dayIndex) => {
                            const key = dayKey(day);
                            const daySlots = (slotsByDay[key] || []).filter(slot => {
                              const d = new Date(slot.start);
                              return d.getHours() === hour;
                            });
                            const isLastCol = dayIndex === weekDays.length - 1;

                            const cellClass =
                              "border-t border-l border-border/40 px-1" +
                              (isLastCol ? " border-r border-border/40" : "") +
                              (isLastRow ? " pb-2" : "");

                            return (
                              <div
                                key={`${key}_${hour}`}
                                className={cellClass}
                                style={{ minHeight: HOUR_ROW_HEIGHT }}
                                onClick={() => {
                                  if (daySlots.length === 0) {
                                    openCreateDialogFor(day, hour);
                                  }
                                }}
                              >
                                <div className="relative h-full">
                                  {daySlots.map(slot => {
                                    const hasAppointment = Boolean(slot.appointmentId);
                                    const label = formatHumanRange(slot.start, slot.end);

                                    const startDate = new Date(slot.start);
                                    const endDate = new Date(slot.end);
                                    const minutesFromHourStart = startDate.getMinutes();
                                    const durationMinutes = Math.max(
                                      5,
                                      (endDate.getTime() - startDate.getTime()) / 60000
                                    );

                                    const topOffsetPx =
                                      (minutesFromHourStart / 60) * HOUR_ROW_HEIGHT;
                                    const heightPx =
                                      (durationMinutes / 60) * HOUR_ROW_HEIGHT;

                                    const popupStatusText = (() => {
                                      if (!hasAppointment) {
                                        return "Свободный слот";
                                      }
                                      if (slot.appointmentStatus === "PENDING_CONFIRMATION") {
                                        return slot.clientName
                                          ? `${slot.clientName} (ожидает подтверждения)`
                                          : "Ожидает подтверждения";
                                      }
                                      return slot.clientName || "Занято";
                                    })();

                                    // Компактный режим: если слот низкий, внутри блока показываем только время,
                                    // а всё остальное (статус, имя) — во всплывающей подсказке/попапе.
                                    const isCompact = heightPx < 56;

                                    let statusText: string;
                                    if (isCompact) {
                                      statusText = "";
                                    } else if (hasAppointment) {
                                      if (slot.appointmentStatus === "PENDING_CONFIRMATION") {
                                        statusText = "Ожидает подтверждения";
                                      } else {
                                        statusText = slot.clientName || "";
                                      }
                                    } else {
                                      statusText = "Свободен";
                                    }

                                    const tooltipTitle = popupStatusText;

                                    let slotBgClass = "";
                                    let slotBorderClass = "";
                                    if (!hasAppointment) {
                                      slotBgClass = "bg-[hsl(var(--status-free))]";
                                      slotBorderClass = "border-[hsl(var(--status-free))]";
                                    } else if (
                                      slot.appointmentStatus === "PENDING_CONFIRMATION"
                                    ) {
                                      slotBgClass = "bg-[hsl(var(--status-warning))]";
                                      slotBorderClass = "border-[hsl(var(--status-warning))]";
                                    } else {
                                      slotBgClass = "bg-[hsl(var(--status-success))]";
                                      slotBorderClass = "border-[hsl(var(--status-success))]";
                                    }

                                    const initialTime = startDate
                                      .toTimeString()
                                      .slice(0, 5);

                                    return (
                                      <Popover
                                        key={slot.id}
                                        open={openSlotId === slot.id}
                                        onOpenChange={open =>
                                          setOpenSlotId(open ? slot.id : null)
                                        }
                                      >
                                        <PopoverTrigger asChild>
                                          <div
                                            className={
                                              "absolute left-0 right-0 z-10 rounded-md border px-2 py-1.5 shadow-sm cursor-pointer text-white " +
                                              slotBgClass +
                                              " " +
                                              slotBorderClass
                                            }
                                            title={tooltipTitle}
                                            style={{
                                              top: topOffsetPx,
                                              height: Math.max(22, heightPx)
                                            }}
                                            onClick={event => {
                                              event.stopPropagation();
                                            }}
                                          >
                                            <div className="text-sm font-medium">
                                              {label}
                                            </div>
                                            <div className="mt-0.5 text-sm text-white/90">
                                              {statusText}
                                            </div>
                                          </div>
                                        </PopoverTrigger>
                                        <PopoverContent
                                          side="right"
                                          align="start"
                                          className="w-64 space-y-3 bg-card text-xs"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <div className="text-sm font-medium">
                                                {label}
                                              </div>
                                              <div className="mt-0.5 text-sm text-muted-foreground">
                                                {popupStatusText}
                                              </div>
                                            </div>
                                            <button
                                              type="button"
                                              className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
                                              onClick={() => setOpenSlotId(null)}
                                              aria-label="Закрыть"
                                            >
                                              <X className="h-3 w-3 text-muted-foreground" />
                                            </button>
                                          </div>

                                          {!hasAppointment && (
                                            <form
                                              className="space-y-2"
                                              onSubmit={e => {
                                                e.preventDefault();
                                                const form = e.currentTarget;
                                                const timeSelect = form.elements
                                                  .namedItem("time") as HTMLSelectElement | null;
                                                const durationSelect = form.elements
                                                  .namedItem("duration") as HTMLSelectElement | null;
                                                const timeValue = timeSelect?.value || initialTime;
                                                const durationValue =
                                                  durationSelect?.value ||
                                                  String(durationMinutes);
                                                void handleUpdateSlotTime(
                                                  slot,
                                                  timeValue,
                                                  Number(durationValue)
                                                );
                                              }}
                                            >
                                              <div className="space-y-1">
                                                <Label className="text-sm">Время</Label>
                                                <Select defaultValue={initialTime} name="time">
                                                  <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {HOURS.flatMap(h => [
                                                      `${String(h).padStart(2, "0")}:00`,
                                                      `${String(h).padStart(2, "0")}:30`
                                                    ]).map(t => (
                                                      <SelectItem key={t} value={t}>
                                                        {t}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div className="space-y-1">
                                                <Label className="text-sm">
                                                  Длительность, минут
                                                </Label>
                                                <Select
                                                  defaultValue={String(durationMinutes)}
                                                  name="duration"
                                                >
                                                  <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="30">30</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                    <SelectItem value="60">60</SelectItem>
                                                    <SelectItem value="90">90</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div className="flex justify-end gap-2 pt-1">
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="destructive"
                                                  className="h-7 px-2 text-sm"
                                                  disabled={updatingId === slot.id}
                                                  onClick={() => void handleDeleteSlot(slot.id)}
                                                >
                                                  Удалить слот
                                                </Button>
                                                <Button
                                                  type="submit"
                                                  size="sm"
                                                  className="h-7 px-2 text-sm"
                                                  disabled={updatingId === slot.id}
                                                >
                                                  Сохранить
                                                </Button>
                                              </div>
                                            </form>
                                          )}

                                          {hasAppointment && (
                                            <div className="flex items-center justify-end gap-2">
                                              {slot.appointmentStatus === "PENDING_CONFIRMATION" && (
                                                <Button
                                                  size="sm"
                                                  className="h-8 min-h-8 px-3 text-sm"
                                                  disabled={updatingId === slot.id}
                                                  onClick={() => void handleConfirmAppointment(slot)}
                                                >
                                                  Подтвердить запись
                                                </Button>
                                              )}
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 min-h-8 px-3 text-sm"
                                                disabled={updatingId === slot.id}
                                                onClick={() => void handleCancelAppointment(slot)}
                                              >
                                                Отменить
                                              </Button>
                                            </div>
                                          )}
                                        </PopoverContent>
                                      </Popover>
                                    );
                                  })}
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
      
      <Dialog
        open={createDialogOpen}
        onOpenChange={open => {
          setCreateDialogOpen(open);
          if (!open) {
            setCreateDateTime(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новая запись</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAppointment} className="space-y-4 text-sm">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Время</Label>
              <p className="text-sm font-medium">
                {createDateTime
                  ? formatHumanRange(
                      createDateTime.toISOString(),
                      new Date(
                        createDateTime.getTime() + createDuration * 60 * 1000
                      ).toISOString()
                    )
                  : "Не выбрано"}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Клиент (необязательно)</Label>
              <Select
                value={createClientId ?? "none"}
                onValueChange={value => {
                  if (value === "none") {
                    setCreateClientId(undefined);
                  } else {
                    setCreateClientId(value);
                  }
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue
                    placeholder={
                      clientsLoading
                        ? "Загрузка..."
                        : "Не выбран (будет свободный слот)"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без клиента (свободный слот)</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.lastName} {c.firstName}
                      {c.hasAccount === false && " (без аккаунта)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Длительность, минут</Label>
              <Select
                value={String(createDuration)}
                onValueChange={value => setCreateDuration(Number(value))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                  <SelectItem value="90">90</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {error}
              </div>
            )}
            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!createDateTime || creating}
              >
                {creating ? "Создаём..." : "Создать запись"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

