"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Plus,
  UploadCloud,
} from "lucide-react";

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
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClientsImportDialog } from "@/components/psychologist/clients-import-dialog";
import { ClientsActionsToolbar } from "@/components/psychologist/clients-actions-toolbar";
import { ClientsProfileOverlay } from "@/components/psychologist/clients-profile-overlay";
import { ClientsCreateDialog } from "@/components/psychologist/clients-create-dialog";
import { ClientsListScaleShell } from "@/components/psychologist/clients-list-scale-shell";
import { useClientsData, type ClientDto } from "@/hooks/use-clients-data";
import {
  useClientsImport,
  type ClientsImportCustomDef,
  type ClientsImportField
} from "@/hooks/use-clients-import";
import { useClientsExport } from "@/hooks/use-clients-export";
import { useClientsListScale } from "@/hooks/use-clients-list-scale";
import {
  getClientsColumnLabels,
  getClientsInitialColumnVisibility,
  useClientsTableColumns
} from "@/hooks/use-clients-table-columns";

const IMPORT_FIELDS: ClientsImportField[] = [
  { key: "firstName", label: "Имя" },
  { key: "lastName", label: "Фамилия" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Телефон" },
  { key: "dateOfBirth", label: "Дата рождения" },
  { key: "country", label: "Страна" },
  { key: "city", label: "Город" },
  { key: "gender", label: "Пол" },
  { key: "maritalStatus", label: "Семейное положение" },
  { key: "status", label: "Статус" },
  { key: "notes", label: "Заметки" }
];

export function PsychologistClientsList({
  schedulingEnabled,
  diagnosticsEnabled
}: {
  schedulingEnabled: boolean;
  diagnosticsEnabled: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    clients,
    clientsLoading: loading,
    clientsError,
    statuses,
    customFieldDefs: tableCustomFieldDefs,
    columnOrder: clientsTableColumnOrder,
    persistColumnOrder: persistClientsTableColumnOrder,
    createClient,
    deleteClient,
    bulkDeleteClients,
    updateClientInCache,
    invalidateClients
  } = useClientsData();

  const [error, setError] = useState<string | null>(clientsError);

  const [addOpen, setAddOpen] = useState(false);
  const [profileClient, setProfileClient] = useState<ClientDto | null>(null);

  // Синхронизация профиля с URL: при переходе по ссылке «Клиенты» в навбаре (без ?profile=) закрываем профиль
  const profileIdFromUrl = searchParams.get("profile");
  useEffect(() => {
    void (async () => {
      if (!profileIdFromUrl) {
        setProfileClient(null);
        return;
      }
      const client = clients.find(c => c.id === profileIdFromUrl);
      if (client) setProfileClient(client);
    })();
  }, [profileIdFromUrl, clients]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [googleSheetsOAuthConfigured, setGoogleSheetsOAuthConfigured] = useState<boolean | null>(
    null
  );
  const [googleSheetsGoogleConnected, setGoogleSheetsGoogleConnected] = useState<boolean | null>(
    null
  );

  const [importOpen, setImportOpen] = useState(false);
  const [importCustomDefs, setImportCustomDefs] = useState<ClientsImportCustomDef[]>([]);

  const clientsImport = useClientsImport({
    importFields: IMPORT_FIELDS,
    importOpen,
    setImportOpen,
    importCustomDefs,
    setImportCustomDefs,
    onImported: invalidateClients,
    setGlobalError: setError,
    pathname,
    routerReplace: router.replace,
    searchParamsToString: () => searchParams.toString()
  });

  const syncGoogleSheetsFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/psychologist/google-sheets");
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as {
        oauthConfigured?: boolean;
        googleConnected?: boolean;
      } | null;
      setGoogleSheetsOAuthConfigured(Boolean(data?.oauthConfigured));
      setGoogleSheetsGoogleConnected(Boolean(data?.googleConnected));
    } catch {
      setGoogleSheetsOAuthConfigured(false);
      setGoogleSheetsGoogleConnected(false);
    }
  }, []);

  const clientsExport = useClientsExport({
    clientsCount: clients.length,
    statusFilter,
    googleSheetsOAuthConfigured,
    googleSheetsGoogleConnected,
    setGoogleSheetsOAuthConfigured: (v) => setGoogleSheetsOAuthConfigured(v),
    setGoogleSheetsGoogleConnected: (v) => setGoogleSheetsGoogleConnected(v),
    syncGoogleSheetsFromServer,
    setError
  });

  useEffect(() => {
    void (async () => {
      await syncGoogleSheetsFromServer();
    })();
  }, [syncGoogleSheetsFromServer]);

  const listScaleState = useClientsListScale({
    deps: [loading, clients.length, statusFilter]
  });

  function downloadTemplate() {
    try {
      const headers = IMPORT_FIELDS.map((f) => f.label);
      const csv = `${headers.join(",")}\n`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clients-template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download template", err);
    }
  }

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(clients.map(c => c.id)));
  }, [clients]);

  function openBulkDeleteDialog() {
    if (selectedIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  }

  async function confirmBulkDelete() {
    setBulkDeleteDialogOpen(false);
    setError(null);
    try {
      await bulkDeleteClients.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      setMultiSelectMode(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось удалить выбранных клиентов");
    }
  }

  const { columns } = useClientsTableColumns({
    clientsCount: clients.length,
    selectedIds,
    multiSelectMode,
    toggleAll,
    toggleOne,
    tableCustomFieldDefs
  });

  // Профиль клиента поверх списка (на всю основную ширину)
  if (profileClient) {
    return (
      <ClientsProfileOverlay
        client={profileClient}
        schedulingEnabled={schedulingEnabled}
        diagnosticsEnabled={diagnosticsEnabled}
        onBack={() => {
          setProfileClient(null);
          router.replace(pathname);
        }}
        onInvalidateClients={invalidateClients}
        onUpdateClientInCache={updateClientInCache}
        onLocalPatchClient={(patch) =>
          setProfileClient((prev) => (prev ? { ...prev, ...patch } : prev))
        }
        deleteClientById={async (clientId) => {
          setError(null);
          try {
            await deleteClient.mutateAsync(clientId);
          } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Не удалось удалить клиента");
            throw err;
          }
        }}
      />
    );
  }

  const visibleClients =
    statusFilter === "ALL"
      ? clients
      : clients.filter((c) => c.statusId === statusFilter);

  return (
    <TooltipProvider>
    <div className="px-3 py-4 sm:px-6">
      <ClientsListScaleShell
        listScaled={listScaleState.listScaled}
        minListWidth={listScaleState.minListWidth}
        listScale={listScaleState.listScale}
        listInnerHeight={listScaleState.listInnerHeight}
        containerRef={listScaleState.listContainerRef}
        innerRef={listScaleState.listInnerRef}
      >
            {/* Фильтр по статусу */}
            {statuses.length > 0 && (
              <Tabs
                value={statusFilter}
                onValueChange={setStatusFilter}
                className="w-full"
              >
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
                  <p className="text-xs text-muted-foreground">
                    Выбрано клиентов: {selectedIds.size}
                  </p>
                )}
              </div>
              <ClientsActionsToolbar
                clientsCount={clients.length}
                googleSheetsOAuthConfigured={googleSheetsOAuthConfigured}
                exporting={clientsExport.exporting}
                onExport={clientsExport.handleExport}
                onExportGoogleSheets={clientsExport.handleExportGoogleSheets}
                multiSelectMode={multiSelectMode}
                selectedCount={selectedIds.size}
                bulkDeleting={bulkDeleteClients.isPending}
                onEnableMultiSelect={() => {
                  setSelectedIds(new Set());
                  setMultiSelectMode(true);
                }}
                onCancelMultiSelect={() => {
                  setSelectedIds(new Set());
                  setMultiSelectMode(false);
                }}
                onOpenBulkDeleteDialog={openBulkDeleteDialog}
                onOpenImport={() => setImportOpen(true)}
                onOpenAddClient={() => setAddOpen(true)}
              />
            </div>

            {/* Импорт */}
            <ClientsImportDialog
              open={importOpen}
              onOpenChange={setImportOpen}
              error={error}
              importFields={IMPORT_FIELDS}
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

            {/* Подтверждение массового удаления */}
            <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
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
                  <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading / table / empty state */}
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
                    <Button size="sm" onClick={() => setAddOpen(true)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Добавить клиента
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setImportOpen(true)}
                    >
                      <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                      Импорт из файла
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={visibleClients}
                filterColumnId="search"
                filterPlaceholder="Поиск по имени, email или телефону..."
                columnLabels={getClientsColumnLabels(tableCustomFieldDefs)}
                initialColumnVisibility={getClientsInitialColumnVisibility(tableCustomFieldDefs)}
                visibilityStorageKey="psychologist-clients-table-columns"
                minTableWidthClassName="min-w-[56rem] xl:min-w-[1500px]"
                initialColumnOrder={clientsTableColumnOrder}
                onColumnOrderPersist={persistClientsTableColumnOrder}
                onRowClick={
                  multiSelectMode
                    ? client => toggleOne(client.id)
                    : client => {
                        setProfileClient(client);
                        router.replace(`${pathname}?profile=${client.id}`);
                      }
                }
              />
            )}
      </ClientsListScaleShell>

        <ClientsCreateDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreateClient={(payload) => createClient.mutateAsync(payload)}
        />
    </div>
    </TooltipProvider>
  );
}
