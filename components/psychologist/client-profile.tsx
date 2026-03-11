"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar as CalendarIcon, Mail, Pencil, Trash2, UserCheck, Paperclip, Download, Trash, GripVertical } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { CountryAutocomplete, CityAutocomplete } from "@/components/ui/location-autocomplete";
import { getCountryCodeByName } from "@/lib/data/countries-ru";
import { ClientAppointments } from "@/components/psychologist/client-appointments";

const MARITAL_OPTIONS: { value: string; label: string }[] = [
  { value: "single", label: "Не в браке" },
  { value: "married", label: "В браке" },
  { value: "divorced", label: "В разводе" },
  { value: "widowed", label: "Вдовец / Вдова" },
  { value: "unspecified", label: "Не указано" }
];

function SortableFieldWrap({
  id,
  isEditing,
  children
}: {
  id: string;
  isEditing: boolean;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 items-start ${isDragging ? "opacity-50 shadow-md rounded-md z-10 bg-card" : ""}`}
    >
      {isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="mt-1.5 flex shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground rounded p-0.5"
          aria-label="Перетащить для смены порядка"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      {children}
    </div>
  );
}

type ClientProfileProps = {
  id: string;
  email: string | null;
  hasAccount?: boolean;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  gender: string | null;
  maritalStatus: string | null;
  notes: string | null;
  createdAt: string;
  onDeleted?: () => void;
  onUpdated?: (next: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    country: string | null;
    city: string | null;
    gender: string | null;
    maritalStatus: string | null;
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
  const [country, setCountry] = useState(props.country ?? "");
  const [city, setCity] = useState(props.city ?? "");
  const [countryCode, setCountryCode] = useState<string | null>(
    props.country ? getCountryCodeByName(props.country) : null
  );
  const [gender, setGender] = useState(props.gender ?? "");
  const [maritalStatus, setMaritalStatus] = useState(props.maritalStatus ?? "");
  const [notes, setNotes] = useState(props.notes ?? "");
  const [dob, setDob] = useState<Date | undefined>(
    props.dateOfBirth ? new Date(props.dateOfBirth) : undefined
  );
  const hasAccount = props.hasAccount ?? false;
  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [customFieldsSaving, setCustomFieldsSaving] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

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
  const [customTabsEdit, setCustomTabsEdit] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCountry(props.country ?? "");
    setCity(props.city ?? "");
    setCountryCode(props.country ? getCountryCodeByName(props.country) : null);
    setGender(props.gender ?? "");
    setMaritalStatus(props.maritalStatus ?? "");
  }, [props.country, props.city, props.gender, props.maritalStatus]);

  const refetchCustomFieldDefs = useCallback(() => {
    setCustomFieldsLoading(true);
    fetch(`/api/psychologist/clients/${props.id}/custom-fields`)
      .then((r) => (r?.ok ? r.json() : null))
      .then((data) => {
        if (data?.definitions) setCustomFieldDefs(data.definitions);
        if (data?.values) setCustomFieldValues(data.values);
      })
      .catch(() => {})
      .finally(() => setCustomFieldsLoading(false));
  }, [props.id]);

  const sortableSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    refetchCustomFieldDefs();

    setFilesLoading(true);
    setFilesError(null);
    fetch(`/api/psychologist/clients/${props.id}/files`)
      .then((r) => (r?.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.files)) setFiles(data.files);
      })
      .catch((err) => {
        console.error(err);
        setFilesError("Не удалось загрузить файлы клиента");
      })
      .finally(() => setFilesLoading(false));
  }, [props.id, refetchCustomFieldDefs]);

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

  const groupDescriptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const def of customFieldDefs) {
      const group =
        def.group && typeof def.group === "string"
          ? (def.group as string).trim()
          : "";
      if (!group || map.has(group)) continue;
      if (typeof def.description === "string") {
        const desc = (def.description as string).trim();
        if (desc) {
          map.set(group, desc);
        }
      }
    }
    return map;
  }, [customFieldDefs]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        firstName,
        lastName,
        phone: phone || undefined,
        country: country.trim() || null,
        city: city.trim() || null,
        gender: gender || null,
        maritalStatus: maritalStatus || null,
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
          country: country.trim() || null,
          city: city.trim() || null,
          gender: gender || null,
          maritalStatus: maritalStatus || null,
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
            <TabsTrigger value="profile">Личные данные</TabsTrigger>
            {Array.from(
              new Set(
                customFieldDefs
                  .map((d) => (d.group && typeof d.group === "string" ? d.group.trim() : ""))
                  .filter((g) => g.length > 0)
              )
            ).map((group) => (
              <TabsTrigger key={`cf-${group}`} value={`cf-${group}`}>
                {group}
              </TabsTrigger>
            ))}
            <TabsTrigger value="diagnostics">
              Психологическая диагностика
            </TabsTrigger>
            <TabsTrigger value="appointments">Записи</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="profile"
          className="mt-3 space-y-4 rounded-lg border bg-card p-4 max-h-[70vh] overflow-y-auto"
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
            <div className="space-y-1">
              <Label htmlFor="client-country" className="text-xs">
                Страна
              </Label>
              <CountryAutocomplete
                id="client-country"
                value={country}
                onChange={(name, code) => {
                  setCountry(name);
                  setCountryCode(code || null);
                  if (!name) setCity("");
                }}
                placeholder="Начните вводить страну"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-city" className="text-xs">
                Город
              </Label>
              <CityAutocomplete
                id="client-city"
                value={city}
                onChange={setCity}
                countryCode={countryCode}
                placeholder="Начните вводить город"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Пол</Label>
              <RadioGroup
                value={gender}
                onValueChange={setGender}
                className="flex flex-wrap gap-4"
                disabled={!isEditing}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="male" id="client-gender-male" />
                  <Label htmlFor="client-gender-male" className="font-normal cursor-pointer text-xs">
                    Мужской
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="female" id="client-gender-female" />
                  <Label htmlFor="client-gender-female" className="font-normal cursor-pointer text-xs">
                    Женский
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-marital" className="text-xs">
                Семейное положение
              </Label>
              <Select
                value={maritalStatus || "unspecified"}
                onValueChange={setMaritalStatus}
                disabled={!isEditing}
              >
                <SelectTrigger id="client-marital">
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {Array.from(
          new Set(
            customFieldDefs
              .map((d) => (d.group && typeof d.group === "string" ? d.group.trim() : ""))
              .filter((g) => g.length > 0)
          )
        ).map((group) => {
          const groupId = `cf-${group}`;
          const defsForGroup = customFieldDefs.filter(
            (d) => (d.group && typeof d.group === "string" ? d.group.trim() : "") === group
          );
          if (defsForGroup.length === 0) return null;
          const groupDescription =
            groupDescriptions.get(group) ??
            "Дополнительные данные клиента. Видны только вам.";
          const isEditingGroup = customTabsEdit[groupId] ?? false;
          return (
            <TabsContent
              key={groupId}
              value={groupId}
              className="mt-3 flex flex-col rounded-lg border bg-card p-4 min-h-[420px] max-h-[70vh] overflow-hidden"
            >
              <div className="flex-none space-y-1">
                <h3 className="text-base font-semibold leading-none tracking-tight">
                  {group}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {groupDescription}
                </p>
              </div>

              {customFieldsLoading ? (
                <p className="flex-1 text-sm text-muted-foreground pt-2">Загружаем поля…</p>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setCustomFieldsSaving(true);
                    try {
                      const res = await fetch(
                        `/api/psychologist/clients/${props.id}/custom-fields`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ values: customFieldValues })
                        }
                      );
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        console.error(data);
                        return;
                      }
                      setCustomTabsEdit((prev) => ({ ...prev, [groupId]: false }));
                    } finally {
                      setCustomFieldsSaving(false);
                    }
                  }}
                  className="flex-1 min-h-0 flex flex-col gap-3"
                >
                  <div
                    className={`flex-1 min-h-0 overflow-y-auto grid gap-3 md:grid-cols-2 content-start ${
                      !isEditingGroup
                        ? "pointer-events-none [&_input]:cursor-text [&_button]:cursor-text [&_[data-radix-select-trigger]]:cursor-text"
                        : ""
                    }`}
                  >
                    {isEditingGroup ? (
                      <DndContext
                        sensors={sortableSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={async (event: DragEndEvent) => {
                          const { active, over } = event;
                          if (!over || active.id === over.id) return;
                          const ids = defsForGroup.map((d) => d.id);
                          const oldIndex = ids.indexOf(active.id as string);
                          const newIndex = ids.indexOf(over.id as string);
                          if (oldIndex === -1 || newIndex === -1) return;
                          const reordered = arrayMove(defsForGroup, oldIndex, newIndex);
                          try {
                            const results = await Promise.all(
                              reordered.map((field, order) =>
                                fetch("/api/psychologist/custom-fields", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: field.id, order })
                                })
                              )
                            );
                            if (results.every((r) => r.ok)) refetchCustomFieldDefs();
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      >
                        <SortableContext
                          items={defsForGroup.map((d) => d.id)}
                          strategy={rectSortingStrategy}
                        >
                          {defsForGroup.map((def) => {
                            const value = customFieldValues[def.id];
                            const label = def.label as string;
                            const type = def.type as string;
                            const selectOptions: { value: string; label: string }[] =
                              def.options?.selectOptions ?? [];

                            function updateValue(next: any) {
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [def.id]: next
                              }));
                            }

                            return (
                              <SortableFieldWrap key={def.id} id={def.id} isEditing={true}>
                                <div className="space-y-1 flex-1 min-w-0">
                                  <Label className="text-xs">{label}</Label>
                          {type === "TEXT" && (
                            <Input
                              value={typeof value === "string" ? value : ""}
                              onChange={(e) => updateValue(e.target.value)}
                            />
                          )}
                          {type === "MULTILINE" && (
                            <Textarea
                              rows={3}
                              value={typeof value === "string" ? value : ""}
                              onChange={(e) => updateValue(e.target.value)}
                            />
                          )}
                          {type === "NUMBER" && (
                            <Input
                              type="number"
                              value={
                                typeof value === "number"
                                  ? String(value)
                                  : typeof value === "string"
                                  ? value
                                  : ""
                              }
                              onChange={(e) =>
                                updateValue(
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                            />
                          )}
                          {type === "DATE" && (
                            <Input
                              type="date"
                              value={
                                typeof value === "string" && value
                                  ? value.slice(0, 10)
                                  : ""
                              }
                              onChange={(e) =>
                                updateValue(
                                  e.target.value ? `${e.target.value}T00:00:00.000Z` : null
                                )
                              }
                            />
                          )}
                          {type === "BOOLEAN" && (
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={value === true}
                                onChange={(e) => updateValue(e.target.checked)}
                              />
                              <span className="text-xs text-muted-foreground">
                                {(def.options as { booleanLabel?: string } | null)?.booleanLabel ??
                                  "Опция"}
                              </span>
                            </div>
                          )}
                          {type === "SELECT" && (
                            <Select
                              value={typeof value === "string" ? value : ""}
                              onValueChange={(v) => updateValue(v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {type === "MULTI_SELECT" && (
                            <div className="space-y-1 rounded-md border bg-background px-2 py-2">
                              {selectOptions.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  Опции не настроены.
                                </p>
                              ) : (
                                selectOptions.map((opt) => {
                                  const current: string[] = Array.isArray(value)
                                    ? value
                                    : [];
                                  const checked = current.includes(opt.value);
                                  return (
                                    <label
                                      key={opt.value}
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          const next = new Set(current);
                                          if (e.target.checked) {
                                            next.add(opt.value);
                                          } else {
                                            next.delete(opt.value);
                                          }
                                          updateValue(Array.from(next));
                                        }}
                                      />
                                      <span>{opt.label}</span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          )}
                                </div>
                              </SortableFieldWrap>
                            );
                          })}
                        </SortableContext>
                      </DndContext>
                    ) : (
                      defsForGroup.map((def) => {
                        const value = customFieldValues[def.id];
                        const label = def.label as string;
                        const type = def.type as string;
                        const selectOptions: { value: string; label: string }[] =
                          def.options?.selectOptions ?? [];

                        function updateValue(next: any) {
                          setCustomFieldValues((prev) => ({
                            ...prev,
                            [def.id]: next
                          }));
                        }

                        return (
                          <div key={def.id} className="flex gap-2 items-start">
                            <div className="space-y-1 flex-1 min-w-0">
                              <Label className="text-xs">{label}</Label>
                              {type === "TEXT" && (
                                <Input
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => updateValue(e.target.value)}
                                />
                              )}
                              {type === "MULTILINE" && (
                                <Textarea
                                  rows={3}
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => updateValue(e.target.value)}
                                />
                              )}
                              {type === "NUMBER" && (
                                <Input
                                  type="number"
                                  value={
                                    typeof value === "number"
                                      ? String(value)
                                      : typeof value === "string"
                                        ? value
                                        : ""
                                  }
                                  onChange={(e) =>
                                    updateValue(
                                      e.target.value === "" ? null : Number(e.target.value)
                                    )
                                  }
                                />
                              )}
                              {type === "DATE" && (
                                <Input
                                  type="date"
                                  value={
                                    typeof value === "string" && value
                                      ? value.slice(0, 10)
                                      : ""
                                  }
                                  onChange={(e) =>
                                    updateValue(
                                      e.target.value ? `${e.target.value}T00:00:00.000Z` : null
                                    )
                                  }
                                />
                              )}
                              {type === "BOOLEAN" && (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={value === true}
                                    onChange={(e) => updateValue(e.target.checked)}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {(def.options as { booleanLabel?: string } | null)?.booleanLabel ??
                                      "Опция"}
                                  </span>
                                </div>
                              )}
                              {type === "SELECT" && (
                                <Select
                                  value={typeof value === "string" ? value : ""}
                                  onValueChange={(v) => updateValue(v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectOptions.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {type === "MULTI_SELECT" && (
                                <div className="space-y-1 rounded-md border bg-background px-2 py-2">
                                  {selectOptions.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      Опции не настроены.
                                    </p>
                                  ) : (
                                    selectOptions.map((opt) => {
                                      const current: string[] = Array.isArray(value)
                                        ? value
                                        : [];
                                      const checked = current.includes(opt.value);
                                      return (
                                        <label
                                          key={opt.value}
                                          className="flex items-center gap-2 text-xs"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => {
                                              const next = new Set(current);
                                              if (e.target.checked) {
                                                next.add(opt.value);
                                              } else {
                                                next.delete(opt.value);
                                              }
                                              updateValue(Array.from(next));
                                            }}
                                          />
                                          <span>{opt.label}</span>
                                        </label>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex-none flex items-center justify-between gap-3 pt-2 border-t">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={isEditingGroup ? "secondary" : "outline"}
                            size="icon"
                            disabled={customFieldsSaving}
                            onClick={() =>
                              setCustomTabsEdit((prev) => ({
                                ...prev,
                                [groupId]: !isEditingGroup
                              }))
                            }
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">
                              {isEditingGroup
                                ? "Завершить редактирование"
                                : "Редактировать"}
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isEditingGroup
                            ? "Завершить редактирование дополнительных полей"
                            : "Редактировать дополнительные поля"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {isEditingGroup && (
                      <Button
                        type="submit"
                        disabled={customFieldsSaving}
                      >
                        {customFieldsSaving ? "Сохраняем…" : "Сохранить изменения"}
                      </Button>
                    )}
                  </div>
                </form>
              )}

              {group.toLowerCase() === "файлы" && (
                <div className="pt-4 border-t mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Файлы в профиле</p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const input = e.currentTarget.elements
                          .namedItem("file") as HTMLInputElement | null;
                        if (!input?.files || !input.files[0]) return;
                        const file = input.files[0];
                        const form = new FormData();
                        form.append("file", file);
                        setFilesLoading(true);
                        setFilesError(null);
                        try {
                          const res = await fetch(
                            `/api/psychologist/clients/${props.id}/files`,
                            {
                              method: "POST",
                              body: form
                            }
                          );
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            setFilesError(
                              data?.message ?? "Не удалось загрузить файл"
                            );
                          } else {
                            setFiles((prev) => [data, ...prev]);
                            if (input) input.value = "";
                          }
                        } catch (err) {
                          console.error(err);
                          setFilesError("Не удалось загрузить файл");
                        } finally {
                          setFilesLoading(false);
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="file"
                        name="file"
                        className="hidden"
                        id={`client-file-${props.id}`}
                      />
                      <label htmlFor={`client-file-${props.id}`}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="h-4 w-4" />
                            Прикрепить файл
                          </span>
                        </Button>
                      </label>
                    </form>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    До 10 файлов, не более 5 МБ каждый. Форматы: изображения, PDF, DOC/DOCX.
                  </p>

                  {filesError && (
                    <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                      {filesError}
                    </div>
                  )}

                  {filesLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Загружаем список файлов…
                    </p>
                  ) : files.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Пока нет прикреплённых файлов.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {files.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{f.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {(f.size / 1024).toFixed(1)} КБ ·{" "}
                              {new Date(f.createdAt).toLocaleDateString("ru-RU")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              asChild
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                            >
                              <a href={f.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={async () => {
                                try {
                                  const res = await fetch(
                                    `/api/psychologist/clients/${props.id}/files/${f.id}`,
                                    { method: "DELETE" }
                                  );
                                  if (res.ok) {
                                    setFiles((prev) =>
                                      prev.filter((file) => file.id !== f.id)
                                    );
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          );
        })}

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

