import { ServerEncryptionAad } from "./constants";
import { decryptStringFromStorage, encryptStringForStorage } from "./crypto";

/** Поле Appointment.notes в схеме есть; в API v1 записи без заметок — хелперы для будущих маршрутов. */
export function encryptAppointmentNotesForDb(plain: string | null | undefined): string | null {
  return encryptStringForStorage(plain, ServerEncryptionAad.appointmentNotes);
}

export function decryptAppointmentNotesFromDb(stored: string | null | undefined): string | null {
  return decryptStringFromStorage(stored, ServerEncryptionAad.appointmentNotes);
}
