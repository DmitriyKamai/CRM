import { ServerEncryptionAad } from "./constants";
import { decryptStringFromStorage, encryptStringForStorage } from "./crypto";

export function encryptClientNotesForDb(plain: string | null | undefined): string | null {
  return encryptStringForStorage(plain, ServerEncryptionAad.clientProfileNotes);
}

export function decryptClientNotesFromDb(stored: string | null | undefined): string | null {
  return decryptStringFromStorage(stored, ServerEncryptionAad.clientProfileNotes);
}
