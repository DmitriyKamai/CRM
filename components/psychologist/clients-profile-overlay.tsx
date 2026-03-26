"use client";

import type { ClientDto } from "@/hooks/use-clients-data";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PsychologistClientProfile } from "@/components/psychologist/client-profile";

export function ClientsProfileOverlay(props: {
  client: ClientDto;
  schedulingEnabled: boolean;
  diagnosticsEnabled: boolean;
  onBack: () => void;
  onInvalidateClients: () => Promise<void>;
  onUpdateClientInCache: (clientId: string, patch: Partial<ClientDto>) => void;
  onLocalPatchClient: (patch: Partial<ClientDto>) => void;
  deleteClientById: (clientId: string) => Promise<void>;
}) {
  const {
    client,
    schedulingEnabled,
    diagnosticsEnabled,
    onBack,
    onInvalidateClients,
    onUpdateClientInCache,
    onLocalPatchClient,
    deleteClientById
  } = props;

  const [profileEditing, setProfileEditing] = useState(false);
  const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);
  const [singleDeleting, setSingleDeleting] = useState(false);

  useEffect(() => {
    setProfileEditing(false);
    setSingleDeleteDialogOpen(false);
    setSingleDeleting(false);
  }, [client.id]);

  const clientForProfile = useMemo(
    () => ({
      id: client.id,
      schedulingEnabled,
      diagnosticsEnabled,
      email: client.email ?? null,
      hasAccount: client.hasAccount,
      firstName: client.firstName,
      lastName: client.lastName,
      dateOfBirth: client.dateOfBirth ?? null,
      phone: client.phone ?? null,
      country: client.country ?? null,
      city: client.city ?? null,
      gender: client.gender ?? null,
      maritalStatus: client.maritalStatus ?? null,
      notes: client.notes ?? null,
      createdAt: client.createdAt,
      statusId: client.statusId ?? null,
      statusLabel: client.statusLabel ?? null,
      statusColor: client.statusColor ?? null,
      avatarUrl: client.avatarUrl ?? null
    }),
    [client, diagnosticsEnabled, schedulingEnabled]
  );

  async function confirmSingleDelete() {
    setSingleDeleting(true);
    try {
      await deleteClientById(client.id);
      onBack();
    } finally {
      setSingleDeleting(false);
      setSingleDeleteDialogOpen(false);
    }
  }

  return (
    <div className="px-6 py-4">
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" className="gap-2 px-2" onClick={onBack}>
            <span className="text-lg leading-none">←</span>
            <span className="text-sm">Вернуться назад</span>
          </Button>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={profileEditing ? "secondary" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setProfileEditing((prev) => !prev)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">
                      {profileEditing ? "Завершить редактирование" : "Редактировать профиль"}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {profileEditing ? "Завершить редактирование" : "Редактировать профиль"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialog open={singleDeleteDialogOpen} onOpenChange={setSingleDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive/10"
                  disabled={singleDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Удалить клиента</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить клиента из списка?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Удалить этого клиента из вашего списка? Его записи и тесты в системе сохранятся.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmSingleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {singleDeleting ? "Удаляем..." : "Удалить"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <PsychologistClientProfile
          {...clientForProfile}
          isEditing={profileEditing}
          onEditingChange={setProfileEditing}
          onDeleted={async () => {
            setProfileEditing(false);
            onBack();
            await onInvalidateClients();
          }}
          onUpdated={(next) => {
            const patch = {
              firstName: next.firstName,
              lastName: next.lastName,
              email: next.email ?? null,
              phone: next.phone ?? null,
              country: next.country ?? null,
              city: next.city ?? null,
              gender: next.gender ?? null,
              maritalStatus: next.maritalStatus ?? null,
              notes: next.notes ?? null,
              dateOfBirth: next.dateOfBirth ?? null,
              statusId: next.statusId ?? null,
              statusLabel: next.statusLabel ?? null,
              statusColor: next.statusColor ?? null
            } satisfies Partial<ClientDto>;
            onUpdateClientInCache(client.id, patch);
            onLocalPatchClient(patch);
          }}
        />
      </div>
    </div>
  );
}

