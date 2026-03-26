"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import type { SlotDto } from "@/lib/schedule-utils";
import {
  formatHumanRange,
  getClientProfileHref,
  getSlotCalendarSecondLine,
  getSlotToneClass,
  HOUR_ROW_HEIGHT,
  MIN_SLOT_HEIGHT_FOR_TWO_LINES
} from "@/lib/schedule-utils";

function SlotTimeEditor({
  initialTime,
  durationMinutes,
  isUpdating,
  onSave,
  onDelete
}: {
  initialTime: string;
  durationMinutes: number;
  isUpdating: boolean;
  onSave: (time: string, duration: number) => void;
  onDelete: () => void;
}) {
  const [timeValue, setTimeValue] = useState(initialTime);
  const [durValue, setDurValue] = useState(String(durationMinutes));

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1">
        <Label className="text-sm">Время</Label>
        <TimeInput value={timeValue} onChange={setTimeValue} />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-sm">Длительность, минут</Label>
        <Select value={durValue} onValueChange={setDurValue}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="60">60</SelectItem>
            <SelectItem value="90">90</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-sm"
          disabled={isUpdating}
          onClick={onDelete}
        >
          Удалить слот
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 px-2 text-sm"
          disabled={isUpdating}
          onClick={() => onSave(timeValue, Number(durValue))}
        >
          Сохранить
        </Button>
      </div>
    </div>
  );
}

type Props = {
  slot: SlotDto;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isUpdating: boolean;
  isMobileView: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onUpdateTime: (time: string, duration: number) => void;
};

export function SlotDetailPopover({
  slot,
  isOpen,
  onOpenChange,
  isUpdating,
  isMobileView,
  onConfirm,
  onCancel,
  onDelete,
  onUpdateTime
}: Props) {
  const hasAppointment = Boolean(slot.appointmentId);
  const label = formatHumanRange(slot.start, slot.end);
  const startDate = new Date(slot.start);
  const endDate = new Date(slot.end);
  const minutesFromHourStart = startDate.getMinutes();
  const durationMinutes = Math.max(5, (endDate.getTime() - startDate.getTime()) / 60000);
  const topOffsetPx = (minutesFromHourStart / 60) * HOUR_ROW_HEIGHT;
  const slotHeight = Math.max(20, (durationMinutes / 60) * HOUR_ROW_HEIGHT);
  const canFitTwoLines = slotHeight >= MIN_SLOT_HEIGHT_FOR_TWO_LINES;

  const isPendingByPsychologist =
    slot.appointmentStatus === "PENDING_CONFIRMATION" && slot.proposedByPsychologist === true;
  const pendingLabel = isPendingByPsychologist
    ? "ожидает подтверждения клиента"
    : "ожидает вашего подтверждения";

  const popupStatusText = (() => {
    if (!hasAppointment) return "Свободный слот";
    if (slot.appointmentStatus === "PENDING_CONFIRMATION") {
      return slot.clientName
        ? `${slot.clientName} (${pendingLabel})`
        : pendingLabel.charAt(0).toUpperCase() + pendingLabel.slice(1);
    }
    return slot.clientName || "Занято";
  })();

  const secondLineText = canFitTwoLines
    ? getSlotCalendarSecondLine(slot, hasAppointment, isPendingByPsychologist)
    : null;

  const clientProfileHref = getClientProfileHref(slot.clientId);
  const initialTime = startDate.toTimeString().slice(0, 5);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "absolute left-0 right-0 z-10 cursor-pointer touch-manipulation rounded-md border px-1.5 py-1 text-white shadow-sm",
            getSlotToneClass(slot)
          )}
          title={popupStatusText}
          style={{ top: topOffsetPx, height: slotHeight }}
          onClick={e => e.stopPropagation()}
        >
          <div className="text-xs font-medium leading-tight tabular-nums">{label}</div>
          {secondLineText && (
            <div className="mt-0.5 line-clamp-2 break-words text-[11px] leading-tight text-white">
              {secondLineText}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={isMobileView ? "bottom" : "right"}
        align="start"
        className="w-72 space-y-3 text-xs"
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-medium">{label}</div>
            <div className="mt-0.5 text-sm text-white">
              {clientProfileHref && slot.clientName?.trim() ? (
                <div className="space-y-0.5">
                  <Link
                    href={clientProfileHref}
                    className="inline underline-offset-2 hover:underline focus-visible:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    {slot.clientName.trim()}
                  </Link>
                  {slot.appointmentStatus === "PENDING_CONFIRMATION" && (
                    <div className="text-white/90">
                      {pendingLabel.charAt(0).toUpperCase() + pendingLabel.slice(1)}
                    </div>
                  )}
                </div>
              ) : (
                popupStatusText
              )}
            </div>
          </div>
          <button
            type="button"
            className="ml-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/90 bg-background/95 text-foreground shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => onOpenChange(false)}
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        {!hasAppointment && (
          <SlotTimeEditor
            initialTime={initialTime}
            durationMinutes={durationMinutes}
            isUpdating={isUpdating}
            onSave={onUpdateTime}
            onDelete={onDelete}
          />
        )}

        {hasAppointment && (
          <div className="flex flex-col gap-2">
            {slot.appointmentStatus === "PENDING_CONFIRMATION" && (
              <>
                <p className="text-xs text-white/90">
                  {isPendingByPsychologist
                    ? "Клиент получил уведомление. Вы можете подтвердить вместо него, если клиент устно согласился."
                    : "Клиент запросил эту запись. Подтвердите или отмените её."}
                </p>
                <Button
                  size="sm"
                  className="h-8 w-full px-3 text-sm"
                  disabled={isUpdating}
                  onClick={onConfirm}
                >
                  {isPendingByPsychologist ? "Клиент подтвердил" : "Подтвердить запись"}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full px-3 text-sm"
              disabled={isUpdating}
              onClick={onCancel}
            >
              Отменить запись
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
