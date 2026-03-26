"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect } from "react";
import { getCountryCodeByName } from "@/lib/data/countries-ru";

export function useClientProfileSave(opts: {
  clientId: string;
  hasAccount: boolean;

  // incoming props snapshot (для reset/sync)
  initial: {
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
  };

  // current editable state
  state: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    city: string;
    gender: string;
    maritalStatus: string;
    notes: string;
    dob: Date | undefined;
    statusId: string | null;
    statusLabel: string | null;
    statusColor: string | null;
  };

  // setters
  setFirstName: Dispatch<SetStateAction<string>>;
  setLastName: Dispatch<SetStateAction<string>>;
  setEmail: Dispatch<SetStateAction<string>>;
  setPhone: Dispatch<SetStateAction<string>>;
  setCountry: Dispatch<SetStateAction<string>>;
  setCity: Dispatch<SetStateAction<string>>;
  setGender: Dispatch<SetStateAction<string>>;
  setMaritalStatus: Dispatch<SetStateAction<string>>;
  setNotes: Dispatch<SetStateAction<string>>;
  setDob: Dispatch<SetStateAction<Date | undefined>>;
  setCountryCode: Dispatch<SetStateAction<string | null>>;
  setStatusId: Dispatch<SetStateAction<string | null>>;
  setStatusLabel: Dispatch<SetStateAction<string | null>>;
  setStatusColor: Dispatch<SetStateAction<string | null>>;

  // shared controls
  setSaving: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setHistoryTick: Dispatch<SetStateAction<number>>;
  setEditing: (v: boolean) => void;

  // external actions
  refetchCustomFieldDefs: () => void;
  saveCustomFields: () => Promise<void>;

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
}) {
  const {
    clientId,
    hasAccount,
    initial,
    state,
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
    onUpdated
  } = opts;

  // Синхронизация локальных полей при смене клиента/пропсов
  useEffect(() => {
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setEmail(initial.email ?? "");
    setPhone(initial.phone ?? "");
    setNotes(initial.notes ?? "");
    setDob(initial.dateOfBirth ? new Date(initial.dateOfBirth) : undefined);
    setCountry(initial.country ?? "");
    setCity(initial.city ?? "");
    setCountryCode(initial.country ? getCountryCodeByName(initial.country) : null);
    setGender(initial.gender ?? "");
    setMaritalStatus(initial.maritalStatus ?? "");
    setStatusId(initial.statusId ?? null);
    setStatusLabel(initial.statusLabel ?? null);
    setStatusColor(initial.statusColor ?? null);
  }, [
    clientId,
    initial.firstName,
    initial.lastName,
    initial.email,
    initial.phone,
    initial.notes,
    initial.dateOfBirth,
    initial.country,
    initial.city,
    initial.gender,
    initial.maritalStatus,
    initial.statusId,
    initial.statusLabel,
    initial.statusColor,
    setFirstName,
    setLastName,
    setEmail,
    setPhone,
    setNotes,
    setDob,
    setCountry,
    setCity,
    setCountryCode,
    setGender,
    setMaritalStatus,
    setStatusId,
    setStatusLabel,
    setStatusColor
  ]);

  const saveMainProfile = useCallback(async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        firstName: state.firstName,
        lastName: state.lastName,
        phone: state.phone || undefined,
        country: state.country.trim() || null,
        city: state.city.trim() || null,
        gender: state.gender || null,
        maritalStatus: state.maritalStatus || null,
        notes: state.notes || undefined,
        dateOfBirth: state.dob ? state.dob.toISOString() : undefined,
        statusId: state.statusId
      };

      if (!hasAccount) body.email = state.email.trim() || "";

      const res = await fetch(`/api/psychologist/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Не удалось сохранить профиль");

      if (onUpdated) {
        onUpdated({
          firstName: state.firstName,
          lastName: state.lastName,
          email: state.email.trim() || null,
          phone: state.phone || null,
          country: state.country.trim() || null,
          city: state.city.trim() || null,
          gender: state.gender || null,
          maritalStatus: state.maritalStatus || null,
          notes: state.notes || null,
          dateOfBirth: state.dob ? state.dob.toISOString() : null,
          statusId: state.statusId ?? null,
          statusLabel: state.statusLabel ?? null,
          statusColor: state.statusColor ?? null
        });
      }

      setHistoryTick((t) => t + 1);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось сохранить профиль");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [clientId, hasAccount, onUpdated, setError, setHistoryTick, setSaving, state]);

  const saveAll = useCallback(async () => {
    try {
      await saveMainProfile();
      await saveCustomFields();
      setEditing(false);
    } catch {
      // ошибка уже в setError / отображена
    }
  }, [saveCustomFields, saveMainProfile, setEditing]);

  const cancelAll = useCallback(() => {
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setEmail(initial.email ?? "");
    setPhone(initial.phone ?? "");
    setCountry(initial.country ?? "");
    setCity(initial.city ?? "");
    setGender(initial.gender ?? "");
    setMaritalStatus(initial.maritalStatus ?? "");
    setNotes(initial.notes ?? "");
    setDob(initial.dateOfBirth ? new Date(initial.dateOfBirth) : undefined);
    setStatusId(initial.statusId ?? null);
    setStatusLabel(initial.statusLabel ?? null);
    setStatusColor(initial.statusColor ?? null);
    refetchCustomFieldDefs();
    setEditing(false);
  }, [
    initial,
    refetchCustomFieldDefs,
    setCity,
    setCountry,
    setDob,
    setEditing,
    setEmail,
    setFirstName,
    setGender,
    setLastName,
    setMaritalStatus,
    setNotes,
    setPhone,
    setStatusColor,
    setStatusId,
    setStatusLabel
  ]);

  return { saveMainProfile, saveAll, cancelAll };
}

