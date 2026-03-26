"use client";

import { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { formatPhoneDisplay, phoneToTelHref } from "@/components/ui/phone-input";
// Импорты из профиля вынесены в отдельные компоненты, поэтому эти UI-провайдеры
// больше не требуются здесь.
import { getCountryCodeByName } from "@/lib/data/countries-ru";
import { ClientProfileTabsNav } from "@/components/psychologist/client-profile-tabs-nav";
import { ClientProfileHeader } from "@/components/psychologist/client-profile-header";
import { ClientProfileProfileTab } from "@/components/psychologist/client-profile-profile-tab";
import { ClientProfileCustomFieldsTabs } from "@/components/psychologist/client-profile-custom-fields-tabs";
import { ClientProfileDiagnosticsTab } from "@/components/psychologist/client-profile-diagnostics-tab";
import { ClientProfileAppointmentsTab } from "@/components/psychologist/client-profile-appointments-tab";
import { ClientProfileHistorySection } from "@/components/psychologist/client-profile-history-section";
import { ClientProfileDeleteDialog } from "@/components/psychologist/client-profile-delete-dialog";
import { useClientProfileTabsScrollState } from "@/hooks/use-client-profile-tabs-scroll";

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
      <ClientProfileDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
      />

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
        </TabsContent>

        <ClientProfileCustomFieldsTabs
          clientId={props.id}
          customFieldsLoading={customFieldsLoading}
          customFieldDefs={customFieldDefs}
          customFieldValues={customFieldValues}
          setCustomFieldDefs={setCustomFieldDefs}
          setCustomFieldValues={setCustomFieldValues}
          customFieldsSaving={customFieldsSaving}
          setCustomFieldsSaving={setCustomFieldsSaving}
          isEditing={isEditing}
          setEditing={setEditing}
          groupDescriptions={groupDescriptions}
          sortableSensors={sortableSensors}
          cfDatePopoverFieldId={cfDatePopoverFieldId}
          setCfDatePopoverFieldId={setCfDatePopoverFieldId}
          refetchCustomFieldDefs={refetchCustomFieldDefs}
          saving={saving}
          deleting={deleting}
          cancelAll={cancelAll}
          saveAll={saveAll}
          setHistoryTick={setHistoryTick}
          files={files}
          filesLoading={filesLoading}
          filesError={filesError}
          setFiles={setFiles}
          setFilesLoading={setFilesLoading}
          setFilesError={setFilesError}
        />

        {diagnosticsOn && (
          <ClientProfileDiagnosticsTab
            loading={diagnosticsLoading}
            diagnostics={diagnosticsList}
            formatDate={formatDate}
          />
        )}

        {schedulingOn && <ClientProfileAppointmentsTab clientId={props.id} />}

        <ClientProfileHistorySection clientId={props.id} refreshKey={historyTick} />
          </div>
          
        </div>
      </Tabs>
    </div>
  );
});

