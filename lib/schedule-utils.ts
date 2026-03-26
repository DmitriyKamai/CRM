export type SlotStatus = "FREE" | "BOOKED" | "CANCELED";
export type AppointmentStatus = "PENDING_CONFIRMATION" | "SCHEDULED" | null;
export type ApiErrorBody = { message?: string } | null;

export type SlotDto = {
  id: string;
  start: string;
  end: string;
  status: SlotStatus;
  appointmentId?: string | null;
  appointmentStatus?: AppointmentStatus;
  clientId?: string | null;
  clientName?: string | null;
  proposedByPsychologist?: boolean;
};

export type ClientOption = {
  id: string;
  firstName: string;
  lastName: string;
  hasAccount?: boolean;
};

export const HOLIDAYS_BY_MONTH_DAY: Record<string, string> = {
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

export const HOURS: number[] = Array.from({ length: 24 }, (_, i) => i);

export const HOUR_ROW_HEIGHT = 56;

export const MIN_SLOT_HEIGHT_FOR_TWO_LINES = 36;

export const SLOT_STYLE_FREE =
  "bg-sky-600 border-sky-700 dark:bg-sky-500 dark:border-sky-400";
export const SLOT_STYLE_PENDING =
  "bg-orange-700 border-orange-800 dark:bg-orange-600 dark:border-orange-700";
export const SLOT_STYLE_CONFIRMED =
  "bg-emerald-600 border-emerald-700 dark:bg-emerald-500 dark:border-emerald-400";

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getTime());
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

export function formatTimeLabel(hour: number): string {
  const hh = hour < 10 ? `0${hour}` : String(hour);
  return `${hh}:00`;
}

export function formatHumanRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const hStart = String(start.getHours()).padStart(2, "0");
  const mStart = String(start.getMinutes()).padStart(2, "0");
  const hEnd = String(end.getHours()).padStart(2, "0");
  const mEnd = String(end.getMinutes()).padStart(2, "0");
  return `${hStart}:${mStart}–${hEnd}:${mEnd}`;
}

export function getClientProfileHref(clientId?: string | null): string | null {
  if (!clientId) return null;
  return `/psychologist/clients/${clientId}`;
}

export function getSlotCalendarSecondLine(
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

export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function toFirstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function getSlotToneClass(slot: SlotDto): string {
  const hasAppointment = Boolean(slot.appointmentId);
  if (!hasAppointment) return SLOT_STYLE_FREE;
  if (slot.appointmentStatus === "PENDING_CONFIRMATION") return SLOT_STYLE_PENDING;
  return SLOT_STYLE_CONFIRMED;
}
