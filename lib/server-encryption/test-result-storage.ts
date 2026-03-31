import type { Prisma } from "@prisma/client";

import { ServerEncryptionAad } from "./constants";
import {
  decryptJsonValueFromStorage,
  decryptStringFromStorage,
  encryptJsonValueForStorage,
  encryptStringForStorage
} from "./crypto";

export function encryptTestResultInterpretationForDb(
  plain: string | null | undefined
): string | null {
  return encryptStringForStorage(plain, ServerEncryptionAad.testResultInterpretation);
}

export function decryptTestResultInterpretationFromDb(
  stored: string | null | undefined
): string | null {
  return decryptStringFromStorage(stored, ServerEncryptionAad.testResultInterpretation);
}

export function encryptTestResultRawAnswersForDb(
  value: Prisma.JsonValue
): Prisma.InputJsonValue {
  return encryptJsonValueForStorage(value, ServerEncryptionAad.testResultRawAnswers);
}

export function decryptTestResultRawAnswersFromDb(
  value: Prisma.JsonValue | null | undefined
): Prisma.JsonValue | null {
  return decryptJsonValueFromStorage(value, ServerEncryptionAad.testResultRawAnswers);
}

export function encryptTestResultScaleScoresForDb(
  value: Prisma.JsonValue
): Prisma.InputJsonValue {
  return encryptJsonValueForStorage(value, ServerEncryptionAad.testResultScaleScores);
}

export function decryptTestResultScaleScoresFromDb(
  value: Prisma.JsonValue | null | undefined
): Prisma.JsonValue | null {
  return decryptJsonValueFromStorage(value, ServerEncryptionAad.testResultScaleScores);
}
