/** Ключи TanStack Query для настроек профиля психолога (профиль + привязанные аккаунты). */
export const profileSettingsKeys = {
  all: ["psychologist", "settings"] as const,
  profile: () => [...profileSettingsKeys.all, "profile"] as const,
  accounts: () => [...profileSettingsKeys.all, "accounts"] as const
};
