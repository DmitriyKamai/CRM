import { describe, expect, it } from "vitest";

import { LOGIN_SESSION_KEY_CLAIM } from "@/lib/login-session-key";
import { getLoginSessionKeyFromJwtPayload } from "@/lib/login-session-jwt";

describe("getLoginSessionKeyFromJwtPayload", () => {
  it("читает ключ по имени claim", () => {
    expect(
      getLoginSessionKeyFromJwtPayload({
        [LOGIN_SESSION_KEY_CLAIM]: "abc-123"
      })
    ).toBe("abc-123");
  });

  it("null при отсутствии или пустой строке", () => {
    expect(getLoginSessionKeyFromJwtPayload(null)).toBeNull();
    expect(getLoginSessionKeyFromJwtPayload({})).toBeNull();
    expect(
      getLoginSessionKeyFromJwtPayload({ [LOGIN_SESSION_KEY_CLAIM]: "" })
    ).toBeNull();
  });
});
