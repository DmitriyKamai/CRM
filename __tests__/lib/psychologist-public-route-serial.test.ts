import { describe, expect, it } from "vitest";

import { psychologistPublicProfilePath } from "@/lib/psychologist-public-profile-path";
import { parsePublicRouteSerialFromSegment } from "@/lib/psychologist-public-route-serial";

describe("parsePublicRouteSerialFromSegment", () => {
  it("разбирает id1 и ID42", () => {
    expect(parsePublicRouteSerialFromSegment("id1")).toBe(1);
    expect(parsePublicRouteSerialFromSegment("ID42")).toBe(42);
  });

  it("возвращает null для не-serial сегментов", () => {
    expect(parsePublicRouteSerialFromSegment("ivan")).toBeNull();
    expect(parsePublicRouteSerialFromSegment("id")).toBeNull();
    expect(parsePublicRouteSerialFromSegment("id0")).toBeNull();
  });
});

describe("psychologistPublicProfilePath", () => {
  it("без алиаса — /id{N}", () => {
    expect(
      psychologistPublicProfilePath({ publicSlug: null, publicRouteSerial: 7 })
    ).toBe("/id7");
  });

  it("с алиасом — /slug", () => {
    expect(
      psychologistPublicProfilePath({ publicSlug: "emma", publicRouteSerial: 3 })
    ).toBe("/emma");
  });
});
