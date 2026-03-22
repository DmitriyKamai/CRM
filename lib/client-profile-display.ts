/** Подписи полей профиля для ленты истории (сервер). */

export function formatDobHistory(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("ru-RU");
}

export function formatGenderHistory(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const m: Record<string, string> = {
    male: "Мужской",
    female: "Женский",
    other: "Другое"
  };
  return m[value] ?? value;
}

export function formatMaritalHistory(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const m: Record<string, string> = {
    single: "Не в браке",
    married: "В браке",
    divorced: "В разводе",
    widowed: "Вдовец / Вдова",
    unspecified: "Не указано"
  };
  return m[value] ?? value;
}

const FIELD_LABELS: Record<string, string> = {
  firstName: "Имя",
  lastName: "Фамилия",
  dateOfBirth: "Дата рождения",
  phone: "Телефон",
  country: "Страна",
  city: "Город",
  gender: "Пол",
  maritalStatus: "Семейное положение",
  notes: "Заметки",
  email: "Email"
};

export function profileFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}
