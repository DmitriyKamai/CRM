/**
 * Показ контактов психолога в публичном профиле: человекочитаемо, не «сырая» строка из БД.
 */

/** @returns Напр. @username для https://t.me/username и @nick для ввода «nick». */
export function formatTelegramForDisplay(raw: string): string {
  const v = raw.trim();
  if (!v) return "";

  if (v.startsWith("@")) {
    return v;
  }

  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      const host = u.hostname.toLowerCase();
      if (host === "t.me" || host === "telegram.me" || host === "www.t.me") {
        const first = u.pathname.replace(/^\//, "").split("/").filter(Boolean)[0] ?? "";
        if (
          first &&
          !first.startsWith("+") &&
          first.toLowerCase() !== "joinchat" &&
          first.toLowerCase() !== "addstickers" &&
          !first.startsWith("s/")
        ) {
          if (/^[a-zA-Z0-9_]{1,32}$/.test(first)) {
            return `@${first}`;
          }
        }
      }
    } catch {
      // не URL
    }
    return v;
  }

  if (/^t\.me\//i.test(v)) {
    return formatTelegramForDisplay(`https://${v}`);
  }

  const noAt = v.replace(/^@+/, "");
  if (/^[a-zA-Z0-9_]{1,32}$/.test(noAt)) {
    return `@${noAt}`;
  }
  return v;
}

/**
 * Номер для вставки в мессенджер / набор: цифры и один ведущий «+».
 */
export function normalizePhoneForCopy(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("+")) {
    const digits = t.slice(1).replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }
  return t.replace(/\D/g, "");
}
