"use client";

import { Pencil, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type StatusItem = { id: string; label: string; color: string };

type Props = {
  showEditButton: boolean;
  isEditing: boolean;
  onToggleEditing: () => void;
  editButtonDisabled: boolean;

  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  hasAccount: boolean;

  statuses: StatusItem[];
  statusId: string | null;
  currentStatus: StatusItem | null;
  statusSaving: boolean;
  onStatusChange: (val: string) => void | Promise<void>;
};

export function ClientProfileHeader({
  showEditButton,
  isEditing,
  onToggleEditing,
  editButtonDisabled,

  id,
  firstName,
  lastName,
  avatarUrl,
  hasAccount,

  statuses,
  statusId,
  currentStatus,
  statusSaving,
  onStatusChange
}: Props) {
  return (
    <>
      {showEditButton && (
        <div className="flex justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={isEditing ? "secondary" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleEditing}
                  disabled={editButtonDisabled}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">{isEditing ? "Завершить редактирование" : "Редактировать"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isEditing
                  ? "Завершить редактирование"
                  : "Редактировать личные данные и дополнительные поля"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Аватар, имя, значок зарегистрирован, статус — над вкладками */}
      <div className="flex flex-wrap items-center gap-3">
        {(() => {
          const AVATAR_COLORS = [
            "bg-rose-200 text-rose-800",
            "bg-violet-200 text-violet-800",
            "bg-sky-200 text-sky-800",
            "bg-emerald-200 text-emerald-800",
            "bg-amber-200 text-amber-800",
            "bg-pink-200 text-pink-800",
            "bg-teal-200 text-teal-800",
            "bg-indigo-200 text-indigo-800"
          ];
          let hash = 0;
          for (let i = 0; i < id.length; i++) {
            hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
          }
          const avatarColor = AVATAR_COLORS[hash % AVATAR_COLORS.length];
          const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
          return (
            <Avatar className="h-12 w-12 shrink-0 border border-border">
              <AvatarImage src={avatarUrl ?? undefined} alt={`${lastName} ${firstName}`} className="object-cover" />
              <AvatarFallback className={cn("font-semibold text-sm", avatarColor)}>{initials || "?"}</AvatarFallback>
            </Avatar>
          );
        })()}

        <span className="text-2xl font-semibold leading-tight tracking-tight">
          {lastName} {firstName}
        </span>

        {hasAccount && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none cursor-help">
                  <UserCheck className="h-6 w-6" aria-hidden />
                  <span className="sr-only">Зарегистрирован</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>Клиент зарегистрирован</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <Select
          value={statusId ?? "__none__"}
          onValueChange={(val) => {
            void onStatusChange(val);
          }}
          disabled={statusSaving}
        >
          <SelectTrigger
            className={cn(
              "h-8 w-full min-w-0 basis-full rounded-md border-0 px-3 text-xs font-semibold shadow-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring md:w-auto md:min-w-[180px] md:basis-auto relative [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0 [&>*:first-child]:flex [&>*:first-child]:justify-center [&>*:first-child]:text-center [&>svg]:relative [&>svg]:z-10 [&>svg]:shrink-0 [&>svg]:ml-1",
              currentStatus
                ? "text-white data-[placeholder]:text-white [&>svg]:text-white [&>svg]:opacity-100"
                : "text-foreground bg-[hsl(var(--input-bg))] data-[placeholder]:text-muted-foreground"
            )}
            style={currentStatus ? { backgroundColor: currentStatus.color } : undefined}
          >
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)] [&>*:nth-child(2)]:space-y-[5px]">
            <SelectItem value="__none__" className="h-7 py-1 justify-center !pl-2 pr-2 cursor-pointer">
              <span className="text-sm">Без статуса</span>
            </SelectItem>
            {statuses.map((s) => (
              <SelectItem
                key={s.id}
                value={s.id}
                className="relative p-0 min-h-7 h-7 overflow-hidden rounded-md cursor-pointer [&>*:first-child]:z-10"
              >
                <span
                  className="absolute inset-0 z-0 flex items-center justify-center rounded-md text-xs font-medium text-white"
                  style={{ backgroundColor: s.color }}
                  title={s.label.length > 16 ? s.label : undefined}
                >
                  {s.label.length > 16 ? `${s.label.slice(0, 16)}…` : s.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

