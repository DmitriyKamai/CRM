"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, UploadCloud, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientsImportDialog } from "@/components/psychologist/clients-import-dialog";
import { ClientsActionsToolbar } from "@/components/psychologist/clients-actions-toolbar";
import { ClientsListScaleShell } from "@/components/psychologist/clients-list-scale-shell";
import { ClientsListPagination } from "@/components/psychologist/clients-list-pagination";
import type { ClientDto, ClientsPaginationMeta, CustomFieldDef } from "@/hooks/use-clients-data";
import type {
  ClientsImportCustomDef,
  ClientsImportField,
  UseClientsImportReturn
} from "@/hooks/use-clients-import";
import type { UseClientsExportReturn } from "@/hooks/use-clients-export";
import type { ClientsListScaleState } from "@/hooks/use-clients-list-scale";
import {
  getClientsColumnLabels,
  getClientsInitialColumnVisibility
} from "@/hooks/use-clients-table-columns";

export function ClientsListMainContent(props: {
  listScaleState: ClientsListScaleState;
  statuses: { id: string; label: string }[];
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  multiSelectMode: boolean;
  selectedIds: Set<string>;
  onEnableMultiSelect: () => void;
  onCancelMultiSelect: () => void;
  onOpenBulkDeleteDialog: () => void;
  clients: ClientDto[];
  loading: boolean;
  visibleClients: ClientDto[];
  pagination: ClientsPaginationMeta;
  onPageChange: (page: number) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  isSearchTooShort: boolean;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  googleSheetsOAuthConfigured: boolean | null;
  clientsExport: Pick<
    UseClientsExportReturn,
    "exporting" | "handleExport" | "handleExportGoogleSheets"
  >;
  bulkDeletePending: boolean;
  importOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
  importFields: ClientsImportField[];
  importCustomDefs: ClientsImportCustomDef[];
  clientsImport: UseClientsImportReturn;
  downloadTemplate: () => void;
  error: string | null;
  bulkDeleteDialogOpen: boolean;
  onBulkDeleteDialogOpenChange: (open: boolean) => void;
  onConfirmBulkDelete: () => void;
  columns: ColumnDef<ClientDto>[];
  tableCustomFieldDefs: CustomFieldDef[];
  clientsTableColumnOrder: string[] | null | undefined;
  persistClientsTableColumnOrder: (order: string[]) => void;
  onRowClick: (client: ClientDto) => void;
  onOpenAddClient: () => void;
}) {
  const {
    listScaleState,
    statuses,
    statusFilter,
    onStatusFilterChange,
    multiSelectMode,
    selectedIds,
    onEnableMultiSelect,
    onCancelMultiSelect,
    onOpenBulkDeleteDialog,
    clients,
    loading,
    visibleClients,
    pagination,
    onPageChange,
    searchInput,
    onSearchInputChange,
    isSearchTooShort,
    pageSize,
    onPageSizeChange,
    googleSheetsOAuthConfigured,
    clientsExport,
    bulkDeletePending,
    importOpen,
    onImportOpenChange,
    importFields,
    importCustomDefs,
    clientsImport,
    downloadTemplate,
    error,
    bulkDeleteDialogOpen,
    onBulkDeleteDialogOpenChange,
    onConfirmBulkDelete,
    columns,
    tableCustomFieldDefs,
    clientsTableColumnOrder,
    persistClientsTableColumnOrder,
    onRowClick,
    onOpenAddClient
  } = props;

  return (
    <ClientsListScaleShell
      listScaled={listScaleState.listScaled}
      minListWidth={listScaleState.minListWidth}
      listScale={listScaleState.listScale}
      listInnerHeight={listScaleState.listInnerHeight}
      containerRef={listScaleState.listContainerRef}
      innerRef={listScaleState.listInnerRef}
    >
      {statuses.length > 0 && (
        <Tabs value={statusFilter} onValueChange={onStatusFilterChange} className="w-full">
          <TabsList className="inline-flex h-9 max-w-full overflow-x-auto rounded-full bg-muted px-1 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger
              value="ALL"
              className="rounded-full px-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              Все
            </TabsTrigger>
            {statuses.map((st) => (
              <TabsTrigger
                key={st.id}
                value={st.id}
                className="rounded-full px-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                {st.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {/* До lg — колонка; на md+ с узким main (при старом брейкпоинте сайдбара) тулбар ломался — см. AppShell lg */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-2">
        <div className="flex min-w-0 w-full flex-col gap-1 lg:max-w-xl lg:pr-2">
          <p className="text-pretty text-sm leading-snug text-muted-foreground">
            Нажмите на строку, чтобы открыть профиль клиента.
          </p>
          {multiSelectMode && selectedIds.size > 0 && (
            <p className="text-xs text-muted-foreground">Выбрано клиентов: {selectedIds.size}</p>
          )}
        </div>
        <ClientsActionsToolbar
          clientsCount={pagination.total}
          googleSheetsOAuthConfigured={googleSheetsOAuthConfigured}
          exporting={clientsExport.exporting}
          onExport={clientsExport.handleExport}
          onExportGoogleSheets={clientsExport.handleExportGoogleSheets}
          multiSelectMode={multiSelectMode}
          selectedCount={selectedIds.size}
          bulkDeleting={bulkDeletePending}
          onEnableMultiSelect={onEnableMultiSelect}
          onCancelMultiSelect={onCancelMultiSelect}
          onOpenBulkDeleteDialog={onOpenBulkDeleteDialog}
          onOpenImport={() => onImportOpenChange(true)}
          onOpenAddClient={onOpenAddClient}
        />
      </div>

      <ClientsImportDialog
        open={importOpen}
        onOpenChange={onImportOpenChange}
        error={error}
        importFields={importFields}
        importCustomDefs={importCustomDefs}
        importHeaders={clientsImport.importHeaders}
        importRows={clientsImport.importRows}
        importMapping={clientsImport.importMapping}
        setImportMapping={clientsImport.setImportMapping}
        importSkipDuplicates={clientsImport.importSkipDuplicates}
        setImportSkipDuplicates={clientsImport.setImportSkipDuplicates}
        importing={clientsImport.importing}
        importResult={clientsImport.importResult}
        importFileName={clientsImport.importFileName}
        importFileInputRef={clientsImport.importFileInputRef}
        googleSheetsImportUrl={clientsImport.googleSheetsImportUrl}
        setGoogleSheetsImportUrl={clientsImport.setGoogleSheetsImportUrl}
        googleSheetsImportLoading={clientsImport.googleSheetsImportLoading}
        googleSheetsPickerLoading={clientsImport.googleSheetsPickerLoading}
        googleSheetsOAuthConfigured={clientsImport.googleSheetsOAuthConfigured}
        googleSheetsGoogleConnected={clientsImport.googleSheetsGoogleConnected}
        onImportFileChange={clientsImport.handleImportFile}
        onResetSource={clientsImport.resetImportSourceSelection}
        onSubmit={clientsImport.handleImportSubmit}
        onImportFromGoogleSheets={clientsImport.handleImportFromGoogleSheets}
        onOpenGoogleSheetsPicker={clientsImport.handleOpenGoogleSheetsPicker}
        onDisconnectGoogleSheets={clientsImport.handleDisconnectGoogleSheets}
        onDownloadTemplate={downloadTemplate}
      />

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={onBulkDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить выбранных клиентов?</AlertDialogTitle>
            <AlertDialogDescription>
              Удалить {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "выбранного клиента" : "выбранных клиентов"}{" "}
              из вашего списка? Их записи и тесты в системе сохранятся.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : visibleClients.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed bg-muted/40 px-6 py-10 text-center">
          <div className="space-y-3 max-w-md">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {clients.length === 0 ? "Клиентов пока нет" : "По выбранному фильтру клиентов нет"}
              </p>
              <p className="text-xs text-muted-foreground">
                {clients.length === 0
                  ? "Добавьте первого клиента вручную или импортируйте список из файла."
                  : "Смените вкладку статуса или добавьте клиента с подходящим статусом."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button size="sm" onClick={onOpenAddClient}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Добавить клиента
              </Button>
              <Button size="sm" variant="outline" onClick={() => onImportOpenChange(true)}>
                <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                Импорт из файла
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {isSearchTooShort && (
            <p className="text-xs text-muted-foreground">Введите минимум 2 символа для поиска</p>
          )}
          <DataTable
            columns={columns}
            data={visibleClients}
            columnLabels={getClientsColumnLabels(tableCustomFieldDefs)}
            initialColumnVisibility={getClientsInitialColumnVisibility(tableCustomFieldDefs)}
            visibilityStorageKey="psychologist-clients-table-columns"
            minTableWidthClassName="min-w-[56rem] xl:min-w-[1500px]"
            initialColumnOrder={clientsTableColumnOrder}
            onColumnOrderPersist={persistClientsTableColumnOrder}
            onRowClick={onRowClick}
            topControls={
              <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2 sm:items-center">
                <div className="order-1 flex w-full items-center justify-end gap-2 sm:order-2 sm:w-auto sm:justify-start">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    Строк на странице:
                  </span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => onPageSizeChange(Number(value))}
                  >
                    <SelectTrigger className="h-8 w-[92px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Поиск по имени, email или телефону..."
                  value={searchInput}
                  onChange={(e) => onSearchInputChange(e.target.value)}
                  className="order-2 h-8 min-w-[180px] flex-1 sm:order-1 sm:min-w-[240px] sm:max-w-[300px] lg:max-w-[340px]"
                />
              </div>
            }
          />
          <ClientsListPagination pagination={pagination} onPageChange={onPageChange} />
        </div>
      )}
    </ClientsListScaleShell>
  );
}
