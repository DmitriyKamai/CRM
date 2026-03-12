"use client";

import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, UserCheck, Users, Plus, Trash2, X, Search } from "lucide-react";
import { ru } from "date-fns/locale";

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
import { PhoneInput, formatPhoneDisplay } from "@/components/ui/phone-input";
import { PsychologistClientProfile } from "@/components/psychologist/client-profile";
import { cn } from "@/lib/utils";

type ClientDto = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  notes?: string | null;
  createdAt: string;
  hasAccount?: boolean;
};

const AVATAR_COLORS = [
  "bg-rose-200 text-rose-800",
  "bg-violet-200 text-violet-800",
  "bg-sky-200 text-sky-800",
  "bg-emerald-200 text-emerald-800",
  "bg-amber-200 text-amber-800",
  "bg-pink-200 text-pink-800",
  "bg-teal-200 text-teal-800",
  "bg-indigo-200 text-indigo-800",
];

function getClientColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function ClientAvatar({ client, size = "md" }: { client: ClientDto; size?: "sm" | "md" }) {
  const initials = `${client.firstName[0] ?? ""}${client.lastName[0] ?? ""}`.toUpperCase();
  const color = getClientColor(client.id);
  return (
    <div className={cn(
      "rounded-full flex items-center justify-center font-semibold shrink-0",
      color,
      size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
    )}>
      {initials}
    </div>
  );
}

export function PsychologistClientsList() {
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientDto | null>(null);

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

  const [search, setSearch] = useState("");
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      if (!res.ok) throw new Error(data?.message ?? "Не удалось удалить выбранных клиентов");
      if (selectedClient && selectedIds.has(selectedClient.id)) setSelectedClient(null);
      setSelectedIds(new Set());
      setMultiSelectMode(false);
      await loadClients();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось удалить выбранных клиентов");
    } finally {
      setBulkDeleting(false);
    }
  }

  const filtered = clients.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden justify-center">
      {/* Список клиентов как одиночная колонка */}
      <div className="flex flex-col w-full max-w-3xl border bg-background overflow-hidden rounded-lg">
        {/* Panel header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b shrink-0">
          <h2 className="text-sm font-semibold">Клиенты</h2>
          <div className="flex items-center gap-1">
            {multiSelectMode ? (
              <>
                {selectedIds.size > 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={bulkDeleting}
                    title={`Удалить выбранных (${selectedIds.size})`}
                    onClick={() => setBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground"
                  title="Отменить выделение"
                  onClick={() => { setSelectedIds(new Set()); setMultiSelectMode(false); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Выбрать несколько"
                  onClick={() => setMultiSelectMode(true)}
                >
                  <input type="checkbox" className="h-3.5 w-3.5 pointer-events-none" readOnly />
                </Button>
                <Button
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Добавить
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 pt-2 shrink-0">
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
              <div className="rounded-full bg-muted p-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              {search ? (
                <p className="text-sm text-muted-foreground">Ничего не найдено</p>
              ) : (
                <>
                  <p className="text-sm font-medium">Нет клиентов</p>
                  <p className="text-xs text-muted-foreground">Добавьте первого клиента, чтобы начать работу</p>
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Добавить клиента
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {filtered.map(client => {
                const isSelected = selectedClient?.id === client.id;
                const isChecked = selectedIds.has(client.id);
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      if (multiSelectMode) {
                        toggleOne(client.id);
                      } else {
                        setSelectedClient(client);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left transition-colors",
                      isSelected && !multiSelectMode
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    {multiSelectMode && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(client.id)}
                        onClick={e => e.stopPropagation()}
                        className="h-3.5 w-3.5 shrink-0"
                      />
                    )}
                    <ClientAvatar client={client} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-medium truncate leading-tight">
                          {client.lastName} {client.firstName}
                        </span>
                        {client.hasAccount && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <UserCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Клиент зарегистрирован</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                        {client.email ?? formatPhoneDisplay(client.phone) ?? "—"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Multi-select summary */}
        {multiSelectMode && selectedIds.size > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground shrink-0">
            Выбрано: {selectedIds.size}
          </div>
        )}
      </div>

      {/* Bulk delete confirmation */}
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
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог добавления клиента */}
      <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) setFormError(null); }}>
        <DialogContent className="max-w-2xl">
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
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {dob ? dob.toLocaleDateString("ru-RU") : <span className="text-muted-foreground">дд.мм.гггг</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-none bg-transparent p-0 shadow-none" align="start">
                  <Calendar mode="single" selected={dob} onSelect={setDob} locale={ru} initialFocus />
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

      {/* Диалог профиля клиента */}
      <Dialog
        open={!!selectedClient}
        onOpenChange={open => {
          if (!open) setSelectedClient(null);
        }}
      >
        {selectedClient && (
          <DialogContent className="max-w-5xl w-full p-0">
            <div className="flex flex-col h-[80vh]">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 px-2"
                  onClick={() => setSelectedClient(null)}
                >
                  <span className="text-lg leading-none">←</span>
                  <span className="text-sm">Вернуться назад</span>
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <PsychologistClientProfile
                  key={selectedClient.id}
                  id={selectedClient.id}
                  email={selectedClient.email ?? null}
                  hasAccount={selectedClient.hasAccount}
                  firstName={selectedClient.firstName}
                  lastName={selectedClient.lastName}
                  dateOfBirth={selectedClient.dateOfBirth ?? null}
                  phone={selectedClient.phone ?? null}
                  country={selectedClient.country ?? null}
                  city={selectedClient.city ?? null}
                  gender={selectedClient.gender ?? null}
                  maritalStatus={selectedClient.maritalStatus ?? null}
                  notes={selectedClient.notes ?? null}
                  createdAt={selectedClient.createdAt}
                  onDeleted={async () => {
                    setSelectedClient(null);
                    await loadClients();
                  }}
                  onUpdated={next => {
                    setClients(prev =>
                      prev.map(c =>
                        c.id === selectedClient.id
                          ? {
                              ...c,
                              firstName: next.firstName,
                              lastName: next.lastName,
                              email: next.email ?? null,
                              phone: next.phone ?? null,
                              country: next.country ?? null,
                              city: next.city ?? null,
                              gender: next.gender ?? null,
                              maritalStatus: next.maritalStatus ?? null,
                              notes: next.notes ?? null,
                              dateOfBirth: next.dateOfBirth ?? null
                            }
                          : c
                      )
                    );
                    setSelectedClient(prev =>
                      prev
                        ? {
                            ...prev,
                            firstName: next.firstName,
                            lastName: next.lastName,
                            email: next.email ?? null,
                            phone: next.phone ?? null,
                            country: next.country ?? null,
                            city: next.city ?? null,
                            gender: next.gender ?? null,
                            maritalStatus: next.maritalStatus ?? null,
                            notes: next.notes ?? null,
                            dateOfBirth: next.dateOfBirth ?? null
                          }
                        : prev
                    );
                  }}
                />
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
