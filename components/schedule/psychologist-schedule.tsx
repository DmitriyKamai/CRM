"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
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
type ApiErrorBody = { message?: string } | null;

type SlotDto = {
  id: string;
  start: string;
  end: string;
  status: SlotStatus;
  appointmentId?: string | null;
  appointmentStatus?: AppointmentStatus;
  clientName?: string | null;
  proposedByPsychologist?: boolean;
};

type ClientOption = {
  id: string;
  firstName: string;
  lastName: string;
  hasAccount?: boolean;
};

function SlotTimeEditor({
  initialTime,
  durationMinutes,
  isUpdating,
  onSave,
  onDelete
}: {
  initialTime: string;
  durationMinutes: number;
  isUpdating: boolean;
  onSave: (time: string, duration: number) => void;
  onDelete: () => void;
}) {
  const [timeValue, setTimeValue] = useState(initialTime);
  const [durValue, setDurValue] = useState(String(durationMinutes));

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1">
        <Label className="text-sm">Время</Label>
        <TimeInput value={timeValue} onChange={setTimeValue} />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm">Длительность, минут</Label>
        <Select value={durValue} onValueChange={setDurValue}>
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
          disabled={isUpdating}
          onClick={onDelete}
        >
          Удалить слот
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 px-2 text-sm"
          disabled={isUpdating}
          onClick={() => onSave(timeValue, Number(durValue))}
        >
          Сохранить
        </Button>
      </div>
    </div>
  );
}

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

/** Высота блока слота (px), при которой помещаются две строки: время (text-xs) и имя/статус (~11px + py-1). */
const MIN_SLOT_HEIGHT_FOR_TWO_LINES = 36;

/** Сетка недели, точки под датами и легенда — одни и те же цвета (не --status-* из темы). */
const SLOT_STYLE_FREE =
  "bg-sky-600 border-sky-700 dark:bg-sky-500 dark:border-sky-400";
const SLOT_STYLE_PENDING =
  "bg-amber-500 border-amber-600 dark:bg-amber-400 dark:border-amber-500";
const SLOT_STYLE_CONFIRMED =
  "bg-emerald-600 border-emerald-700 dark:bg-emerald-500 dark:border-emerald-400";

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

