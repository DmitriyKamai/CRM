import { describe, expect, it } from "vitest";

import { parseLoginSessionUserAgent } from "@/lib/login-session-ua";

describe("parseLoginSessionUserAgent", () => {
  it("не дублирует тип устройства в подписи (без суффикса · mobile)", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.0.0 Mobile/15E148 Safari/604.1";
    const { deviceLabel } = parseLoginSessionUserAgent(ua);
    expect(deviceLabel).toBeTruthy();
    expect(deviceLabel).not.toMatch(/·\s*mobile\s*$/i);
  });

  it("desktop: браузер и ОС через разделитель", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(parseLoginSessionUserAgent(ua).deviceLabel).toMatch(/Chrome.*·.*Windows/i);
  });

  it("пустой UA", () => {
    expect(parseLoginSessionUserAgent(null)).toEqual({
      browser: null,
      os: null,
      deviceLabel: null
    });
  });
});
