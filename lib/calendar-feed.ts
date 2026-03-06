import { createHmac, timingSafeEqual } from "crypto";

const ALG = "sha256";
const SEP = ".";

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Buffer | null {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

function getSecret(): string {
  const secret =
    process.env.CALENDAR_FEED_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Calendar feed: CALENDAR_FEED_SECRET or NEXTAUTH_SECRET required");
  }
  return secret;
}

/** Создаёт токен для ссылки на фид календаря психолога (без хранения в БД). */
export function createCalendarFeedToken(psychologistProfileId: string): string {
  const secret = getSecret();
  const payload = Buffer.from(psychologistProfileId, "utf8");
  const sig = createHmac(ALG, secret).update(payload).digest();
  return base64UrlEncode(payload) + SEP + base64UrlEncode(sig);
}

/** Проверяет токен и возвращает id профиля психолога или null. */
export function verifyCalendarFeedToken(token: string): string | null {
  const secret = getSecret();
  const i = token.indexOf(SEP);
  if (i <= 0 || i === token.length - 1) return null;
  const payloadB64 = token.slice(0, i);
  const sigB64 = token.slice(i + 1);
  const payload = base64UrlDecode(payloadB64);
  const sig = base64UrlDecode(sigB64);
  if (!payload || !sig) return null;
  const expected = createHmac(ALG, secret).update(payload).digest();
  if (expected.length !== sig.length || !timingSafeEqual(expected, sig)) return null;
  return payload.toString("utf8");
}

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
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
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
