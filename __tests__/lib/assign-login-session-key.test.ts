import { afterEach, describe, expect, it } from "vitest";

import { assignLoginSessionKeyIfMissing } from "@/lib/auth-login-session";

type JwtLike = Parameters<typeof assignLoginSessionKeyIfMissing>[0];

describe("assignLoginSessionKeyIfMissing", () => {
  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;
  });

  it("при свежем входе задаёт UUID-подобный ключ", () => {
    const token = {} as JwtLike;
    assignLoginSessionKeyIfMissing(token, "user-1", true);
    expect(token.loginSessionKey).toBeDefined();
    expect(token.loginSessionKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("без свежего входа и с iat + секретом — детерминированный sha256 hex", () => {
    process.env.NEXTAUTH_SECRET = "unit-test-secret";
    const token = { iat: 1_700_000_000 } as JwtLike;
    assignLoginSessionKeyIfMissing(token, "user-1", false);
    expect(token.loginSessionKey).toHaveLength(64);
    expect(token.loginSessionKey).toMatch(/^[0-9a-f]{64}$/);

    const token2 = { iat: 1_700_000_000 } as JwtLike;
    assignLoginSessionKeyIfMissing(token2, "user-1", false);
    expect(token2.loginSessionKey).toBe(token.loginSessionKey);
  });

  it("не перезаписывает существующий ключ", () => {
    const token = { loginSessionKey: "existing-key" } as JwtLike;
    assignLoginSessionKeyIfMissing(token, "user-1", true);
    expect(token.loginSessionKey).toBe("existing-key");
  });
});
