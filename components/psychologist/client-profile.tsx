"use client";

import { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
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
import {
  Paperclip,
  Download,
  Trash,
} from "lucide-react";
import { ru } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { formatPhoneDisplay, phoneToTelHref } from "@/components/ui/phone-input";
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
// Импорты из профиля вынесены в отдельные компоненты, поэтому эти UI-провайдеры
// больше не требуются здесь.
import { getCountryCodeByName } from "@/lib/data/countries-ru";
import { ClientAppointments } from "@/components/psychologist/client-appointments";
import { ClientHistoryPanel } from "@/components/psychologist/client-history-panel";
import { cn } from "@/lib/utils";
import { shouldCloseCalendarPopoverAfterSelect } from "@/lib/close-calendar-popover";
import { ClientProfileTabsNav } from "@/components/psychologist/client-profile-tabs-nav";
import { ClientProfileHeader } from "@/components/psychologist/client-profile-header";
import { ClientProfileProfileTab } from "@/components/psychologist/client-profile-profile-tab";
import { useClientProfileTabsScrollState } from "@/hooks/use-client-profile-tabs-scroll";

const FIELD_ROW_CLASS = "flex flex-col gap-1 py-3 border-b border-border last:border-b-0 md:flex-row md:items-center md:gap-4";
const FIELD_LABEL_CLASS = "text-sm text-muted-foreground shrink-0 w-full md:w-[200px]";
const FIELD_VALUE_CLASS = "min-w-0 w-full md:min-w-[28rem] md:w-fit";
const PLAIN_INPUT_CLASS =
  "border-0 bg-transparent shadow-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto py-0 min-h-0 w-full min-w-0 md:w-auto md:min-w-[28rem]";

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
      className={`group flex gap-2 items-stretch ${isDragging ? "opacity-50 shadow-md rounded-md z-10 bg-card" : ""}`}
    >
      {isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="relative flex shrink-0 w-6 cursor-grab active:cursor-grabbing touch-none text-muted-foreground rounded self-stretch min-h-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Перетащить для смены порядка"
        >
          <div className="absolute inset-0 flex items-stretch justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 5 16"
              fill="currentColor"
              className="block h-full w-auto min-w-3 shrink-0 text-muted-foreground"
              aria-hidden
            >
              <circle cx="1.57" cy="2" r="0.3" />
              <circle cx="1.57" cy="3.86" r="0.3" />
              <circle cx="1.57" cy="5.71" r="0.3" />
              <circle cx="1.57" cy="7.57" r="0.3" />
              <circle cx="1.57" cy="9.43" r="0.3" />
              <circle cx="1.57" cy="11.29" r="0.3" />
              <circle cx="1.57" cy="13.14" r="0.3" />
              <circle cx="1.57" cy="15" r="0.3" />
              <circle cx="3.43" cy="2" r="0.3" />
              <circle cx="3.43" cy="3.86" r="0.3" />
              <circle cx="3.43" cy="5.71" r="0.3" />
              <circle cx="3.43" cy="7.57" r="0.3" />
              <circle cx="3.43" cy="9.43" r="0.3" />
              <circle cx="3.43" cy="11.29" r="0.3" />
              <circle cx="3.43" cy="13.14" r="0.3" />
              <circle cx="3.43" cy="15" r="0.3" />
            </svg>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

type ClientProfileProps = {
  id: string;
  /**
   * Передавайте явно с сервера (страница клиента и встроенный профиль в списке клиентов).
   * Если не передать, вкладки считаются включёнными (обратная совместимость).
   */
  schedulingEnabled?: boolean;
  diagnosticsEnabled?: boolean;
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
  statusId?: string | null;
  statusLabel?: string | null;
  statusColor?: string | null;
  avatarUrl?: string | null;
  /** Когда задано — режим редактирования управляется снаружи (кнопка в шапке страницы). Иначе кнопка внутри профиля. */
  isEditing?: boolean;
  onEditingChange?: (value: boolean) => void;
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
    statusId?: string | null;
    statusLabel?: string | null;
    statusColor?: string | null;
  }) => void;
  diagnostics?: {
    id: string;
    testTitle: string;
    createdAt: string;
    interpretation: string | null;
  }[];
};

