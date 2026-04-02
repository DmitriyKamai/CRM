/** Варианты специализации в профессиональном профиле психолога */
export const PROFESSION_OPTIONS: { value: string; label: string }[] = [
  { value: "psychologist", label: "Психолог" },
  { value: "psychotherapist", label: "Врач-психотерапевт" },
  { value: "psychiatrist", label: "Психиатр" }
];

const PROFESSION_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  PROFESSION_OPTIONS.map((o) => [o.value, o.label])
);

/** Подпись специализации для UI (шапка, карточки) по значению из профиля. */
export function getProfessionDisplayLabel(specialization: string | null | undefined): string {
  if (!specialization?.trim()) return "Специалист";
  return PROFESSION_LABEL_BY_VALUE[specialization.trim()] ?? "Специалист";
}

/** Максимум символов в блоке «О себе» профессионального профиля */
export const BIO_MAX_LENGTH = 1500;
