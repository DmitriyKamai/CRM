import { isServerEncryptedEnvelopeV1 } from "./crypto";

/** Строковое поле в БД ещё не в формате envelope v1. */
export function stringFieldNeedsEncryption(stored: string | null): boolean {
  if (stored == null || stored === "") return false;
  try {
    const parsed: unknown = JSON.parse(stored);
    return !isServerEncryptedEnvelopeV1(parsed);
  } catch {
    return true;
  }
}

/** JSON-поле (Prisma Json) ещё не зашифровано верхним уровнем envelope. */
export function jsonFieldNeedsEncryption(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return !isServerEncryptedEnvelopeV1(value);
}
