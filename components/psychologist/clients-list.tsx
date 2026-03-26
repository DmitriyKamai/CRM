"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { useClientsListScale } from "@/hooks/use-clients-list-scale";
import { useClientsTableColumns } from "@/hooks/use-clients-table-columns";

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
