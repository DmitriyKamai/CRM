"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Mail, Pencil, Trash2, UserCheck } from "lucide-react";
import { ru } from "date-fns/locale";
import { useRouter } from "next/navigation";

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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { ClientAppointments } from "@/components/psychologist/client-appointments";

type ClientProfileProps = {
  id: string;
  email: string | null;
  hasAccount?: boolean;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  onDeleted?: () => void;
  onUpdated?: (next: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    dateOfBirth: string | null;
  }) => void;
  diagnostics?: {
    id: string;
    testTitle: string;
    createdAt: string;
    interpretation: string | null;
  }[];
};

export function PsychologistClientProfile(props: ClientProfileProps) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [firstName, setFirstName] = useState(props.firstName);
  const [lastName, setLastName] = useState(props.lastName);
  const [email, setEmail] = useState(props.email ?? "");
  const [phone, setPhone] = useState(props.phone ?? "");
  const [notes, setNotes] = useState(props.notes ?? "");
  const [dob, setDob] = useState<Date | undefined>(
    props.dateOfBirth ? new Date(props.dateOfBirth) : undefined
  );
  const hasAccount = props.hasAccount ?? false;

  type DiagnosticItem = {
    id: string;
    testTitle: string;
    createdAt: string;
    interpretation: string | null;
  };
  const [diagnosticsList, setDiagnosticsList] = useState<DiagnosticItem[]>(
    props.diagnostics ?? []
  );
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsTabActive, setDiagnosticsTabActive] = useState(false);

  useEffect(() => {
    if (!diagnosticsTabActive || !props.id) return;
    setDiagnosticsLoading(true);
    fetch(`/api/psychologist/clients/${props.id}/diagnostics`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { diagnostics?: DiagnosticItem[] } | null) => {
        if (Array.isArray(data?.diagnostics)) setDiagnosticsList(data.diagnostics);
      })
      .catch(() => {})
      .finally(() => setDiagnosticsLoading(false));
  }, [diagnosticsTabActive, props.id]);

  function formatDate(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("ru-RU");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        firstName,
        lastName,
        phone: phone || undefined,
        notes: notes || undefined,
        dateOfBirth: dob ? dob.toISOString() : undefined
      };
      if (!hasAccount) {
        body.email = email.trim() || "";
      }

      const res = await fetch(`/api/psychologist/clients/${props.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось сохранить профиль");
      }
      setIsEditing(false);

      if (props.onUpdated) {
        props.onUpdated({
          firstName,
          lastName,
          email: email.trim() || null,
          phone: phone || null,
          notes: notes || null,
          dateOfBirth: dob ? dob.toISOString() : null
        });
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить профиль"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSendRegistrationInvite() {
    if (hasAccount) return;
    const targetEmail = (email || "").trim() || props.email || "";
    if (!targetEmail) return;

    try {
      const res = await fetch(`/api/psychologist/clients/${props.id}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.message ??
            "Не удалось отправить приглашение. Проверьте настройки почты на сервере."
        );
        return;
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Не удалось отправить приглашение. Попробуйте позже.");
    }
  }

  function openDeleteDialog() {
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    setDeleteDialogOpen(false);
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/psychologist/clients/${props.id}`, {
        method: "DELETE"
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось удалить клиента");
      }

      if (props.onDeleted) {
        props.onDeleted();
      } else {
        router.push("/psychologist/clients");
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Не удалось удалить клиента"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить клиента из списка?</AlertDialogTitle>
            <AlertDialogDescription>
              Удалить этого клиента из вашего списка? Его записи и тесты в системе сохранены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs
        defaultValue="profile"
        onValueChange={(v) => setDiagnosticsTabActive(v === "diagnostics")}
      >
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="profile">Профиль</TabsTrigger>
            <TabsTrigger value="diagnostics">
              Психологическая диагностика
            </TabsTrigger>
            <TabsTrigger value="appointments">Записи</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="profile"
          className="mt-3 space-y-4 rounded-lg border bg-card p-4 min-h-[420px] max-h-[70vh] overflow-y-auto"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold leading-none tracking-tight">
                {props.lastName} {props.firstName}
              </span>
              {hasAccount && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none cursor-help">
                        <UserCheck className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Зарегистрирован</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Клиент зарегистрирован
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {props.email ?? "Email ещё не указан"} · Создан{" "}
              {formatDate(props.createdAt)}
            </div>
          </div>

          <form
            onSubmit={handleSave}
            className="grid gap-3 md:grid-cols-2"
          >
            <div className="space-y-1">
              <Label htmlFor="firstName" className="text-xs">
                Имя
              </Label>
              <Input
                id="firstName"
                required
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                disabled={!isEditing}
                style={!isEditing ? { cursor: "text" } : undefined}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName" className="text-xs">
                Фамилия
              </Label>
              <Input
                id="lastName"
                required
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                disabled={!isEditing}
                style={!isEditing ? { cursor: "text" } : undefined}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-email" className="text-xs">
                Email
                {hasAccount && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    (из аккаунта, изменить нельзя)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={!isEditing || hasAccount}
                  placeholder={hasAccount ? undefined : "Для связки при регистрации"}
                  style={!isEditing || hasAccount ? { cursor: "text" } : undefined}
                  className="pr-8"
                />
                {!hasAccount && email.trim() && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleSendRegistrationInvite}
                          className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                          aria-label="Отправить приглашение зарегистрироваться"
                        >
                          <Mail className="h-4 w-4" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Отправить приглашение зарегистрироваться
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Дата рождения</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-start text-left font-normal bg-[hsl(var(--input-bg))] border-input text-sm hover:bg-[hsl(var(--input-bg))]/90"
                    disabled={!isEditing}
                    style={!isEditing ? { cursor: "text" } : undefined}
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
                    defaultMonth={dob ?? new Date()}
                    captionLayout="dropdown"
                    startMonth={new Date(1920, 0)}
                    endMonth={new Date()}
                    reverseYears
                    hideNavigation
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs">
                Телефон
              </Label>
              <PhoneInput
                id="phone"
                value={phone}
                onChange={value => setPhone(value)}
                disabled={!isEditing}
                style={!isEditing ? { cursor: "text" } : undefined}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="notes" className="text-xs">
                Заметки
              </Label>
              <Textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={!isEditing}
                style={!isEditing ? { cursor: "text" } : undefined}
              />
            </div>

            {error && (
              <div className="md:col-span-2 rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {error}
              </div>
            )}

            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={isEditing ? "secondary" : "outline"}
                        size="icon"
                        disabled={deleting || saving}
                        onClick={openDeleteDialog}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Удалить клиента</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Удалить клиента</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={isEditing ? "secondary" : "outline"}
                        size="icon"
                        onClick={() => setIsEditing(prev => !prev)}
                        disabled={saving || deleting}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">
                          {isEditing ? "Завершить редактирование" : "Редактировать профиль"}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isEditing ? "Завершить редактирование" : "Редактировать профиль"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              {isEditing && (
                <Button type="submit" disabled={saving || deleting}>
                  {saving ? "Сохраняем..." : "Сохранить изменения"}
                </Button>
              )}
            </div>
          </form>
        </TabsContent>

        <TabsContent
          value="diagnostics"
          className="mt-3 space-y-3 rounded-lg border bg-card p-4 min-h-[420px] max-h-[70vh] overflow-y-auto"
        >
          {diagnosticsLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка результатов…</p>
          ) : diagnosticsList.length > 0 ? (
            <ul className="space-y-2">
              {diagnosticsList.map((result) => (
                <li
                  key={result.id}
                  className="rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{result.testTitle}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(result.createdAt)}
                    </span>
                  </div>
                  {result.interpretation && (
                    <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line">
                      {result.interpretation}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Результаты психологической диагностики для этого клиента пока не сохранены.
            </p>
          )}
        </TabsContent>

        <TabsContent
          value="appointments"
          className="mt-3 space-y-3 rounded-lg border bg-card p-4 min-h-[420px] max-h-[70vh] overflow-y-auto"
        >
          <ClientAppointments clientId={props.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

