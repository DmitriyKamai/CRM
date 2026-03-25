import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/** Префикс зашифрованных значений в БД (AES-256-GCM). */
const CIPHER_PREFIX = "gs:v1:";

const KEY_BYTES = 32;

function getEncryptionKey(): Buffer | null {
  const b64 = process.env.GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY?.trim();
  if (!b64) return null;
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    console.warn(
      "[google-sheets-token] GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY: неверный Base64 — токен хранится без шифрования."
    );
    return null;
  }
  if (buf.length !== KEY_BYTES) {
    console.warn(
      "[google-sheets-token] GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY: нужен Base64 ровно от 32 байт (AES-256). Сейчас токен хранится без шифрования."
    );
    return null;
  }
  return buf;
}

/**
 * Сохранить refresh-токен в БД: при заданном `GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY` — AES-256-GCM, иначе как есть (dev/наследие).
 */
export function sealGoogleSheetsRefreshToken(plaintext: string | null): string | null {
  if (plaintext == null || plaintext === "") return null;
  const key = getEncryptionKey();
  if (!key) return plaintext;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, enc]);
  return `${CIPHER_PREFIX}${packed.toString("base64url")}`;
}

/**
 * Восстановить refresh-токен после чтения из БД: расшифровка или legacy-открытый текст.
 */
export function unsealGoogleSheetsRefreshToken(stored: string | null): string | null {
  if (stored == null || stored === "") return null;
  const trimmed = stored.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith(CIPHER_PREFIX)) {
    return trimmed;
  }

  const key = getEncryptionKey();
  if (!key) {
    console.warn(
      "[google-sheets-token] в БД зашифрованный токен (gs:v1:), задайте тот же GOOGLE_SHEETS_TOKEN_ENCRYPTION_KEY или отключите Google и подключите снова без ключа."
    );
    return null;
  }

  const raw = Buffer.from(trimmed.slice(CIPHER_PREFIX.length), "base64url");
  if (raw.length < 12 + 16) {
    console.error("[google-sheets-token] повреждённое зашифрованное значение");
    return null;
  }
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return plain || null;
  } catch (e) {
    console.error("[google-sheets-token] не удалось расшифровать (сменили ключ?)", e);
    return null;
  }
}
