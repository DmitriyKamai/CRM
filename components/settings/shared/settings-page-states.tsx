/** Текст загрузки экрана настроек (клиент и психолог). */
export const SETTINGS_LOADING_MESSAGE = "Загрузка настроек…";

export function SettingsFormLoadingState() {
  return (
    <div className="text-sm text-muted-foreground py-8">{SETTINGS_LOADING_MESSAGE}</div>
  );
}

export function SettingsFormErrorState({
  variant = "default"
}: {
  /** `network` — с подсказкой про подключение (как у психолога при пустом профиле). */
  variant?: "default" | "network";
}) {
  const text =
    variant === "network"
      ? "Не удалось загрузить настройки. Проверьте подключение и обновите страницу."
      : "Не удалось загрузить настройки. Обновите страницу.";
  return <div className="text-sm text-muted-foreground py-8">{text}</div>;
}
