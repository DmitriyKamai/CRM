export type PasswordChecks = {
  length: boolean;
  letters: boolean;
  digits: boolean;
  special: boolean;
};

export type PasswordRequirement = { key: keyof PasswordChecks; text: string };

export const SETTINGS_PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: "length", text: "Не менее 8 символов" },
  { key: "letters", text: "Буквы (A–Z, а–я)" },
  { key: "digits", text: "Цифры" },
  { key: "special", text: "Спецсимволы (!, ?, % и т.п.)" }
];

export function evaluatePasswordRules(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    letters: /[A-Za-zА-Яа-я]/.test(password),
    digits: /\d/.test(password),
    special: /[^A-Za-zА-Яа-я0-9\s]/.test(password)
  };
}

export function getPasswordValidationError(password: string, checks: PasswordChecks): string | null {
  if (password.length === 0) return null;
  if (!checks.length) return "Пароль должен быть не короче 8 символов";
  if (!checks.letters) return "Пароль должен содержать буквы";
  if (!checks.digits) return "Пароль должен содержать цифры";
  if (!checks.special) return "Добавьте специальный символ (например, !, ?, %)";
  return null;
}
