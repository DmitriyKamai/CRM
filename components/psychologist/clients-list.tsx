"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, ArrowUpDown, UserCheck } from "lucide-react";
import { ru } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { DataTable } from "@/components/ui/data-table";
import { PhoneInput, formatPhoneDisplay } from "@/components/ui/phone-input";
import { PsychologistClientProfile } from "@/components/psychologist/client-profile";

type ClientDto = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  hasAccount?: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU");
}

export function PsychologistClientsList() {
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [profileClient, setProfileClient] = useState<ClientDto | null>(null);

  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    notes: ""
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  async function loadClients() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/psychologist/clients");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Не удалось загрузить клиентов");
      }
      const data = (await res.json()) as { clients: ClientDto[] };
      setClients(data.clients);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось загрузить клиентов");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      const body = {
        ...form,
        email: form.email.trim() || undefined,
        dateOfBirth: dob ? dob.toISOString() : undefined
      };
      const res = await fetch("/api/psychologist/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Не удалось создать клиента");

      await loadClients();
      setForm({ email: "", firstName: "", lastName: "", phone: "", notes: "" });
      setDob(undefined);
      setAddOpen(false);
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Не удалось создать клиента");
    } finally {
      setCreating(false);
    }
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(clients.map(c => c.id)));
  }

  function openBulkDeleteDialog() {
    if (selectedIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  }

  async function confirmBulkDelete() {
    setBulkDeleteDialogOpen(false);
    setBulkDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/psychologist/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось удалить выбранных клиентов");
      }
      setSelectedIds(new Set());
      await loadClients();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось удалить выбранных клиентов"
      );
    } finally {
      setBulkDeleting(false);
    }
  }

  const columns: ColumnDef<ClientDto>[] = useMemo(
    () => [
      {
        id: "select",
        header: () => {
          if (!multiSelectMode) return null;

          const allSelected =
            clients.length > 0 && selectedIds.size === clients.length;
          const someSelected =
            selectedIds.size > 0 && selectedIds.size < clients.length;

          return (
            <input
              type="checkbox"
              aria-label="Выбрать всех клиентов"
              checked={allSelected}
              ref={el => {
                if (el) {
                  el.indeterminate = someSelected;
                }
              }}
              onChange={e => toggleAll(e.target.checked)}
            />
          );
        },
        cell: ({ row }) =>
          multiSelectMode ? (
            <input
              type="checkbox"
              aria-label="Выбрать клиента"
              checked={selectedIds.has(row.original.id)}
              onChange={e => {
                e.stopPropagation();
                toggleOne(row.original.id);
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : null,
        enableSorting: false,
        enableHiding: false
      },
      // скрытая колонка для полнотекстового поиска
      {
        id: "search",
        accessorFn: row =>
          `${row.lastName ?? ""} ${row.firstName ?? ""} ${row.email ?? ""} ${row.phone ?? ""}`,
        header: () => null,
        cell: () => null,
        enableHiding: false,
        enableSorting: false
      },
      {
        id: "name",
        accessorFn: row => `${row.lastName} ${row.firstName}`,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 px-0 text-xs font-medium text-muted-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Имя
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium inline-flex items-center gap-1.5">
            {row.original.lastName} {row.original.firstName}
            {row.original.hasAccount === true && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex text-muted-foreground hover:text-foreground cursor-help focus:outline-none">
                      <UserCheck className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="sr-only">Зарегистрирован</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Клиент зарегистрирован
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
        )
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 px-0 text-xs font-medium text-muted-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
        )
      },
      {
        accessorKey: "phone",
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Телефон</span>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatPhoneDisplay(row.original.phone)}
          </span>
        )
      },
      {
        id: "createdAt",
        accessorFn: row => row.createdAt,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 px-0 text-xs font-medium text-muted-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Создан
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        )
      }
    ],
    [clients, selectedIds]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Двойной клик по строке открывает профиль клиента.
          </p>
          {multiSelectMode && selectedIds.size > 0 && (
            <p className="text-xs text-muted-foreground">
              Выбрано клиентов: {selectedIds.size}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {multiSelectMode ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedIds.size === 0 || bulkDeleting}
                onClick={openBulkDeleteDialog}
              >
                {bulkDeleting
                  ? "Удаляем..."
                  : `Удалить выбранных${selectedIds.size ? ` (${selectedIds.size})` : ""}`}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedIds(new Set());
                  setMultiSelectMode(false);
                }}
              >
                Отменить выделение
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedIds(new Set());
                setMultiSelectMode(true);
              }}
            >
              Выбрать несколько
            </Button>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)}>
            Добавить клиента
          </Button>
        </div>
      </div>

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
      ) : clients.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-md border bg-card/70 text-sm text-muted-foreground">
          Клиентов пока нет. Нажмите «Добавить клиента», чтобы создать первого.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={clients}
          filterColumnId="search"
          filterPlaceholder="Поиск по имени, email или телефону..."
          columnLabels={{
            name: "Имя",
            email: "Email",
            phone: "Телефон",
            createdAt: "Создан"
          }}
          onRowDoubleClick={client => setProfileClient(client)}
        />
      )}

      {/* Dialog: добавление клиента */}
      <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) setFormError(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Новый клиент</DialogTitle>
            <DialogDescription>
              Укажите основные данные. Email необязателен; если указан и клиент позже
              зарегистрируется с этим email — профиль автоматически свяжется с аккаунтом.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-email">Email (необязательно)</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="Для связки при регистрации клиента"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-firstName">Имя</Label>
              <Input
                id="add-firstName"
                required
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-lastName">Фамилия</Label>
              <Input
                id="add-lastName"
                required
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Дата рождения</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-start text-left font-normal bg-card border-input hover:bg-card/90"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {dob ? (
                      dob.toLocaleDateString("ru-RU")
                    ) : (
                      <span className="text-muted-foreground">дд.мм.гггг</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto border-none bg-transparent p-0 shadow-none"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={dob}
                    onSelect={setDob}
                    locale={ru}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="add-phone">Телефон</Label>
              <PhoneInput
                id="add-phone"
                value={form.phone}
                onChange={value => setForm(f => ({ ...f, phone: value }))}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="add-notes">Заметки</Label>
              <Textarea
                id="add-notes"
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {formError && (
              <Alert variant="destructive" className="md:col-span-2">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Сохраняем..." : "Добавить клиента"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: профиль клиента */}
      <Dialog
        open={!!profileClient}
        onOpenChange={open => { if (!open) setProfileClient(null); }}
      >
        <DialogContent className="max-w-3xl">
          {profileClient && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">
                  Профиль клиента {profileClient.lastName} {profileClient.firstName}
                </DialogTitle>
              </DialogHeader>
              <PsychologistClientProfile
                id={profileClient.id}
                email={profileClient.email ?? null}
                hasAccount={profileClient.hasAccount}
                firstName={profileClient.firstName}
                lastName={profileClient.lastName}
                dateOfBirth={profileClient.dateOfBirth ?? null}
                phone={profileClient.phone ?? null}
                notes={profileClient.notes ?? null}
                createdAt={profileClient.createdAt}
                onDeleted={async () => {
                  setProfileClient(null);
                  await loadClients();
                }}
                onUpdated={next => {
                  setClients(prev =>
                    prev.map(c =>
                      c.id === profileClient.id
                        ? {
                            ...c,
                            firstName: next.firstName,
                            lastName: next.lastName,
                            email: next.email ?? null,
                            phone: next.phone ?? null,
                            notes: next.notes ?? null,
                            dateOfBirth: next.dateOfBirth ?? null
                          }
                        : c
                    )
                  );
                  setProfileClient(prev =>
                    prev
                      ? {
                          ...prev,
                          firstName: next.firstName,
                          lastName: next.lastName,
                          email: next.email ?? null,
                          phone: next.phone ?? null,
                          notes: next.notes ?? null,
                          dateOfBirth: next.dateOfBirth ?? null
                        }
                      : prev
                  );
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
