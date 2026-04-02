/** Единые ключи TanStack Query для данных настроек пользователя (профиль + аккаунты). */
export const userSettingsKeys = {
  all: ["user", "settings"] as const,
  profile: () => [...userSettingsKeys.all, "profile"] as const,
  accounts: () => [...userSettingsKeys.all, "accounts"] as const
};
