import { randomBytes } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  sealGoogleSheetsRefreshToken,
  unsealGoogleSheetsRefreshToken
} from "@/lib/google-sheets-refresh-token-crypto";

describe("google-sheets-refresh-token-crypto", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("без ключа сохраняет и читает открытый токен", () => {
    vi.stubEnv("GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY", "");
    const t = "1//0abc-def_ghi";
    expect(sealGoogleSheetsRefreshToken(t)).toBe(t);
    expect(unsealGoogleSheetsRefreshToken(t)).toBe(t);
  });

  it("с ключом шифрует и расшифровывает", () => {
    const keyB64 = randomBytes(32).toString("base64");
    vi.stubEnv("GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY", keyB64);
    const t = "1//0secret_refresh_token_value";
    const sealed = sealGoogleSheetsRefreshToken(t);
    expect(sealed).not.toBe(t);
    expect(sealed?.startsWith("gs:v1:")).toBe(true);
    expect(unsealGoogleSheetsRefreshToken(sealed)).toBe(t);
  });

  it("неподходящая длина ключа — без шифрования", () => {
    vi.stubEnv("GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY", Buffer.from("short").toString("base64"));
    const t = "plain";
    expect(sealGoogleSheetsRefreshToken(t)).toBe(t);
  });

  it("null и пустая строка", () => {
    vi.stubEnv("GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
    expect(sealGoogleSheetsRefreshToken(null)).toBeNull();
    expect(unsealGoogleSheetsRefreshToken(null)).toBeNull();
    expect(unsealGoogleSheetsRefreshToken("  ")).toBeNull();
  });
});
