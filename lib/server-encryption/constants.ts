/** Маркер зашифрованного значения серверным AES-GCM (server encryption). */
export const SERVER_ENCRYPTED_MARKER = "_se" as const;

export const SERVER_ENCRYPTION_VERSION = 1 as const;

/** Контекст AAD: тип поля (стабильная строка для привязки ciphertext). */
export const ServerEncryptionAad = {
  clientProfileNotes: "ClientProfile.notes",
  recommendationTitle: "Recommendation.title",
  recommendationBody: "Recommendation.body",
  testResultInterpretation: "TestResult.interpretation",
  testResultRawAnswers: "TestResult.rawAnswers",
  testResultScaleScores: "TestResult.scaleScores",
  customFieldValue: "CustomFieldValue.value",
  appointmentNotes: "Appointment.notes"
} as const;
