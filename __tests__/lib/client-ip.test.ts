import { describe, expect, it } from "vitest";

import {
  getClientIpFromHeaderRecord,
  getClientIpFromRequest,
  isNonPublicClientIp
} from "@/lib/client-ip";

describe("client-ip", () => {
  it("getClientIpFromHeaderRecord берёт первый из x-forwarded-for", () => {
    expect(
      getClientIpFromHeaderRecord({
        "x-forwarded-for": "203.0.113.1, 10.0.0.1"
      })
    ).toBe("203.0.113.1");
  });

  it("isNonPublicClientIp: IPv4-mapped localhost", () => {
    expect(isNonPublicClientIp("::ffff:127.0.0.1")).toBe(true);
  });

  it("isNonPublicClientIp: публичный IPv4", () => {
    expect(isNonPublicClientIp("203.0.113.55")).toBe(false);
  });

  it("isNonPublicClientIp: ULA IPv6", () => {
    expect(isNonPublicClientIp("fd00::1")).toBe(true);
  });

  it("isNonPublicClientIp: link-local IPv6", () => {
    expect(isNonPublicClientIp("fe80::1")).toBe(true);
  });

  it("getClientIpFromRequest согласован с Record", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "198.51.100.2" }
    });
    expect(getClientIpFromRequest(req)).toBe("198.51.100.2");
  });
});
