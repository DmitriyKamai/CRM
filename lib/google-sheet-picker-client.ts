/**
 * Окно Google Picker (только таблицы). Нужен access token с сервера.
 * Рекомендуется NEXT_PUBLIC_GOOGLE_API_KEY — ключ API в Google Cloud (ограничение по HTTP referrer).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type G = any;

export function openGoogleSheetsPicker(options: {
  accessToken: string;
  developerKey?: string;
  onPicked: (spreadsheetId: string) => void;
  onCancel?: () => void;
  onError: (message: string) => void;
}): void {
  const { accessToken, developerKey, onPicked, onCancel, onError } = options;

  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Не удалось загрузить скрипт Google API"));
      document.head.appendChild(s);
    });
  }

  void (async () => {
    try {
      await loadScript("https://apis.google.com/js/api.js");
      const gapi = (window as G).gapi;
      await new Promise<void>((resolve, reject) => {
        gapi.load("picker", {
          callback: () => resolve(),
          onerror: () => reject(new Error("Не удалось загрузить Google Picker"))
        });
      });

      const google: G = (window as G).google;
      const p = google.picker;
      const sheetsView = new p.DocsView(p.ViewId.SPREADSHEETS);
      const b = new p.PickerBuilder()
        .addView(sheetsView)
        .setOAuthToken(accessToken);
      if (developerKey?.trim()) {
        b.setDeveloperKey(developerKey.trim());
      }
      if (typeof b.setLocale === "function") {
        b.setLocale("ru");
      }
      b.setCallback((data: G) => {
        const action = data[p.Response.ACTION];
        if (action === p.Action.CANCEL) {
          onCancel?.();
          return;
        }
        if (action === p.Action.PICKED) {
          const docs = data[p.Response.DOCUMENTS] as G[];
          const id = docs?.[0]?.[p.Document.ID] as string | undefined;
          if (id) onPicked(id);
          else onError("Не удалось определить таблицу");
        }
      });
      b.build().setVisible(true);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Ошибка открытия выбора таблицы");
    }
  })();
}
