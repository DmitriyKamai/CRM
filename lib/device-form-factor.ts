import { UAParser } from "ua-parser-js";

export type DeviceFormFactor = "desktop" | "mobile" | "tablet" | "unknown";

/** Тип устройства по User-Agent для списка сессий. */
export function deviceFormFactorFromUserAgent(
  ua: string | null | undefined
): DeviceFormFactor {
  if (!ua?.trim()) return "unknown";
  const type = new UAParser(ua).getDevice().type;
  if (type === "mobile" || type === "wearable") return "mobile";
  if (type === "tablet") return "tablet";
  if (type === "smarttv" || type === "embedded" || type === "console") return "desktop";
  return "desktop";
}
