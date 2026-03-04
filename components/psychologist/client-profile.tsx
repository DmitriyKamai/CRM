"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Pencil, Trash2 } from "lucide-react";
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
  const [phone, setPhone] = useState(props.phone ?? "");
  const [notes, setNotes] = useState(props.notes ?? "");
  const [dob, setDob] = useState<Date | undefined>(
    props.dateOfBirth ? new Date(props.dateOfBirth) : undefined
  );

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
      const body = {
        firstName,
        lastName,
        phone: phone || undefined,
        notes: notes || undefined,
        dateOfBirth: dob ? dob.toISOString() : undefined
      };

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

      <Tabs defaultValue="profile">
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
            <div className="text-base font-semibold leading-none tracking-tight">
              {props.lastName} {props.firstName}
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
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Дата рождения</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-start text-left font-normal bg-card border-input text-sm hover:bg-card/90"
                    disabled={!isEditing}
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
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs">
                Телефон
              </Label>
              <PhoneInput
                id="phone"
                value={phone}
                onChange={value => setPhone(value)}
                disabled={!isEditing}
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
          {props.diagnostics && props.diagnostics.length > 0 ? (
            <ul className="space-y-2">
              {props.diagnostics.map(result => (
                <li
                  key={result.id}
                  className="rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {result.testTitle}
                    </span>
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