/** Вторая строка в ячейке календаря: фамилия и имя (как в API) или короткий статус. */
function getSlotCalendarSecondLine(
  slot: SlotDto,
  hasAppointment: boolean,
  isPendingByPsychologist: boolean
): string | null {
  if (!hasAppointment) return "Свободен";
  if (slot.appointmentStatus === "PENDING_CONFIRMATION") {
    const name = slot.clientName?.trim();
    if (name) return name;
    return isPendingByPsychologist ? "Ждёт клиента" : "Ждёт вас";
  }
  const name = slot.clientName?.trim();
  return name || null;
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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => toFirstOfMonth(new Date()));
  const lastMonthKeyRef = useRef<string>(toMonthKey(new Date()));
  const [mounted, setMounted] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState<boolean>(false);

  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [createDateTime, setCreateDateTime] = useState<Date | null>(null);
  const [createClientId, setCreateClientId] = useState<string | undefined>(undefined);
  const [createDuration, setCreateDuration] = useState<number>(50);
  const [creating, setCreating] = useState<boolean>(false);
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  const currentMonthKey = String(displayedMonth.getMonth() + 1).padStart(2, "0");
  const holidaysThisMonth = Object.entries(HOLIDAYS_BY_MONTH_DAY)
    .filter(([md]) => md.slice(0, 2) === currentMonthKey)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const loadSlots = useCallback(async (retries = 2): Promise<void> => {
    setLoading(true);
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
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  // Avoid hydration mismatches caused by time-zone / "now" differences between server and browser.
  useEffect(() => {
    setMounted(true);
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

      let body: ApiErrorBody = null;
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
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmAppointment(slot: SlotDto): Promise<void> {
    if (!slot.appointmentId) return;
    setUpdatingId(slot.id);
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
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCancelAppointment(slot: SlotDto): Promise<void> {
    if (!slot.appointmentId) return;
    setUpdatingId(slot.id);
    try {
      const res = await fetch(`/api/appointments/${slot.appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" })
      });
      let body: ApiErrorBody = null;
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
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteSlot(slotId: string): Promise<void> {
    setUpdatingId(slotId);
    try {
      const res = await fetch(`/api/schedule/slots/${slotId}`, {
        method: "DELETE"
      });
      let body: ApiErrorBody = null;
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

      let body: ApiErrorBody = null;
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
  // На мобильном — только выбранный день, без горизонтального скролла.
  const displayDays = isMobileView ? [currentDate] : weekDays;

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

  /** На узких экранах показываем один день без горизонтального скролла. */
  useEffect(() => {
    if (!mounted) return;
    const el = containerRef.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const updateScale = () => {
      const mdUp = mq.matches;
      setIsMobileView(!mdUp);
      const w = el.offsetWidth;
      if (!mdUp) {
        setScale(1);
        return;
      }
      setScale(w >= 1008 ? 1 : Math.max(0.35, w / 1008));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    mq.addEventListener("change", updateScale);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", updateScale);
    };
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
      const hasDots =
        dots && (dots.free || dots.pending || dots.scheduled);
      const isSelectedSingle =
        modifiers?.selected &&
        !modifiers?.range_start &&
        !modifiers?.range_end &&
        !modifiers?.range_middle;
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
              <div
                className="absolute bottom-0 left-0 right-0 flex translate-y-px justify-center gap-0.5 py-0.5"
                aria-hidden
              >
                {dots!.free && (
                  <span
                    className={cn(
                      "size-[0.3125rem] shrink-0 rounded-full",
                      isSelectedSingle
                        ? "bg-sky-300 dark:bg-sky-400"
                        : "bg-sky-600 dark:bg-sky-500"
                    )}
                    title="Свободный слот"
                  />
                )}
                {dots!.pending && (
                  <span
                    className={cn(
                      "size-[0.3125rem] shrink-0 rounded-full",
                      isSelectedSingle
                        ? "bg-amber-300 dark:bg-amber-300"
                        : "bg-amber-500 dark:bg-amber-400"
                    )}
                    title="Ожидает подтверждения"
                  />
                )}
                {dots!.scheduled && (
                  <span
                    className={cn(
                      "size-[0.3125rem] shrink-0 rounded-full",
                      isSelectedSingle
                        ? "bg-emerald-400 dark:bg-emerald-300"
                        : "bg-emerald-600 dark:bg-emerald-500"
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

  if (!mounted) {
    return (
      <div className="w-full min-w-0">
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:gap-4 max-md:grid-cols-2 md:grid-cols-[minmax(0,auto)_minmax(0,1fr)] md:grid-rows-[auto_auto] md:items-start">
          <div className="hidden md:block md:col-start-1 md:row-start-1" aria-hidden />
          <div className="min-w-0 md:flex md:flex-col md:gap-3 max-md:contents md:col-start-1 md:row-start-2">
            <div
              className="min-w-0 max-w-full overflow-x-clip rounded-md border border-border bg-muted/30 animate-pulse"
              style={{ minHeight: 320 }}
              aria-busy="true"
              aria-label="Загрузка календаря"
            />
            <div className="min-w-0 max-w-full space-y-2 overflow-x-clip">
              <div className="h-4 w-[75%] rounded-md bg-muted/30 animate-pulse" aria-hidden />
              <div className="h-20 rounded-md bg-muted/30 animate-pulse" aria-hidden />
              <div className="h-16 rounded-md bg-muted/30 animate-pulse" aria-hidden />
            </div>
          </div>
          <div className="min-w-0 max-md:col-span-2 max-md:space-y-2 md:contents">
            <div className="h-10 rounded-md bg-muted/30 animate-pulse md:col-start-2 md:row-start-1" aria-hidden />
            <div className="min-w-0 md:col-start-2 md:row-start-2 md:min-w-0">
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
            className="isolate grid w-full min-w-0 grid-cols-1 gap-3 md:gap-4 max-md:grid-cols-2 md:grid-cols-[minmax(0,auto)_minmax(0,1fr)] md:grid-rows-[auto_auto] md:items-start"
            style={{
              width: scaled ? 1008 : "100%",
              transform: scaled ? `scale(${scale})` : undefined,
              transformOrigin: "0 0"
            }}
          >
            {/* md+: верхний ряд — пустая лев. ячейка + переключатель недели; нижний — календарь|легенда слева, сетка справа */}
            <div className="hidden md:block md:col-start-1 md:row-start-1" aria-hidden />
            <div className="min-w-0 md:flex md:flex-col md:gap-3 max-md:contents md:col-start-1 md:row-start-2">
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
                  className="max-w-full min-w-0 max-md:[--cell-size:1.3rem] md:[--cell-size:2rem]"
                />
              </div>

              <div className="flex min-w-0 max-w-full flex-col gap-3 overflow-x-clip break-words">
                {holidaysThisMonth.length > 0 && (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="text-sm font-semibold text-foreground">
                      Праздничные дни
                      <span className="hidden sm:inline"> месяца</span>
                    </div>
                    <ul className="space-y-0.5">
                      {holidaysThisMonth.map(([md, title]) => {
                        const day = md.slice(3, 5);
                        return (
                          <li key={md} className="flex gap-2">
                            <span className="shrink-0 whitespace-nowrap tabular-nums text-left font-medium text-foreground">
                              {day}.{currentMonthKey}
                            </span>
                            <span className="min-w-0 break-words">{title}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="text-sm font-semibold text-foreground">
                    Условные обозначения
                  </div>
                  <ul className="space-y-0.5">
                    <li className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-3 w-3 shrink-0 rounded-sm border",
                          SLOT_STYLE_FREE
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0">Свободный слот</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-3 w-3 shrink-0 rounded-sm border",
                          SLOT_STYLE_PENDING
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0">Запись, ожидающая подтверждения</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-3 w-3 shrink-0 rounded-sm border",
                          SLOT_STYLE_CONFIRMED
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0">Подтверждённая запись</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

        {/* Неделя / суточный план: на md+ верхняя строка сетки — только переключатель, ниже — карточка */}
        <div className="min-w-0 max-md:col-span-2 max-md:space-y-2 md:contents">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:col-start-2 md:row-start-1">
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:justify-start sm:flex-initial">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  const next = addDays(currentDate, isMobileView ? -1 : -7);
                  setCurrentDate(next);
                  setDisplayedMonth(toFirstOfMonth(next));
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 truncate px-1 text-center text-sm font-medium sm:text-left">
                {isMobileView
                  ? currentDate.toLocaleDateString("ru-RU", {
                      weekday: "short",
                      day: "numeric",
                      month: "long"
                    })
                  : <>
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
                    </>
                }
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  const next = addDays(currentDate, isMobileView ? 1 : 7);
                  setCurrentDate(next);
                  setDisplayedMonth(toFirstOfMonth(next));
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="min-w-0 md:col-start-2 md:row-start-2 md:min-w-0">
          <div className={isMobileView ? "" : "overflow-x-auto overscroll-x-contain pb-2 [touch-action:pan-x_pan-y] md:overflow-visible md:pb-0"}>
          <Card className={cn("overflow-hidden rounded-lg border border-border", !isMobileView && "min-w-[1008px] md:min-w-0")}>
            <CardContent className="space-y-2 px-4 py-3">
          {loading ? (
            <ScheduleGridSkeleton />
          ) : (
            <>
                {!isMobileView && (
                  <div
                    className={cn(
                      "grid border-b border-border pb-2 text-xs text-muted-foreground",
                      "grid-cols-[64px,repeat(7,minmax(0,1fr))]"
                    )}
                  >
                    <div />
                    {displayDays.map(day => {
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
                            <div className="text-sm text-destructive">{holiday}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div ref={timeScrollRef}>
                  <div className={cn(
                    "grid text-xs",
                    isMobileView
                      ? "grid-cols-[48px,1fr]"
                      : "grid-cols-[64px,repeat(7,minmax(0,1fr))]"
                  )}>
                    {HOURS.map((hour, index) => {
                      const hourLabel = formatTimeLabel(hour);
                      const isLastRow = index === HOURS.length - 1;
                      return (
                        <div key={hour} className="contents">
                          <div className="border-r border-border pr-2 text-right align-top text-sm text-muted-foreground">
                            {hourLabel}
                          </div>

                          {displayDays.map((day, dayIndex) => {
                            const key = dayKey(day);
                            const daySlots = (slotsByDay[key] || []).filter(slot => {
                              const d = new Date(slot.start);
                              return d.getHours() === hour;
                            });
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

                                    const isPendingByPsychologist =
                                      slot.appointmentStatus === "PENDING_CONFIRMATION" &&
                                      slot.proposedByPsychologist === true;
                                    const pendingLabel = isPendingByPsychologist
                                      ? "ожидает подтверждения клиента"
                                      : "ожидает вашего подтверждения";

                                    const popupStatusText = (() => {
                                      if (!hasAppointment) {
                                        return "Свободный слот";
                                      }
                                      if (slot.appointmentStatus === "PENDING_CONFIRMATION") {
                                        return slot.clientName
                                          ? `${slot.clientName} (${pendingLabel})`
                                          : pendingLabel.charAt(0).toUpperCase() + pendingLabel.slice(1);
                                      }
                                      return slot.clientName || "Занято";
                                    })();

                                    const slotHeight = Math.max(20, heightPx);
                                    const canFitTwoLines = slotHeight >= MIN_SLOT_HEIGHT_FOR_TWO_LINES;
                                    const secondLineText = canFitTwoLines
                                      ? getSlotCalendarSecondLine(
                                          slot,
                                          hasAppointment,
                                          isPendingByPsychologist
                                        )
                                      : null;

                                    const tooltipTitle = popupStatusText;

                                    let slotToneClass = "";
                                    if (!hasAppointment) {
                                      slotToneClass = SLOT_STYLE_FREE;
                                    } else if (
                                      slot.appointmentStatus === "PENDING_CONFIRMATION"
                                    ) {
                                      slotToneClass = SLOT_STYLE_PENDING;
                                    } else {
                                      slotToneClass = SLOT_STYLE_CONFIRMED;
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
                                            className={cn(
                                              "absolute left-0 right-0 z-10 cursor-pointer touch-manipulation rounded-md border px-1.5 py-1 text-white shadow-sm",
                                              slotToneClass
                                            )}
                                            title={tooltipTitle}
                                            style={{
                                              top: topOffsetPx,
                                              height: slotHeight
                                            }}
                                            onClick={event => {
                                              event.stopPropagation();
                                            }}
                                          >
                                            <div className="text-xs font-medium leading-tight tabular-nums">
                                              {label}
                                            </div>
                                            {secondLineText ? (
                                              <div className="mt-0.5 line-clamp-2 break-words text-[11px] leading-tight text-white/90">
                                                {secondLineText}
                                              </div>
                                            ) : null}
                                          </div>
                                        </PopoverTrigger>
                                        <PopoverContent
                                          side={isMobileView ? "bottom" : "right"}
                                          align="start"
                                          className="w-72 space-y-3 text-xs"
                                          onOpenAutoFocus={e => e.preventDefault()}
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
                                              className="ml-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/90 bg-background/95 text-foreground shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                              onClick={() => setOpenSlotId(null)}
                                              aria-label="Закрыть"
                                            >
                                              <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                                            </button>
                                          </div>

                                          {!hasAppointment && (
                                            <SlotTimeEditor
                                              initialTime={initialTime}
                                              durationMinutes={durationMinutes}
                                              isUpdating={updatingId === slot.id}
                                              onSave={(time, dur) =>
                                                void handleUpdateSlotTime(slot, time, dur)
                                              }
                                              onDelete={() => void handleDeleteSlot(slot.id)}
                                            />
                                          )}

                                          {hasAppointment && (
                                            <div className="flex flex-col gap-2">
                                              {slot.appointmentStatus === "PENDING_CONFIRMATION" && (
                                                <>
                                                  <p className="text-xs text-muted-foreground">
                                                    {isPendingByPsychologist
                                                      ? "Клиент получил уведомление. Вы можете подтвердить вместо него, если клиент устно согласился."
                                                      : "Клиент запросил эту запись. Подтвердите или отмените её."}
                                                  </p>
                                                  <Button
                                                    size="sm"
                                                    className="h-8 w-full px-3 text-sm"
                                                    disabled={updatingId === slot.id}
                                                    onClick={() => void handleConfirmAppointment(slot)}
                                                  >
                                                    {isPendingByPsychologist
                                                      ? "Клиент подтвердил"
                                                      : "Подтвердить запись"}
                                                  </Button>
                                                </>
                                              )}
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-full px-3 text-sm"
                                                disabled={updatingId === slot.id}
                                                onClick={() => void handleCancelAppointment(slot)}
                                              >
                                                Отменить запись
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
        <DialogContent
          className="max-w-md"
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Новая запись</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreateAppointment}
            className="min-w-0 space-y-4 text-sm"
          >
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Дата</Label>
              <p className="text-sm font-medium">
                {createDateTime
                  ? createDateTime.toLocaleDateString("ru-RU", {
                      weekday: "long",
                      day: "numeric",
                      month: "long"
                    })
                  : "Не выбрана"}
              </p>
            </div>
            <div className="flex min-w-0 w-full flex-col gap-1">
              <Label className="text-xs">Время начала</Label>
              <TimeInput
                value={
                  createDateTime
                    ? `${String(createDateTime.getHours()).padStart(2, "0")}:${String(createDateTime.getMinutes()).padStart(2, "0")}`
                    : "09:00"
                }
                onChange={timeStr => {
                  const [h, m] = timeStr.split(":").map(Number);
                  const dt = new Date(createDateTime ?? Date.now());
                  dt.setHours(h ?? 0, m ?? 0, 0, 0);
                  setCreateDateTime(dt);
                }}
              />
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

