import { describe, expect, it } from "vitest";

import { deviceFormFactorFromUserAgent } from "@/lib/device-form-factor";

describe("deviceFormFactorFromUserAgent", () => {
  it("desktop: Chrome Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(deviceFormFactorFromUserAgent(ua)).toBe("desktop");
  });

  it("mobile: iPhone Safari", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(deviceFormFactorFromUserAgent(ua)).toBe("mobile");
  });

  it("tablet: iPad", () => {
    const ua =
      "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
    expect(deviceFormFactorFromUserAgent(ua)).toBe("tablet");
  });

  it("unknown при пустом UA", () => {
    expect(deviceFormFactorFromUserAgent(null)).toBe("unknown");
    expect(deviceFormFactorFromUserAgent("")).toBe("unknown");
  });
});
