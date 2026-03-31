import { ServerEncryptionAad } from "./constants";
import { decryptStringFromStorage, encryptStringForStorage } from "./crypto";

export function encryptRecommendationTitleForDb(plain: string | null | undefined): string {
  const enc = encryptStringForStorage(plain ?? "", ServerEncryptionAad.recommendationTitle);
  return enc ?? "";
}

export function decryptRecommendationTitleFromDb(stored: string | null | undefined): string {
  return decryptStringFromStorage(stored ?? "", ServerEncryptionAad.recommendationTitle) ?? "";
}

export function encryptRecommendationBodyForDb(plain: string | null | undefined): string {
  const enc = encryptStringForStorage(plain ?? "", ServerEncryptionAad.recommendationBody);
  return enc ?? "";
}

export function decryptRecommendationBodyFromDb(stored: string | null | undefined): string {
  return decryptStringFromStorage(stored ?? "", ServerEncryptionAad.recommendationBody) ?? "";
}
