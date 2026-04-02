/** Ключи TanStack Query для уведомлений текущего пользователя. */
export const notificationsKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationsKeys.all, "list"] as const
};
