"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { SlotDto, SlotStatus, AppointmentStatus, ApiErrorBody } from "@/lib/schedule-utils";
import { signOutIfSessionInvalid } from "@/lib/session-stale-client";

const SLOTS_QUERY_KEY = ["schedule-slots"] as const;

async function fetchSlots(): Promise<SlotDto[]> {
  const res = await fetch("/api/schedule/slots");
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    if (await signOutIfSessionInvalid(res.status, body)) return [];
    let msg = "Не удалось загрузить расписание";
    if (body && typeof body === "object" && body !== null) {
      const m = (body as { message?: unknown }).message;
      if (typeof m === "string") msg = m;
    }
    throw new Error(msg);
  }
  return body as SlotDto[];
}

async function apiCreateSlot(params: {
  clientId?: string;
  start: string;
  durationMinutes: number;
}): Promise<void> {
  const { clientId, start, durationMinutes } = params;
  const url = clientId
    ? `/api/psychologist/clients/${clientId}/appointments`
    : "/api/schedule/slots";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start, durationMinutes })
  });
  let body: ApiErrorBody = null;
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    throw new Error(
      body?.message ?? "Не удалось создать слот"
    );
  }
}

async function apiConfirmAppointment(appointmentId: string): Promise<void> {
  const res = await fetch(`/api/appointments/${appointmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "SCHEDULED" })
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message ?? "Не удалось подтвердить запись");
}

async function apiCancelAppointment(appointmentId: string): Promise<void> {
  const res = await fetch(`/api/appointments/${appointmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "CANCELED" })
  });
  let body: ApiErrorBody = null;
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error(body?.message ?? "Не удалось отменить запись");
}

async function apiDeleteSlot(slotId: string): Promise<void> {
  const res = await fetch(`/api/schedule/slots/${slotId}`, { method: "DELETE" });
  let body: ApiErrorBody = null;
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error(body?.message ?? "Не удалось удалить слот");
}

async function apiUpdateSlotTime(params: {
  slotId: string;
  start: string;
  durationMinutes: number;
}): Promise<SlotDto> {
  const res = await fetch(`/api/schedule/slots/${params.slotId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start: params.start, durationMinutes: params.durationMinutes })
  });
  let body: ApiErrorBody = null;
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error(body?.message ?? "Не удалось обновить слот");
  return body as unknown as SlotDto;
}

export function useScheduleSlots() {
  const qc = useQueryClient();

  const { data: slots = [], isLoading } = useQuery({
    queryKey: SLOTS_QUERY_KEY,
    queryFn: fetchSlots,
    retry: 2,
    retryDelay: 500
  });

  const createSlot = useMutation({
    mutationFn: apiCreateSlot,
    onSuccess: () => qc.invalidateQueries({ queryKey: SLOTS_QUERY_KEY }),
    onError: (e: Error) => toast.error(e.message)
  });

  const confirmAppointment = useMutation({
    mutationFn: ({ slot }: { slot: SlotDto }) => {
      if (!slot.appointmentId) return Promise.reject(new Error("Нет записи"));
      return apiConfirmAppointment(slot.appointmentId);
    },
    onSuccess: (_, { slot }) => {
      qc.setQueryData<SlotDto[]>(SLOTS_QUERY_KEY, prev =>
        prev?.map(s =>
          s.id === slot.id
            ? { ...s, appointmentStatus: "SCHEDULED" as AppointmentStatus }
            : s
        )
      );
      toast.success("Запись подтверждена.");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const cancelAppointment = useMutation({
    mutationFn: ({ slot }: { slot: SlotDto }) => {
      if (!slot.appointmentId) return Promise.reject(new Error("Нет записи"));
      return apiCancelAppointment(slot.appointmentId);
    },
    onSuccess: (_, { slot }) => {
      qc.setQueryData<SlotDto[]>(SLOTS_QUERY_KEY, prev =>
        prev?.map(s =>
          s.id === slot.id
            ? { ...s, status: "FREE" as SlotStatus, appointmentId: null, clientName: null }
            : s
        )
      );
      toast.success("Запись отменена.");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteSlot = useMutation({
    mutationFn: apiDeleteSlot,
    onSuccess: (_, slotId) => {
      qc.setQueryData<SlotDto[]>(SLOTS_QUERY_KEY, prev =>
        prev?.filter(s => s.id !== slotId)
      );
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const updateSlotTime = useMutation({
    mutationFn: (params: { slot: SlotDto; newTime: string; durationMinutes: number }) => {
      const base = new Date(params.slot.start);
      const [hours, minutes] = params.newTime.split(":").map(Number);
      base.setHours(hours ?? 0, minutes ?? 0, 0, 0);
      return apiUpdateSlotTime({
        slotId: params.slot.id,
        start: base.toISOString(),
        durationMinutes: params.durationMinutes
      });
    },
    onSuccess: (updated, { slot }) => {
      qc.setQueryData<SlotDto[]>(SLOTS_QUERY_KEY, prev =>
        prev?.map(s =>
          s.id === slot.id
            ? { ...s, start: updated.start, end: updated.end, status: updated.status }
            : s
        )
      );
      toast.success("Слот обновлён.");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const updatingId =
    confirmAppointment.isPending ? (confirmAppointment.variables?.slot.id ?? null) :
    cancelAppointment.isPending ? (cancelAppointment.variables?.slot.id ?? null) :
    deleteSlot.isPending ? (deleteSlot.variables ?? null) :
    updateSlotTime.isPending ? (updateSlotTime.variables?.slot.id ?? null) :
    null;

  return {
    slots,
    loading: isLoading,
    updatingId,
    createSlot,
    confirmAppointment,
    cancelAppointment,
    deleteSlot,
    updateSlotTime
  };
}
