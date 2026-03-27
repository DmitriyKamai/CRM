"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClientsListMainContent } from "@/components/psychologist/clients-list-main-content";
import { ClientsProfileOverlay } from "@/components/psychologist/clients-profile-overlay";
import { ClientsCreateDialog } from "@/components/psychologist/clients-create-dialog";
import { useClientsData } from "@/hooks/use-clients-data";
import {
  useClientsImport,
  type ClientsImportCustomDef,
  type ClientsImportField
} from "@/hooks/use-clients-import";
import { useClientsExport } from "@/hooks/use-clients-export";
import { useGoogleSheetsStatus } from "@/hooks/use-google-sheets-status";
import { useClientsListScale } from "@/hooks/use-clients-list-scale";
import { useClientsTableColumns } from "@/hooks/use-clients-table-columns";
import { useClientsListQueryState } from "@/hooks/use-clients-list-query-state";
import { useClientsSelection } from "@/hooks/use-clients-selection";
import { useClientsProfileUrlSync } from "@/hooks/use-clients-profile-url-sync";
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
  const queryState = useClientsListQueryState();
  const statusFilter = queryState.statusFilter;
  const page = queryState.page;
  const searchQuery = queryState.searchQuery;
  const setPage = queryState.setPage;

  const {
    clients,
    clientsLoading: loading,
    clientsFetching,
    clientsError,
    pagination,
    statuses,
    customFieldDefs: tableCustomFieldDefs,
    columnOrder: clientsTableColumnOrder,
    persistColumnOrder: persistClientsTableColumnOrder,
    createClient,
    deleteClient,
    bulkDeleteClients,
    updateClientInCache,
    invalidateClients
  } = useClientsData({
    page,
    pageSize: queryState.pageSize,
    statusId: statusFilter === "ALL" ? undefined : statusFilter,
    search: searchQuery
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? clientsError;

  const [addOpen, setAddOpen] = useState(false);
  const { profileClient, setProfileClient, openProfile, closeProfile } = useClientsProfileUrlSync(clients);
  const selection = useClientsSelection(clients.map(c => c.id));
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

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
    clientsCount: pagination.total,
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
    deps: [loading, clients.length, statusFilter, page, searchQuery]
  });

  useEffect(() => {
    if (page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, setPage, pagination.totalPages]);

  function downloadTemplate() {
    downloadClientsImportTemplateCsv(IMPORT_FIELDS.map((f) => f.label));
  }

  function openBulkDeleteDialog() {
    if (selection.selectedCount === 0) return;
    setBulkDeleteDialogOpen(true);
  }

  async function confirmBulkDelete() {
    setBulkDeleteDialogOpen(false);
    setActionError(null);
    try {
      await bulkDeleteClients.mutateAsync(selection.selectedIdsArray);
      selection.cancelMultiSelect();
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Не удалось удалить выбранных клиентов");
    }
  }

  const { columns } = useClientsTableColumns({
    clientsCount: clients.length,
    selectedIds: selection.selectedIds,
    multiSelectMode: selection.multiSelectMode,
    toggleAll: selection.toggleAll,
    toggleOne: selection.toggleOne,
    tableCustomFieldDefs
  });

  // Профиль клиента поверх списка (на всю основную ширину)
  if (profileClient) {
    return (
      <ClientsProfileOverlay
        client={profileClient}
        schedulingEnabled={schedulingEnabled}
        diagnosticsEnabled={diagnosticsEnabled}
        onBack={closeProfile}
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

  return (
    <TooltipProvider>
      <div className="px-3 py-4 sm:px-6">
        <ClientsListMainContent
          listScaleState={listScaleState}
          statuses={statuses}
          statusFilter={statusFilter}
          onStatusFilterChange={(next) => {
            queryState.onStatusFilterChange(next);
          }}
          multiSelectMode={selection.multiSelectMode}
          selectedIds={selection.selectedIds}
          onEnableMultiSelect={selection.enableMultiSelect}
          onCancelMultiSelect={selection.cancelMultiSelect}
          onOpenBulkDeleteDialog={openBulkDeleteDialog}
          clients={clients}
          loading={loading || clientsFetching}
          visibleClients={clients}
          pagination={pagination}
          onPageChange={queryState.setPage}
          searchInput={queryState.searchInput}
          onSearchInputChange={queryState.setSearchInput}
          isSearchTooShort={queryState.isSearchTooShort}
          pageSize={queryState.pageSize}
          onPageSizeChange={queryState.onPageSizeChange}
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
            selection.multiSelectMode
              ? (client) => selection.toggleOne(client.id)
              : openProfile
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
