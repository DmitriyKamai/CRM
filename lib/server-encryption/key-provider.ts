import { createHash } from "crypto";

let cachedKey: Buffer | null = null;

/**
 * Возвращает 32-байтовый ключ AES-256.
 * v1: из переменной DATA_ENCRYPTION_KEY (base64, 32 байта после декодирования).
 * В будущем: заменить реализацию на unwrap из KMS без смены формата ciphertext.
 */
export function getDataEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const b64 = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (!b64) {
    throw new Error(
      "DATA_ENCRYPTION_KEY не задан. Сгенерируйте: openssl rand -base64 32 и добавьте в .env"
    );
  }

  let raw: Buffer;
  try {
    raw = Buffer.from(b64, "base64");
  } catch {
    throw new Error("DATA_ENCRYPTION_KEY: неверный base64");
  }

  if (raw.length === 32) {
    cachedKey = raw;
    return cachedKey;
  }

  // Допускаем ключ произвольной длины: деривация до 32 байт (удобство миграций).
  if (raw.length < 16) {
    throw new Error(
      "DATA_ENCRYPTION_KEY после base64 должен быть не короче 16 байт (рекомендуется ровно 32)"
    );
  }

  cachedKey = createHash("sha256").update(raw).digest();
  return cachedKey;
}

/** Сброс кэша ключа (только для тестов). */
export function __resetDataEncryptionKeyCacheForTests(): void {
  cachedKey = null;
}
