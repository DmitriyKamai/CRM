"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClientsListMainContent } from "@/components/psychologist/clients-list-main-content";
import { ClientsProfileOverlay } from "@/components/psychologist/clients-profile-overlay";
import { ClientsCreateDialog } from "@/components/psychologist/clients-create-dialog";
import { useClientsData, type ClientDto } from "@/hooks/use-clients-data";
import {
  useClientsImport,
  type ClientsImportCustomDef,
  type ClientsImportField
} from "@/hooks/use-clients-import";
import { useClientsExport } from "@/hooks/use-clients-export";
import { useGoogleSheetsStatus } from "@/hooks/use-google-sheets-status";
import { useClientsListScale } from "@/hooks/use-clients-list-scale";
import { useClientsTableColumns } from "@/hooks/use-clients-table-columns";
import { downloadClientsImportTemplateCsv } from "@/lib/clients-import-template";

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

  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? clientsError;

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

  const {
    oauthConfigured: googleSheetsOAuthConfigured,
    googleConnected: googleSheetsGoogleConnected,
    refetchGoogleSheetsStatus
  } = useGoogleSheetsStatus();

  const [importOpen, setImportOpen] = useState(false);
  const [importCustomDefs, setImportCustomDefs] = useState<ClientsImportCustomDef[]>([]);

  const clientsImport = useClientsImport({
    importFields: IMPORT_FIELDS,
    importOpen,
    setImportOpen,
    importCustomDefs,
    setImportCustomDefs,
    onImported: invalidateClients,
    setGlobalError: setActionError,
    pathname,
    routerReplace: router.replace,
    searchParamsToString: () => searchParams.toString()
  });

  const clientsExport = useClientsExport({
    clientsCount: clients.length,
    statusFilter,
    googleSheetsOAuthConfigured,
    googleSheetsGoogleConnected,
    syncGoogleSheetsFromServer: refetchGoogleSheetsStatus,
    setError: setActionError
  });
  const handledExportOAuthQueryRef = useRef<string | null>(null);

  useEffect(() => {
    const qs = searchParams.toString();
    const sp = new URLSearchParams(qs);
    const oauthState = sp.get("sheet_oauth");
    const sheetIntent = sp.get("sheet_intent");
    if (oauthState !== "ok" || sheetIntent !== "export") return;
    if (handledExportOAuthQueryRef.current === qs) return;
    handledExportOAuthQueryRef.current = qs;

    void (async () => {
      await clientsExport.handleExportGoogleSheets({ forceRefreshStatus: true });
      sp.delete("sheet_oauth");
      sp.delete("sheet_intent");
      sp.delete("openImport");
      const next = sp.toString();
      router.replace(next ? `${pathname}?${next}` : pathname);
    })();
  }, [clientsExport, pathname, router, searchParams]);

  const listScaleState = useClientsListScale({
    deps: [loading, clients.length, statusFilter]
  });

  function downloadTemplate() {
    downloadClientsImportTemplateCsv(IMPORT_FIELDS.map((f) => f.label));
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
    setActionError(null);
    try {
      await bulkDeleteClients.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      setMultiSelectMode(false);
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Не удалось удалить выбранных клиентов");
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
          setActionError(null);
          try {
            await deleteClient.mutateAsync(clientId);
          } catch (err) {
            console.error(err);
            setActionError(err instanceof Error ? err.message : "Не удалось удалить клиента");
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
        <ClientsListMainContent
          listScaleState={listScaleState}
          statuses={statuses}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          multiSelectMode={multiSelectMode}
          selectedIds={selectedIds}
          onEnableMultiSelect={() => {
            setSelectedIds(new Set());
            setMultiSelectMode(true);
          }}
          onCancelMultiSelect={() => {
            setSelectedIds(new Set());
            setMultiSelectMode(false);
          }}
          onOpenBulkDeleteDialog={openBulkDeleteDialog}
          clients={clients}
          loading={loading}
          visibleClients={visibleClients}
          googleSheetsOAuthConfigured={googleSheetsOAuthConfigured}
          clientsExport={clientsExport}
          bulkDeletePending={bulkDeleteClients.isPending}
          importOpen={importOpen}
          onImportOpenChange={setImportOpen}
          importFields={IMPORT_FIELDS}
          importCustomDefs={importCustomDefs}
          clientsImport={clientsImport}
          downloadTemplate={downloadTemplate}
          error={error}
          bulkDeleteDialogOpen={bulkDeleteDialogOpen}
          onBulkDeleteDialogOpenChange={setBulkDeleteDialogOpen}
          onConfirmBulkDelete={confirmBulkDelete}
          columns={columns}
          tableCustomFieldDefs={tableCustomFieldDefs}
          clientsTableColumnOrder={clientsTableColumnOrder}
          persistClientsTableColumnOrder={persistClientsTableColumnOrder}
          onRowClick={
            multiSelectMode
              ? (client) => toggleOne(client.id)
              : (client) => {
                  setProfileClient(client);
                  router.replace(`${pathname}?profile=${client.id}`);
                }
          }
          onOpenAddClient={() => setAddOpen(true)}
        />

        <ClientsCreateDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreateClient={(payload) => createClient.mutateAsync(payload)}
        />
      </div>
    </TooltipProvider>
  );
}
