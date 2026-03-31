import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";

import { SERVER_ENCRYPTED_MARKER, SERVER_ENCRYPTION_VERSION } from "./constants";
import { getDataEncryptionKey } from "./key-provider";

const ALG = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export type ServerEncryptedEnvelopeV1 = {
  [SERVER_ENCRYPTED_MARKER]: 1;
  v: typeof SERVER_ENCRYPTION_VERSION;
  iv: string;
  ct: string;
  tag: string;
};

export function isServerEncryptedEnvelopeV1(x: unknown): x is ServerEncryptedEnvelopeV1 {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    o[SERVER_ENCRYPTED_MARKER] === 1 &&
    o.v === SERVER_ENCRYPTION_VERSION &&
    typeof o.iv === "string" &&
    typeof o.ct === "string" &&
    typeof o.tag === "string"
  );
}

/**
 * Шифрует UTF-8 строку. Пустая строка сохраняется как envelope с пустым ciphertext.
 */
export function encryptStringForStorage(
  plain: string | null | undefined,
  aadLabel: string
): string | null {
  if (plain === undefined || plain === null) return null;

  const key = getDataEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALG, key, iv, { authTagLength: TAG_LENGTH });
  cipher.setAAD(Buffer.from(aadLabel, "utf8"));

  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const env: ServerEncryptedEnvelopeV1 = {
    [SERVER_ENCRYPTED_MARKER]: 1,
    v: SERVER_ENCRYPTION_VERSION,
    iv: iv.toString("base64"),
    ct: ct.toString("base64"),
    tag: tag.toString("base64")
  };
  return JSON.stringify(env);
}

/**
 * Расшифровывает строку из БД. Legacy plaintext (не JSON envelope) возвращается как есть.
 */
export function decryptStringFromStorage(
  stored: string | null | undefined,
  aadLabel: string
): string | null {
  if (stored === undefined || stored === null) return null;
  if (stored === "") return "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored) as unknown;
  } catch {
    return stored;
  }

  if (!isServerEncryptedEnvelopeV1(parsed)) {
    return stored;
  }

  const key = getDataEncryptionKey();
  const iv = Buffer.from(parsed.iv, "base64");
  const ct = Buffer.from(parsed.ct, "base64");
  const tag = Buffer.from(parsed.tag, "base64");

  const decipher = createDecipheriv(ALG, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAAD(Buffer.from(aadLabel, "utf8"));
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf8");
}

/**
 * JSON-значение Prisma: сериализует в строку, шифрует, кладёт envelope-объект в Json.
 */
export function encryptJsonValueForStorage(
  value: Prisma.JsonValue,
  aadLabel: string
): Prisma.InputJsonValue {
  if (value === null || typeof value === "undefined") {
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }

  const plain = JSON.stringify(value);
  const wrapped = encryptStringForStorage(plain, aadLabel);
  if (wrapped === null) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;

  let outer: unknown;
  try {
    outer = JSON.parse(wrapped) as unknown;
  } catch {
    throw new Error("encryptJsonValueForStorage: внутренняя ошибка сериализации");
  }
  if (!isServerEncryptedEnvelopeV1(outer)) {
    throw new Error("encryptJsonValueForStorage: ожидался envelope");
  }
  return outer as Prisma.InputJsonValue;
}

/**
 * Если значение — envelope v1, расшифровывает и парсит JSON. Иначе возвращает как есть (legacy).
 */
export function decryptJsonValueFromStorage(
  value: Prisma.JsonValue | null | undefined,
  aadLabel: string
): Prisma.JsonValue | null {
  if (value === null || typeof value === "undefined") {
    return value === undefined ? null : null;
  }

  if (!isServerEncryptedEnvelopeV1(value)) {
    return value;
  }

  const fakeString = JSON.stringify(value);
  const decrypted = decryptStringFromStorage(fakeString, aadLabel);
  if (decrypted === null || decrypted === "") {
    return null;
  }
  try {
    return JSON.parse(decrypted) as Prisma.JsonValue;
  } catch {
    return null;
  }
}
