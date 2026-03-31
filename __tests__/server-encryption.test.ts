import crypto from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Prisma } from "@prisma/client";

import { ServerEncryptionAad } from "@/lib/server-encryption/constants";
import {
  decryptJsonValueFromStorage,
  decryptStringFromStorage,
  encryptJsonValueForStorage,
  encryptStringForStorage
} from "@/lib/server-encryption/crypto";
import { __resetDataEncryptionKeyCacheForTests } from "@/lib/server-encryption/key-provider";

describe("server-encryption", () => {
  beforeAll(() => {
    process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  });

  afterAll(() => {
    __resetDataEncryptionKeyCacheForTests();
    delete process.env.DATA_ENCRYPTION_KEY;
  });

  it("roundtrip строки с AAD", () => {
    const aad = ServerEncryptionAad.clientProfileNotes;
    const enc = encryptStringForStorage("текст заметки", aad);
    expect(enc).toBeTruthy();
    expect(decryptStringFromStorage(enc, aad)).toBe("текст заметки");
  });

  it("legacy plaintext строки без envelope возвращается как есть", () => {
    const aad = ServerEncryptionAad.clientProfileNotes;
    expect(decryptStringFromStorage("обычный текст", aad)).toBe("обычный текст");
  });

  it("roundtrip JSON-поля", () => {
    const aad = ServerEncryptionAad.customFieldValue;
    const payload = { n: 1, s: "x", arr: [true, null] };
    const enc = encryptJsonValueForStorage(payload, aad);
    expect(decryptJsonValueFromStorage(enc as Prisma.JsonValue, aad)).toEqual(payload);
  });

  it("legacy JSON без маркера возвращается как есть", () => {
    const aad = ServerEncryptionAad.customFieldValue;
    const legacy = { plain: true };
    expect(decryptJsonValueFromStorage(legacy, aad)).toEqual(legacy);
  });
});
