"use client";

import { ArrowLeft, Download, FileSpreadsheet, UploadCloud } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

import type {
  ClientsImportCustomDef,
  ClientsImportField,
  ClientsImportResult
} from "@/hooks/use-clients-import";

export function ClientsImportDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: string | null;
  importFields: ClientsImportField[];
  importCustomDefs: ClientsImportCustomDef[];
  importHeaders: string[];
  importRows: (string | number | boolean)[][];
  importMapping: Record<string, number>;
  setImportMapping: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
  importSkipDuplicates: boolean;
  setImportSkipDuplicates: (v: boolean) => void;
  importing: boolean;
  importResult: ClientsImportResult | null;
  importFileName: string | null;
  importFileInputRef: React.RefObject<HTMLInputElement>;
  googleSheetsImportUrl: string;
  setGoogleSheetsImportUrl: (v: string) => void;
  googleSheetsImportLoading: boolean;
  googleSheetsPickerLoading: boolean;
  googleSheetsOAuthConfigured: boolean | null;
  googleSheetsGoogleConnected: boolean | null;
  onImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onResetSource: () => void;
  onSubmit: () => void | Promise<void>;
  onImportFromGoogleSheets: () => void | Promise<void>;
  onOpenGoogleSheetsPicker: () => void | Promise<void>;
  onDisconnectGoogleSheets: () => void | Promise<void>;
  onDownloadTemplate: () => void;
}) {
  const {
    open,
    onOpenChange,
    error,
    importFields,
    importCustomDefs,
    importHeaders,
    importRows,
    importMapping,
    setImportMapping,
    importSkipDuplicates,
    setImportSkipDuplicates,
    importing,
    importResult,
    importFileName,
    importFileInputRef,
    googleSheetsImportUrl,
    setGoogleSheetsImportUrl,
    googleSheetsImportLoading,
    googleSheetsPickerLoading,
    googleSheetsOAuthConfigured,
    googleSheetsGoogleConnected,
    onImportFileChange,
    onResetSource,
    onSubmit,
    onImportFromGoogleSheets,
    onOpenGoogleSheetsPicker,
    onDisconnectGoogleSheets,
    onDownloadTemplate
  } = props;

  const hasSource = importHeaders.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          importFileInputRef.current?.blur();
          if (importFileInputRef.current) importFileInputRef.current.value = "";
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={
          hasSource
            ? "max-w-none w-full h-[100dvh] max-h-[100dvh] min-h-0 left-0 top-0 translate-x-0 translate-y-0 rounded-none flex flex-col overflow-hidden gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6"
            : "max-w-2xl max-h-[90vh] overflow-y-auto"
        }
      >
        <DialogHeader className={hasSource ? "shrink-0 text-left" : undefined}>
          <DialogTitle>Импорт клиентов</DialogTitle>
          <DialogDescription>
            {!hasSource
              ? "Загрузите CSV, XLSX, JSON или импортируйте данные с первого листа Google Таблицы (заголовки — в первой строке листа)."
              : "Сопоставьте колонки с полями и нажмите «Импортировать»."}
          </DialogDescription>
        </DialogHeader>

        <div
          className={
            hasSource
              ? "space-y-4 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
              : "space-y-4"
          }
        >
          {!hasSource ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label className="text-sm">Файл</Label>
                  <p className="text-xs text-muted-foreground">
                    Поддерживаются CSV, XLSX и JSON. В CSV разделитель колонок определяется
                    автоматически (запятая, «;» как в Excel при русской локали, или табуляция). Для
                    дат используйте формат из шаблона.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={onDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Шаблон
                </Button>
              </div>

              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (!file || !importFileInputRef.current) return;
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  importFileInputRef.current.files = dt.files;
                  importFileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                }}
                className="group w-full flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-colors hover:border-primary/60 hover:bg-muted/60"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Перетащите файл сюда или нажмите, чтобы выбрать
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV, XLSX или JSON, размером до 10 МБ.
                  </p>
                </div>
                {importFileName && (
                  <p className="mt-1 text-xs text-muted-foreground break-all">
                    Выбран файл: <span className="font-medium">{importFileName}</span>
                  </p>
                )}
                <Input
                  ref={importFileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.json"
                  className="sr-only"
                  onChange={onImportFileChange}
                />
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
                  <span className="bg-background px-2">или</span>
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Label className="text-sm font-medium">Google Таблицы</Label>
                  </div>
                  {googleSheetsOAuthConfigured && googleSheetsGoogleConnected ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => void onDisconnectGoogleSheets()}
                    >
                      Отключить Google
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Читается первый лист таблицы; первая строка — заголовки колонок (как в шаблоне CSV).
                  Доступ к файлам — с вашего Google-аккаунта, без расшаривания на технические email.
                </p>
                {googleSheetsOAuthConfigured === false ? (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">
                      На сервере не заданы{" "}
                      <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code>,{" "}
                      <code className="rounded bg-muted px-1">GOOGLE_CLIENT_SECRET</code> и{" "}
                      <code className="rounded bg-muted px-1">NEXTAUTH_URL</code> — обратитесь к
                      администратору.
                    </AlertDescription>
                  </Alert>
                ) : null}
                {googleSheetsOAuthConfigured && !googleSheetsGoogleConnected ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <p className="text-xs text-muted-foreground">
                      Один раз разрешите приложению чтение таблиц — как обычный вход через Google.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 w-fit"
                      onClick={() => {
                        window.location.href = "/api/psychologist/google-sheets/oauth/start";
                      }}
                    >
                      Подключить Google
                    </Button>
                  </div>
                ) : null}
                {googleSheetsOAuthConfigured && googleSheetsGoogleConnected ? (
                  <div className="space-y-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={googleSheetsPickerLoading || googleSheetsImportLoading}
                      onClick={() => void onOpenGoogleSheetsPicker()}
                    >
                      {googleSheetsPickerLoading ? "Открываем выбор…" : "Выбрать таблицу…"}
                    </Button>
                    {!process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? (
                      <p className="text-xs text-amber-800 dark:text-amber-200/90">
                        Чтобы открывалось стандартное окно Google, задайте в настройках сервера переменную{" "}
                        <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_API_KEY</code> (ключ
                        API в Google Cloud → ограничение по HTTP referrer). Иначе вставьте ссылку на
                        таблицу ниже.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Откроется окно Google: выберите файл таблицы или укажите ссылку вручную ниже.
                      </p>
                    )}
                  </div>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor="google-import-url" className="text-xs">
                      Ссылка на таблицу (если не выбирали выше)
                    </Label>
                    <Input
                      id="google-import-url"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={googleSheetsImportUrl}
                      onChange={(e) => setGoogleSheetsImportUrl(e.target.value)}
                      disabled={googleSheetsImportLoading || googleSheetsPickerLoading}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={
                      googleSheetsImportLoading ||
                      googleSheetsPickerLoading ||
                      !googleSheetsOAuthConfigured ||
                      !googleSheetsGoogleConnected
                    }
                    onClick={() => void onImportFromGoogleSheets()}
                  >
                    {googleSheetsImportLoading ? "Загрузка…" : "Загрузить из Google Таблицы"}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Файлы CSV/XLSX/JSON разбираются в браузере. Импорт из Google выполняется на сервере с
                вашего разрешения (OAuth).
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-border pb-3">
                <div className="min-w-0 space-y-1">
                  {importFileName ? (
                    <p className="text-xs text-muted-foreground truncate" title={importFileName}>
                      <span className="font-medium text-foreground">{importFileName}</span>
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    Найдено колонок: {importHeaders.length}, строк: {importRows.length}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={onResetSource}
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Другой файл или таблица
                </Button>
              </div>

              <div className="flex shrink-0 flex-col space-y-2">
                <Label className="text-sm shrink-0">Сопоставление полей</Label>
                <div className="max-w-full overflow-x-auto rounded-md border">
                  <table className="w-full min-w-max border-collapse text-xs">
                    <thead>
                      <tr>
                        {importHeaders.map((_, colIndex) => {
                          const fieldOptions = [
                            ...importFields,
                            ...importCustomDefs.map((d) => ({
                              key: `custom:${d.label}`,
                              label: d.label
                            }))
                          ];
                          const currentKey =
                            Object.entries(importMapping).find(([, idx]) => idx === colIndex)?.[0] ??
                            "__none__";
                          return (
                            <th key={colIndex} className="border-b bg-muted/40 px-2 py-1 align-bottom">
                              <Select
                                value={currentKey}
                                onValueChange={(fieldKey) =>
                                  setImportMapping((prev) => {
                                    const next = { ...prev };
                                    for (const [k, idx] of Object.entries(next)) {
                                      if (idx === colIndex) delete next[k];
                                    }
                                    if (fieldKey === "__none__") return next;
                                    delete next[fieldKey];
                                    next[fieldKey] = colIndex;
                                    return next;
                                  })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="— не импортировать" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— не импортировать</SelectItem>
                                  {fieldOptions.map((opt) => (
                                    <SelectItem key={opt.key} value={opt.key}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </th>
                          );
                        })}
                      </tr>
                      <tr>
                        {importHeaders.map((h, i) => (
                          <th key={i} className="border-b bg-muted px-2 py-1 text-left font-medium">
                            {h || `Колонка ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {importHeaders.map((_, colIndex) => (
                            <td
                              key={colIndex}
                              className="border-t px-2 py-1 text-[11px] text-muted-foreground"
                            >
                              {String(row[colIndex] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={importSkipDuplicates}
                  onChange={(e) => setImportSkipDuplicates(e.target.checked)}
                />
                Пропускать дубликаты по email
              </label>

              {importResult && (
                <div className="space-y-2">
                  <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
                    <AlertDescription>
                      Создано: {importResult.created}
                      {(importResult.updated ?? 0) > 0 && `, обновлено: ${importResult.updated}`}
                      {importResult.skipped > 0 && `, пропущено: ${importResult.skipped}`}
                      {importResult.failed > 0 && `, ошибок: ${importResult.failed}`}.
                      {importResult.errors.length > 0 && (
                        <ul className="mt-2 list-inside text-xs">
                          {importResult.errors.slice(0, 10).map((e, i) => (
                            <li key={i}>
                              Строка {e.row}: {e.message}
                            </li>
                          ))}
                          {importResult.errors.length > 10 && (
                            <li>… и ещё {importResult.errors.length - 10}</li>
                          )}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>
                  {importResult.warnings && importResult.warnings.length > 0 && (
                    <Alert variant="default">
                      <AlertDescription>
                        <span className="font-medium">Предупреждения:</span>
                        <ul className="mt-2 list-inside text-xs">
                          {importResult.warnings.slice(0, 10).map((w, i) => (
                            <li key={i}>
                              Строка {w.row}: {w.message}
                            </li>
                          ))}
                          {importResult.warnings.length > 10 && (
                            <li>… и ещё {importResult.warnings.length - 10}</li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className={hasSource ? "shrink-0 gap-2 border-t border-border pt-4 sm:justify-end" : undefined}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button
            disabled={
              importing ||
              importRows.length === 0 ||
              importMapping.firstName == null ||
              importMapping.lastName == null
            }
            onClick={() => void onSubmit()}
          >
            {importing ? "Импорт…" : "Импортировать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

