"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isNetworkError =
    /network error|failed to fetch|ERR_CONNECTION_REFUSED/i.test(
      error.message
    );

  return (
    <html lang="ru">
      <body className="min-h-screen bg-background text-foreground p-6 antialiased">
        <main className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-xl font-semibold text-destructive">
            Произошла ошибка приложения
          </h1>
          {isNetworkError && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/40 text-sm text-amber-900 dark:text-amber-200">
              <p className="font-medium mb-1">Ошибка сети (network error)</p>
              <p>
                Если вы открываете сайт с другого устройства (телефон, планшет),
                перезапустите сервер, указав адрес вашего ПК в сети:{" "}
                <code className="bg-muted px-1 rounded">
                  NEXTAUTH_URL=http://IP-ВАШЕГО-ПК:3000 npm run dev
                </code>
                . В файле .env задайте тот же NEXTAUTH_URL.
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Сообщение ниже поможет разработчику исправить проблему.
          </p>
          <pre className="p-4 rounded-lg bg-card border border-border text-xs overflow-auto break-all whitespace-pre-wrap">
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
            {error.stack && `\n\n${error.stack}`}
          </pre>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
          >
            Попробовать снова
          </button>
        </main>
      </body>
    </html>
  );
}
