/**
 * Настройки клиента — реэкспорт из {@link useUserSettings} с вариантом `client`.
 * @see hooks/use-user-settings.ts
 */
export type {
  ClientSettingsAccount,
  ClientSettingsProfile,
  PatchClientProfileBody
} from "@/hooks/use-user-settings";
export { useClientSettings } from "@/hooks/use-user-settings";
