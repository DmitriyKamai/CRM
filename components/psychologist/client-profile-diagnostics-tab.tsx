"use client";

import { TabsContent } from "@/components/ui/tabs";

type DiagnosticItem = {
  id: string;
  testTitle: string;
  createdAt: string;
  interpretation: string | null;
};

type Props = {
  loading: boolean;
  diagnostics: DiagnosticItem[];
  formatDate: (value?: string | null) => string;
};

export function ClientProfileDiagnosticsTab({ loading, diagnostics, formatDate }: Props) {
  return (
    <TabsContent
      value="diagnostics"
      className="mt-0 space-y-3 rounded-lg border bg-card p-4"
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка результатов…</p>
      ) : diagnostics.length > 0 ? (
        <ul className="space-y-2">
          {diagnostics.map((result) => (
            <li
              key={result.id}
              className="rounded-md border bg-card px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{result.testTitle}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(result.createdAt)}
                </span>
              </div>
              {result.interpretation && (
                <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line">
                  {result.interpretation}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Результаты психологической диагностики для этого клиента пока не сохранены.
        </p>
      )}
    </TabsContent>
  );
}

