/** Ключи TanStack Query для экрана настроек клиента (профиль + привязанные аккаунты). */
export const clientSettingsKeys = {
  all: ["client", "settings"] as const,
  profile: () => [...clientSettingsKeys.all, "profile"] as const,
  accounts: () => [...clientSettingsKeys.all, "accounts"] as const
};
