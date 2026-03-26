"use client";

import { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { TabsContent } from "@/components/ui/tabs";
import { formatPhoneDisplay, phoneToTelHref } from "@/components/ui/phone-input";
// Импорты из профиля вынесены в отдельные компоненты, поэтому эти UI-провайдеры
// больше не требуются здесь.
import { getCountryCodeByName } from "@/lib/data/countries-ru";
import { ClientProfileHeader } from "@/components/psychologist/client-profile-header";
import { ClientProfileProfileTab } from "@/components/psychologist/client-profile-profile-tab";
import { ClientProfileCustomFieldsTabs } from "@/components/psychologist/client-profile-custom-fields-tabs";
import { ClientProfileDiagnosticsTab } from "@/components/psychologist/client-profile-diagnostics-tab";
import { ClientProfileAppointmentsTab } from "@/components/psychologist/client-profile-appointments-tab";
import { ClientProfileHistorySidebar, ClientProfileHistoryTab } from "@/components/psychologist/client-profile-history-section";
import { ClientProfileDeleteDialog } from "@/components/psychologist/client-profile-delete-dialog";
import { ClientProfileTabsShell } from "@/components/psychologist/client-profile-tabs-shell";
import { useClientProfileTabsScrollState } from "@/hooks/use-client-profile-tabs-scroll";
import { useClientProfileFiles } from "@/hooks/use-client-profile-files";
import { useClientProfileDiagnostics } from "@/hooks/use-client-profile-diagnostics";
import { useClientProfileStatuses } from "@/hooks/use-client-profile-statuses";
import { useClientProfileCustomFields } from "@/hooks/use-client-profile-custom-fields";
import { useClientProfileDeleteAction } from "@/hooks/use-client-profile-delete-action";
import { useClientProfileRegistrationInvite } from "@/hooks/use-client-profile-registration-invite";
import { useClientProfileSave } from "@/hooks/use-client-profile-save";
import { useClientProfileTabsState } from "@/hooks/use-client-profile-tabs-state";

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

export type PsychologistClientProfileHandle = {
  saveAll: () => Promise<void>;
};

export const PsychologistClientProfile = forwardRef<
  PsychologistClientProfileHandle,
  ClientProfileProps
>(function PsychologistClientProfile(props, ref) {
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
  const hasAccount = props.hasAccount ?? false;
  const {
    files,
    setFiles,
    filesLoading,
    setFilesLoading,
    filesError,
    setFilesError
  } = useClientProfileFiles(props.id);

  const [activeTab, setActiveTab] = useState("profile");
  const [historyTick, setHistoryTick] = useState(0);
  const schedulingOn = props.schedulingEnabled !== false;
  const diagnosticsOn = props.diagnosticsEnabled !== false;
  const [diagnosticsTabActive, setDiagnosticsTabActive] = useState(false);
  const { diagnosticsList, diagnosticsLoading } = useClientProfileDiagnostics({
    clientId: props.id,
    enabled: diagnosticsOn,
    active: diagnosticsTabActive,
    initial: props.diagnostics ?? []
  });

  const {
    customFieldsLoading,
    customFieldDefs,
    setCustomFieldDefs,
    customFieldValues,
    setCustomFieldValues,
    customFieldsSaving,
    setCustomFieldsSaving,
    refetchCustomFieldDefs,
    saveCustomFields,
    groupDescriptions
  } = useClientProfileCustomFields({
    clientId: props.id,
    setError,
    setHistoryTick
  });

  useClientProfileTabsState({
    activeTab,
    setActiveTab,
    diagnosticsOn,
    schedulingOn
  });

  const {
    tabsScrollRef,
    tabsScrollLeft,
    tabsScrollRight,
    tabsHaveOverflow,
    updateTabsScrollState
  } = useClientProfileTabsScrollState(customFieldDefs.length);

  const sortableSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const buildUpdatedPayloadForStatus = useCallback(
    (applied: { statusId: string | null; statusLabel: string | null; statusColor: string | null }) => ({
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
      statusId: applied.statusId,
      statusLabel: applied.statusLabel,
      statusColor: applied.statusColor
    }),
    [firstName, lastName, email, phone, country, city, gender, maritalStatus, notes, dob]
  );

  const { statuses, currentStatus, statusSaving, handleStatusChange } =
    useClientProfileStatuses({
      clientId: props.id,
      statusId,
      setStatusId,
      setStatusLabel,
      setStatusColor,
      setError,
      setHistoryTick,
      onUpdated: props.onUpdated,
      buildUpdatedPayload: buildUpdatedPayloadForStatus
    });

  function formatDate(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("ru-RU");
  }

  const { saveAll, cancelAll } = useClientProfileSave({
    clientId: props.id,
    hasAccount,
    initial: {
      firstName: props.firstName,
      lastName: props.lastName,
      email: props.email,
      phone: props.phone,
      country: props.country,
      city: props.city,
      gender: props.gender,
      maritalStatus: props.maritalStatus,
      notes: props.notes,
      dateOfBirth: props.dateOfBirth,
      statusId: props.statusId,
      statusLabel: props.statusLabel,
      statusColor: props.statusColor
    },
    state: {
      firstName,
      lastName,
      email,
      phone,
      country,
      city,
      gender,
      maritalStatus,
      notes,
      dob,
      statusId,
      statusLabel,
      statusColor
    },
    setFirstName,
    setLastName,
    setEmail,
    setPhone,
    setCountry,
    setCity,
    setGender,
    setMaritalStatus,
    setNotes,
    setDob,
    setCountryCode,
    setStatusId,
    setStatusLabel,
    setStatusColor,
    setSaving,
    setError,
    setHistoryTick,
    setEditing,
    refetchCustomFieldDefs,
    saveCustomFields,
    onUpdated: props.onUpdated
  });

  useImperativeHandle(ref, () => ({ saveAll }));

  const { confirmDelete } = useClientProfileDeleteAction({
    clientId: props.id,
    onDeleted: props.onDeleted,
    setDeleting,
    setDeleteDialogOpen,
    setError
  });

  const { sendInvite: handleSendRegistrationInvite } =
    useClientProfileRegistrationInvite({
      clientId: props.id,
      hasAccount,
      getTargetEmail: () => (email || "").trim() || props.email || "",
      setError
    });

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

      <ClientProfileTabsShell
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
        left={
          <>
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

        <ClientProfileHistoryTab clientId={props.id} refreshKey={historyTick} />
          </>
        }
        right={<ClientProfileHistorySidebar clientId={props.id} refreshKey={historyTick} />}
      />
    </div>
  );
});

