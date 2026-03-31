import type { Prisma } from "@prisma/client";

import { ServerEncryptionAad } from "./constants";
import { decryptJsonValueFromStorage, encryptJsonValueForStorage } from "./crypto";

export function decryptCustomFieldValueFromDb(
  value: Prisma.JsonValue | null | undefined
): Prisma.JsonValue | null {
  if (value === null || value === undefined) return null;
  return decryptJsonValueFromStorage(value, ServerEncryptionAad.customFieldValue);
}

export function encryptCustomFieldValueForDb(
  value: Prisma.JsonValue
): Prisma.InputJsonValue {
  return encryptJsonValueForStorage(value, ServerEncryptionAad.customFieldValue);
}
