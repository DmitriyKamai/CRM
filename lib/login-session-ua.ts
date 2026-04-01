import { UAParser } from "ua-parser-js";

/**
 * Поля для AuthLoginSession: браузер, ОС и подпись для UI.
 * Тип устройства (mobile/tablet) в подпись не включаем — он показан отдельно (иконка + «Телефон»).
 */
export function parseLoginSessionUserAgent(uaRaw: string | null): {
  browser: string | null;
  os: string | null;
  deviceLabel: string | null;
} {
  if (!uaRaw?.trim()) {
    return { browser: null, os: null, deviceLabel: null };
  }
  const p = new UAParser(uaRaw);
  const browser = [p.getBrowser().name, p.getBrowser().version?.split(".")[0]]
    .filter(Boolean)
    .join(" ")
    .trim();
  const os = [p.getOS().name, p.getOS().version?.split(".")[0]]
    .filter(Boolean)
    .join(" ")
    .trim();
  const deviceLabel = [browser || "Браузер", os || null].filter(Boolean).join(" · ");
  return {
    browser: browser || null,
    os: os || null,
    deviceLabel: deviceLabel || null
  };
}
