"use client";

import { ChevronDown, Download, FileSpreadsheet, Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function ClientsActionsToolbar(props: {
  clientsCount: number;
  googleSheetsOAuthConfigured: boolean | null;
  exporting: boolean;
  onExport: (format: "csv" | "json" | "xlsx") => void;
  onExportGoogleSheets: () => void;
  multiSelectMode: boolean;
  selectedCount: number;
  bulkDeleting: boolean;
  onEnableMultiSelect: () => void;
  onCancelMultiSelect: () => void;
  onOpenBulkDeleteDialog: () => void;
  onOpenImport: () => void;
  onOpenAddClient: () => void;
}) {
  const {
    clientsCount,
    googleSheetsOAuthConfigured,
    exporting,
    onExport,
    onExportGoogleSheets,
    multiSelectMode,
    selectedCount,
    bulkDeleting,
    onEnableMultiSelect,
    onCancelMultiSelect,
    onOpenBulkDeleteDialog,
    onOpenImport,
    onOpenAddClient
  } = props;

  return (
    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0 lg:justify-end">
      {/* Десктоп: кнопки в ряд */}
      <div className="hidden flex-wrap items-center gap-2 lg:flex lg:justify-end">
        {multiSelectMode ? (
          <>
            <Button
              size="sm"
              variant="destructive"
              disabled={selectedCount === 0 || bulkDeleting}
              onClick={onOpenBulkDeleteDialog}
            >
              {bulkDeleting
                ? "Удаляем..."
                : `Удалить выбранных${selectedCount ? ` (${selectedCount})` : ""}`}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelMultiSelect}>
              Отменить выделение
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={onEnableMultiSelect}>
            Выбрать несколько
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={exporting || clientsCount === 0}>
              <Download className="h-4 w-4 mr-1.5" />
              {exporting ? "Экспорт…" : "Экспорт"}
              <ChevronDown className="h-4 w-4 ml-1.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport("csv")} disabled={exporting}>
              Скачать CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("json")} disabled={exporting}>
              Скачать JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("xlsx")} disabled={exporting}>
              Скачать XLSX
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => void onExportGoogleSheets()}
              disabled={exporting || clientsCount === 0 || googleSheetsOAuthConfigured === false}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              В Google Таблицу
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" variant="outline" onClick={onOpenImport}>
          <Upload className="h-4 w-4 mr-1.5" />
          Импорт
        </Button>
        <Button size="sm" onClick={onOpenAddClient}>
          Добавить клиента
        </Button>
      </div>

      {/* Мобильный: одно меню */}
      <div className="flex w-full justify-end lg:hidden">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              aria-haspopup="menu"
            >
              Действия
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="w-[min(100vw-2rem,20rem)]"
          >
            {multiSelectMode ? (
              <>
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  disabled={selectedCount === 0 || bulkDeleting}
                  onClick={onOpenBulkDeleteDialog}
                >
                  {bulkDeleting ? "Удаляем..." : `Удалить выбранных${selectedCount ? ` (${selectedCount})` : ""}`}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCancelMultiSelect}>Отменить выделение</DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={onEnableMultiSelect}>Выбрать несколько</DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {exporting ? "Экспорт…" : "Экспорт"}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onExport("csv")} disabled={exporting || clientsCount === 0}>
              Скачать CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("json")} disabled={exporting || clientsCount === 0}>
              Скачать JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("xlsx")} disabled={exporting || clientsCount === 0}>
              Скачать XLSX
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => void onExportGoogleSheets()}
              disabled={exporting || clientsCount === 0 || googleSheetsOAuthConfigured === false}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              В Google Таблицу
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenImport}>
              <Upload className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              Импорт
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAddClient}>
              <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              Добавить клиента
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