type CustomFieldOption = { value: string; label: string };
type CustomFieldDef = {
  id: string;
  key?: string | null;
  label: string;
  type: string;
  group?: string | null;
  description?: string | null;
  options?: { selectOptions?: CustomFieldOption[] } | null;
};

type ClientFileItem = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

export type PsychologistClientProfileHandle = {
  saveAll: () => Promise<void>;
};

export const PsychologistClientProfile = forwardRef<
  PsychologistClientProfileHandle,
  ClientProfileProps
>(function PsychologistClientProfile(props, ref) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [isEditingState, setIsEditingState] = useState(false);
  const isEditing =
    props.onEditingChange !== undefined ? (props.isEditing ?? false) : isEditingState;
  const { onEditingChange } = props;
  const setEditing = useCallback(
    (value: boolean) => {
      if (onEditingChange) onEditingChange(value);
      else setIsEditingState(value);
    },
    [onEditingChange]
  );

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
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [cfDatePopoverFieldId, setCfDatePopoverFieldId] = useState<string | null>(null);
  const [statusId, setStatusId] = useState<string | null>(props.statusId ?? null);
  const [statusLabel, setStatusLabel] = useState<string | null>(props.statusLabel ?? null);
  const [statusColor, setStatusColor] = useState<string | null>(props.statusColor ?? null);
  type StatusItem = { id: string; label: string; color: string };
  const [statuses, setStatuses] = useState<StatusItem[]>([]);

  const hasAccount = props.hasAccount ?? false;
  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const [customFieldsSaving, setCustomFieldsSaving] = useState(false);
  const [files, setFiles] = useState<ClientFileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  type DiagnosticItem = {
    id: string;
    testTitle: string;
    createdAt: string;
    interpretation: string | null;
  };
  const [diagnosticsList, setDiagnosticsList] = useState<DiagnosticItem[]>(props.diagnostics ?? []);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsTabActive, setDiagnosticsTabActive] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [historyTick, setHistoryTick] = useState(0);
  const schedulingOn = props.schedulingEnabled !== false;
  const diagnosticsOn = props.diagnosticsEnabled !== false;

  useEffect(() => {
    if (!diagnosticsOn && activeTab === "diagnostics") setActiveTab("profile");
    if (!schedulingOn && activeTab === "appointments") setActiveTab("profile");
  }, [diagnosticsOn, schedulingOn, activeTab]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const syncTab = () => {
      if (mq.matches && activeTab === "history") setActiveTab("profile");
    };
    syncTab();
    mq.addEventListener("change", syncTab);
    return () => mq.removeEventListener("change", syncTab);
  }, [activeTab]);

  const currentStatus = useMemo(
    () =>
      statusId != null
        ? statuses.find((s) => s.id === statusId) ?? null
        : null,
    [statusId, statuses]
  );

  const {
    tabsScrollRef,
    tabsScrollLeft,
    tabsScrollRight,
    tabsHaveOverflow,
    updateTabsScrollState
  } = useClientProfileTabsScrollState(customFieldDefs.length);

  useEffect(() => {
    setFirstName(props.firstName);
    setLastName(props.lastName);
    setEmail(props.email ?? "");
    setPhone(props.phone ?? "");
    setNotes(props.notes ?? "");
    setDob(props.dateOfBirth ? new Date(props.dateOfBirth) : undefined);
    setCountry(props.country ?? "");
    setCity(props.city ?? "");
    setCountryCode(props.country ? getCountryCodeByName(props.country) : null);
    setGender(props.gender ?? "");
    setMaritalStatus(props.maritalStatus ?? "");
    setStatusId(props.statusId ?? null);
    setStatusLabel(props.statusLabel ?? null);
    setStatusColor(props.statusColor ?? null);
  }, [
    props.id,
    props.firstName, props.lastName, props.email, props.phone, props.notes, props.dateOfBirth,
    props.country, props.city, props.gender, props.maritalStatus,
    props.statusId, props.statusLabel, props.statusColor
  ]);

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
    if (!diagnosticsOn || !diagnosticsTabActive || !props.id) return;
    setDiagnosticsLoading(true);
    fetch(`/api/psychologist/clients/${props.id}/diagnostics`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { diagnostics?: DiagnosticItem[] } | null) => {
        if (Array.isArray(data?.diagnostics)) setDiagnosticsList(data.diagnostics);
      })
      .catch(() => {})
      .finally(() => setDiagnosticsLoading(false));
  }, [diagnosticsOn, diagnosticsTabActive, props.id]);

  useEffect(() => {
    fetch("/api/psychologist/client-statuses")
      .then((r) => (r?.ok ? r.json() : null))
      .then((data: { items?: StatusItem[] } | null) => {
        if (Array.isArray(data?.items)) setStatuses(data.items);
      })
      .catch(() => {});
  }, []);

  const [statusSaving, setStatusSaving] = useState(false);

  async function handleStatusChange(next: string) {
    const nextId = next === "__none__" ? null : next;
    const nextStatus =
      nextId != null ? statuses.find((s) => s.id === nextId) ?? null : null;
    setStatusSaving(true);
    setError(null);
    try {
      const body: { statusId: string | null } = { statusId: nextId };
      const res = await fetch(`/api/psychologist/clients/${props.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось обновить статус");
      }
      const appliedId = nextId;
      const appliedLabel = nextStatus?.label ?? null;
      const appliedColor = nextStatus?.color ?? null;
      setStatusId(appliedId);
      setStatusLabel(appliedLabel);
      setStatusColor(appliedColor);
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
          dateOfBirth: dob ? dob.toISOString() : null,
          statusId: appliedId,
          statusLabel: appliedLabel,
          statusColor: appliedColor
        });
      }
      setHistoryTick((t) => t + 1);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Не удалось обновить статус"
      );
    } finally {
      setStatusSaving(false);
    }
  }

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

  async function saveMainProfile(): Promise<void> {
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
      body.statusId = statusId;

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
          dateOfBirth: dob ? dob.toISOString() : null,
          statusId: statusId ?? null,
          statusLabel: statusLabel ?? null,
          statusColor: statusColor ?? null
        });
      }
      setHistoryTick((t) => t + 1);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить профиль"
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function saveCustomFields(): Promise<void> {
    setCustomFieldsSaving(true);
    setError(null);
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
        const msg = data?.message ?? "Не удалось сохранить пользовательские поля";
        setError(msg);
        throw new Error(msg);
      }
      setHistoryTick((t) => t + 1);
    } finally {
      setCustomFieldsSaving(false);
    }
  }

  async function saveAll() {
    try {
      await saveMainProfile();
      await saveCustomFields();
      setEditing(false);
    } catch {
      // ошибка уже в setError / отображена
    }
  }

  useImperativeHandle(ref, () => ({ saveAll }));

  function cancelAll() {
    setFirstName(props.firstName);
    setLastName(props.lastName);
    setEmail(props.email ?? "");
    setPhone(props.phone ?? "");
    setCountry(props.country ?? "");
    setCity(props.city ?? "");
    setGender(props.gender ?? "");
    setMaritalStatus(props.maritalStatus ?? "");
    setNotes(props.notes ?? "");
    setDob(props.dateOfBirth ? new Date(props.dateOfBirth) : undefined);
    setStatusId(props.statusId ?? null);
    setStatusLabel(props.statusLabel ?? null);
    setStatusColor(props.statusColor ?? null);
    refetchCustomFieldDefs();
    setEditing(false);
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

  const phoneDisplayText = formatPhoneDisplay(phone);
  const phoneHref = phoneToTelHref(phone);

  return (
    <div className="space-y-4 min-w-0 w-full overflow-x-auto">
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

      <ClientProfileHeader
        showEditButton={props.onEditingChange == null && (activeTab === "profile" || activeTab.startsWith("cf-"))}
        isEditing={isEditing}
        onToggleEditing={() => setEditing(!isEditing)}
        editButtonDisabled={saving || deleting || customFieldsSaving}

        id={props.id}
        firstName={props.firstName}
        lastName={props.lastName}
        avatarUrl={props.avatarUrl}
        hasAccount={hasAccount}

        statuses={statuses}
        statusId={statusId}
        currentStatus={currentStatus}
        statusSaving={statusSaving}
        onStatusChange={handleStatusChange}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setDiagnosticsTabActive(v === "diagnostics");
        }}
        className="w-full min-w-0"
      >
        <ClientProfileTabsNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setDiagnosticsTabActive={setDiagnosticsTabActive}
          diagnosticsOn={diagnosticsOn}
          schedulingOn={schedulingOn}
          customFieldDefs={customFieldDefs}
          tabsHaveOverflow={tabsHaveOverflow}
          tabsScrollLeft={tabsScrollLeft}
          tabsScrollRight={tabsScrollRight}
          tabsScrollRef={tabsScrollRef}
          updateTabsScrollState={updateTabsScrollState}
        />

        <div className="mt-3 flex flex-col lg:flex-row gap-4 lg:items-start min-w-0 w-full">
          <div className="min-w-0 w-full flex-1">
        <TabsContent
          value="profile"
          className="mt-0 min-w-0 rounded-lg border bg-card p-4"
        >
          <ClientProfileProfileTab
            email={props.email}
            createdAt={props.createdAt}
            hasAccount={hasAccount}
            isEditing={isEditing}
            saving={saving}
            deleting={deleting}
            customFieldsSaving={customFieldsSaving}
            error={error}

            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            emailValue={email}
            setEmailValue={setEmail}

            phone={phone}
            setPhone={setPhone}
            phoneHref={phoneHref}
            phoneDisplayText={phoneDisplayText}

            country={country}
            setCountry={setCountry}
            countryCode={countryCode}
            setCountryCode={setCountryCode}
            city={city}
            setCity={setCity}

            gender={gender}
            setGender={setGender}
            maritalStatus={maritalStatus}
            setMaritalStatus={setMaritalStatus}

            notes={notes}
            setNotes={setNotes}

            dob={dob}
            dobPopoverOpen={dobPopoverOpen}
            setDobPopoverOpen={setDobPopoverOpen}
            setDob={setDob}

            handleSendRegistrationInvite={handleSendRegistrationInvite}
            cancelAll={cancelAll}
            saveAll={saveAll}
          />

          {/* OLD PROFILE CONTENT (временно) */}
          {/*
            <div className="text-sm text-muted-foreground pb-2">
              {props.email ?? "Email ещё не указан"} · Создан{" "}
              {formatDate(props.createdAt)}
            </div>

            <form
              id="profile-form"
              onSubmit={handleSave}
              className="flex min-w-0 flex-col"
            >
              <div className={FIELD_ROW_CLASS}>
                <Label htmlFor="firstName" className={FIELD_LABEL_CLASS}>
                  Имя
                </Label>
                <div className={FIELD_VALUE_CLASS}>
                  <Input
                    id="firstName"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    disabled={!isEditing}
                    className={cn(PLAIN_INPUT_CLASS, !isEditing && "cursor-default")}
                  />
                </div>
              </div>
          
            <div className={FIELD_ROW_CLASS}>
              <Label htmlFor="lastName" className={FIELD_LABEL_CLASS}>
                Фамилия
              </Label>
              <div className={FIELD_VALUE_CLASS}>
                <Input
                  id="lastName"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  disabled={!isEditing}
                  className={cn(PLAIN_INPUT_CLASS, !isEditing && "cursor-default")}
                />
              </div>
            </div>
            <div className={FIELD_ROW_CLASS}>
              <Label htmlFor="profile-email" className={FIELD_LABEL_CLASS}>
                Email
                {hasAccount && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    (из аккаунта)
                  </span>
                )}
              </Label>
              <div className={cn(FIELD_VALUE_CLASS, "relative flex items-center")}>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={!isEditing || hasAccount}
                  placeholder={hasAccount ? undefined : "Для связки при регистрации"}
                  className={cn(PLAIN_INPUT_CLASS, "pr-8", (!isEditing || hasAccount) && "cursor-default")}
                />
                {!hasAccount && email.trim() && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleSendRegistrationInvite}
                          className="absolute right-0 flex items-center text-muted-foreground hover:text-foreground"
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
            <div className={FIELD_ROW_CLASS}>
              <Label className={FIELD_LABEL_CLASS}>Дата рождения</Label>
              <div className={FIELD_VALUE_CLASS}>
                <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      type="button"
                      className={cn(
                        "w-auto justify-start text-left font-normal h-auto py-0 min-h-0 text-foreground hover:bg-transparent disabled:opacity-100",
                        !isEditing && "cursor-default"
                      )}
                      disabled={!isEditing}
                    >
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
                      onSelect={d => {
                        setDob(d);
                        if (shouldCloseCalendarPopoverAfterSelect()) setDobPopoverOpen(false);
                      }}
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
            </div>
            <div className={FIELD_ROW_CLASS}>
              <Label htmlFor="phone" className={FIELD_LABEL_CLASS}>
                Телефон
              </Label>
              <div className={FIELD_VALUE_CLASS}>
                {isEditing ? (
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={value => setPhone(value)}
                    className={PLAIN_INPUT_CLASS}
                  />
                ) : phoneHref && phoneDisplayText !== "—" ? (
                  <a
                    id="phone"
                    href={phoneHref}
                    className={cn(
                      PLAIN_INPUT_CLASS,
                      "text-primary underline-offset-2 hover:underline inline-block"
                    )}
                  >
                    {phoneDisplayText}
                  </a>
                ) : (
                  <span
                    id="phone"
                    className={cn(PLAIN_INPUT_CLASS, "text-muted-foreground inline-block")}
                  >
                    {phoneDisplayText}
                  </span>
                )}
              </div>
            </div>
            <div className={FIELD_ROW_CLASS}>
              <Label htmlFor="client-country" className={FIELD_LABEL_CLASS}>
                Страна
              </Label>
              <div className={FIELD_VALUE_CLASS}>
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
                  className={PLAIN_INPUT_CLASS}
                />
              </div>
            </div>
            <div className={FIELD_ROW_CLASS}>
              <Label htmlFor="client-city" className={FIELD_LABEL_CLASS}>
                Город
              </Label>
              <div className={FIELD_VALUE_CLASS}>
                <CityAutocomplete
                  id="client-city"
                  value={city}
                  onChange={setCity}
                  countryCode={countryCode}
                  placeholder="Начните вводить город"
                  disabled={!isEditing}
                  className={PLAIN_INPUT_CLASS}
                />
              </div>
            </div>
            <div className={FIELD_ROW_CLASS}>
              <Label className={FIELD_LABEL_CLASS} htmlFor="client-gender-select">Пол</Label>
              <div className={FIELD_VALUE_CLASS}>
                <Select
                  value={gender || "unspecified"}
                  onValueChange={value => setGender(value === "unspecified" ? "" : value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger
                    id="client-gender-select"
                    className={cn("border-0 bg-transparent shadow-none h-auto py-0 min-h-0 w-auto", !isEditing && "cursor-default")}
                  >
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Мужской</SelectItem>
                    <SelectItem value="female">Женский</SelectItem>
                    <SelectItem value="unspecified">Не указано</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={FIELD_ROW_CLASS}>
              <Label htmlFor="client-marital" className={FIELD_LABEL_CLASS}>
                Семейное положение
              </Label>
              <div className={FIELD_VALUE_CLASS}>
                <Select
                  value={maritalStatus || "unspecified"}
                  onValueChange={setMaritalStatus}
                  disabled={!isEditing}
                >
                  <SelectTrigger id="client-marital" className={cn("border-0 bg-transparent shadow-none h-auto py-0 min-h-0 w-auto", !isEditing && "cursor-default")}>
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
            </div>
            <div className={FIELD_ROW_CLASS}>
              <Label htmlFor="notes" className={FIELD_LABEL_CLASS}>
                Заметки
              </Label>
              <div className={FIELD_VALUE_CLASS}>
                <Textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={!isEditing}
                  className={cn(PLAIN_INPUT_CLASS, "resize-none", !isEditing && "cursor-default")}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground mt-2">
                {error}
              </div>
            )}

            {isEditing && (
              <div className="flex flex-wrap items-center justify-end gap-2 pt-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelAll}
                >
                  Отменить
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || deleting || customFieldsSaving}
                  onClick={() => void saveAll()}
                >
                  {saving || customFieldsSaving ? "Сохраняем…" : "Сохранить"}
                </Button>
              </div>
            )}
            </form>
          */}
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
          const isEditingGroup = isEditing;
          return (
            <TabsContent
              key={groupId}
              value={groupId}
              className="mt-0 min-w-0 flex flex-col rounded-lg border bg-card p-4"
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
                <p className="text-sm text-muted-foreground pt-2">Загружаем поля…</p>
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
                        toast.error((data as { message?: string }).message ?? "Не удалось сохранить поля");
                        return;
                      }
                      setEditing(false);
                    } finally {
                      setCustomFieldsSaving(false);
                    }
                  }}
                  className="flex min-w-0 flex-col"
                >
                  <div className="flex min-w-0 flex-col [&>*:last-child>*:last-child]:border-b-0">
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
                          const reorderedWithOrder = reordered.map((d, i) => ({ ...d, order: i }));
                          const groupStart = customFieldDefs.findIndex((d) => (d.group ?? "") === group);
                          if (groupStart !== -1) {
                            const newDefs = [...customFieldDefs];
                            newDefs.splice(groupStart, defsForGroup.length, ...reorderedWithOrder);
                            setCustomFieldDefs(newDefs);
                          }
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
                            if (!results.every((r) => r.ok)) refetchCustomFieldDefs();
                          } catch (err) {
                            console.error(err);
                            refetchCustomFieldDefs();
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

                            function updateValue(next: unknown) {
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [def.id]: next
                              }));
                            }

                            return (
                              <SortableFieldWrap key={def.id} id={def.id} isEditing={true}>
                                <div className={cn(FIELD_ROW_CLASS, "flex-1 min-w-0")}>
                                  <Label className={FIELD_LABEL_CLASS}>{label}</Label>
                                  <div className={FIELD_VALUE_CLASS}>
                          {type === "TEXT" && (
                            <Input
                              value={typeof value === "string" ? value : ""}
                              onChange={(e) => updateValue(e.target.value)}
                              className={PLAIN_INPUT_CLASS}
                            />
                          )}
                          {type === "MULTILINE" && (
                            <Textarea
                              rows={2}
                              value={typeof value === "string" ? value : ""}
                              onChange={(e) => updateValue(e.target.value)}
                              className={cn(PLAIN_INPUT_CLASS, "resize-none")}
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
                              className={PLAIN_INPUT_CLASS}
                            />
                          )}
                          {type === "DATE" && (
                            <Popover
                              open={cfDatePopoverFieldId === def.id}
                              onOpenChange={open =>
                                setCfDatePopoverFieldId(open ? def.id : null)
                              }
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  type="button"
                                  className="h-auto py-0 min-h-0 text-foreground hover:bg-transparent font-normal w-auto justify-start text-left disabled:opacity-100"
                                >
                                  {value && typeof value === "string" ? (
                                    new Date(value).toLocaleDateString("ru-RU")
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
                                  selected={
                                    value && typeof value === "string"
                                      ? new Date(value)
                                      : undefined
                                  }
                                  onSelect={date => {
                                    updateValue(date ? date.toISOString() : null);
                                    if (shouldCloseCalendarPopoverAfterSelect()) {
                                      setCfDatePopoverFieldId(null);
                                    }
                                  }}
                                  locale={ru}
                                  initialFocus
                                  defaultMonth={
                                    value && typeof value === "string"
                                      ? new Date(value)
                                      : new Date()
                                  }
                                  captionLayout="dropdown"
                                  startMonth={new Date(1920, 0)}
                                  endMonth={new Date()}
                                  reverseYears
                                  hideNavigation
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                          {type === "BOOLEAN" && (
                            <Switch
                              id={`cf-bool-${def.id}`}
                              checked={value === true}
                              onCheckedChange={(checked) => updateValue(checked)}
                            />
                          )}
                          {type === "SELECT" && (
                            <Select
                              value={typeof value === "string" ? value : ""}
                              onValueChange={(v) => updateValue(v)}
                            >
                              <SelectTrigger className="border-0 bg-transparent shadow-none h-auto py-0 min-h-0 w-auto">
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
                            <div className="flex flex-col gap-2">
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
                                      className="flex items-center gap-2 text-sm cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(checked) => {
                                          const next = new Set(current);
                                          if (checked) {
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

                        function updateValue(next: unknown) {
                          setCustomFieldValues((prev) => ({
                            ...prev,
                            [def.id]: next
                          }));
                        }

                        return (
                          <div key={def.id} className={FIELD_ROW_CLASS}>
                            <Label className={FIELD_LABEL_CLASS}>{label}</Label>
                            <div className={FIELD_VALUE_CLASS}>
                              {type === "TEXT" && (
                                <Input
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => updateValue(e.target.value)}
                                  disabled
                                  className={cn(PLAIN_INPUT_CLASS, "cursor-default")}
                                />
                              )}
                              {type === "MULTILINE" && (
                                <Textarea
                                  rows={2}
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => updateValue(e.target.value)}
                                  disabled
                                  className={cn(PLAIN_INPUT_CLASS, "resize-none cursor-default")}
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
                                  disabled
                                  className={cn(PLAIN_INPUT_CLASS, "cursor-default")}
                                />
                              )}
                              {type === "DATE" && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      type="button"
                                      disabled
                                      className="h-auto py-0 min-h-0 text-foreground font-normal w-auto justify-start text-left cursor-default hover:bg-transparent disabled:opacity-100"
                                    >
                                      {value && typeof value === "string" ? (
                                        new Date(value).toLocaleDateString("ru-RU")
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
                                      selected={
                                        value && typeof value === "string"
                                          ? new Date(value)
                                          : undefined
                                      }
                                      onSelect={(date) =>
                                        updateValue(date ? date.toISOString() : null)
                                      }
                                      locale={ru}
                                      initialFocus
                                      defaultMonth={
                                        value && typeof value === "string"
                                          ? new Date(value)
                                          : new Date()
                                      }
                                      captionLayout="dropdown"
                                      startMonth={new Date(1920, 0)}
                                      endMonth={new Date()}
                                      reverseYears
                                      hideNavigation
                                    />
                                  </PopoverContent>
                                </Popover>
                              )}
                              {type === "BOOLEAN" && (
                                <Switch
                                  id={`cf-bool-view-${def.id}`}
                                  checked={value === true}
                                  onCheckedChange={(checked) => updateValue(checked)}
                                  disabled
                                />
                              )}
                              {type === "SELECT" && (
                                <Select
                                  value={typeof value === "string" ? value : ""}
                                  onValueChange={(v) => updateValue(v)}
                                  disabled
                                >
                                  <SelectTrigger className="border-0 bg-transparent shadow-none h-auto py-0 min-h-0 w-auto cursor-default">
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
                                <div className="flex flex-col gap-2 pointer-events-none">
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
                                          className="flex items-center gap-2 text-sm cursor-default"
                                        >
                                          <Checkbox checked={checked} />
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

                  {isEditing && (
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancelAll}
                        disabled={saving || customFieldsSaving}
                      >
                        Отменить
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving || deleting || customFieldsSaving}
                        onClick={() => void saveAll()}
                      >
                        {saving || customFieldsSaving ? "Сохраняем…" : "Сохранить"}
                      </Button>
                    </div>
                  )}
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
                            setHistoryTick((t) => t + 1);
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
                                    setHistoryTick((t) => t + 1);
                                  } else {
                                    const data = await res.json().catch(() => ({}));
                                    toast.error((data as { message?: string }).message ?? "Не удалось удалить файл");
                                  }
                                } catch (err) {
                                  console.error(err);
                                  toast.error("Не удалось удалить файл");
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

        {diagnosticsOn && (
          <TabsContent
            value="diagnostics"
            className="mt-0 space-y-3 rounded-lg border bg-card p-4"
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
        )}

        {schedulingOn && (
          <TabsContent
            value="appointments"
            className="mt-0 space-y-3 rounded-lg border bg-card p-4"
          >
            <ClientAppointments clientId={props.id} />
          </TabsContent>
        )}

        <TabsContent
          value="history"
          className="mt-0 flex min-h-0 max-h-[min(28rem,52dvh)] flex-col overflow-hidden lg:hidden min-w-0"
        >
          <ClientHistoryPanel
            className="min-h-0 w-full flex-1"
            clientId={props.id}
            refreshKey={historyTick}
          />
        </TabsContent>
          </div>
          <div className="hidden min-h-0 shrink-0 self-start overflow-hidden lg:sticky lg:top-4 lg:flex lg:max-h-[min(32rem,52dvh)] lg:w-[30rem] lg:max-w-[min(30rem,42vw)] lg:flex-col min-w-0">
            <ClientHistoryPanel
              className="w-full min-h-0 flex-1"
              clientId={props.id}
              refreshKey={historyTick}
            />
          </div>
        </div>
      </Tabs>
    </div>
  );
});

