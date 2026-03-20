/** Сборка ICS-файла. Токен подписки — только через `CalendarFeedToken` в БД (`lib/calendar-feed-token.ts`). */

/** Форматирует дату в формат iCalendar (UTC). */
function icsDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

/** Экранирует строку для поля ICS (переносы и запятые). */
function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

type SlotForIcs = {
  id: string;
  start: Date;
  end: Date;
  summary: string;
};

/** Собирает ICS-календарь из списка слотов. */
export function buildIcs(slots: SlotForIcs[], calendarName = "Расписание"): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CRM//Calendar//RU",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:" + icsEscape(calendarName)
  ];

  for (const slot of slots) {
    const uid = `slot-${slot.id}@crm`;
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTART:" + icsDate(slot.start),
      "DTEND:" + icsDate(slot.end),
      "SUMMARY:" + icsEscape(slot.summary),
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
