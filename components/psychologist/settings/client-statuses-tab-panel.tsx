"use client";

import type { Dispatch, FC, SetStateAction } from "react";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ClientStatusItem } from "@/hooks/use-client-statuses-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

type StatusColorPreset = { value: string };

type Props = {
  clientStatuses: ClientStatusItem[];
  clientStatusesLoading: boolean;
  STATUS_COLOR_PRESETS: StatusColorPreset[];

  addStatusDialogOpen: boolean;
  setAddStatusDialogOpen: Dispatch<SetStateAction<boolean>>;
  newStatusLabel: string;
  setNewStatusLabel: Dispatch<SetStateAction<string>>;
  newStatusColor: string;
  setNewStatusColor: Dispatch<SetStateAction<string>>;

  editingStatusId: string | null;
  setEditingStatusId: Dispatch<SetStateAction<string | null>>;
  editingStatusLabel: string;
  setEditingStatusLabel: Dispatch<SetStateAction<string>>;
  editingStatusColor: string;
  setEditingStatusColor: Dispatch<SetStateAction<string>>;

  refetchClientStatuses: () => void;
};

export const ClientStatusesTabPanel: FC<Props> = ({
  clientStatuses,
  clientStatusesLoading,
  STATUS_COLOR_PRESETS,

  addStatusDialogOpen,
  setAddStatusDialogOpen,
  newStatusLabel,
  setNewStatusLabel,
  newStatusColor,
  setNewStatusColor,

  editingStatusId,
  setEditingStatusId,
  editingStatusLabel,
  setEditingStatusLabel,
  editingStatusColor,
  setEditingStatusColor,

  refetchClientStatuses
}) => {
  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">
        Настраиваемые статусы для карточек клиентов (Новый, Активный, Пауза, Архив и др.). Отображаются в списке и в профиле клиента.
      </p>

      {clientStatusesLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Список статусов</p>
            <Dialog open={addStatusDialogOpen} onOpenChange={setAddStatusDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Добавить статус</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новый статус</DialogTitle>
                  <DialogDescription>Укажите название и цвет статуса.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="new-status-label">Название</Label>
                    <Input
                      id="new-status-label"
                      placeholder="Например, Активный"
                      value={newStatusLabel}
                      maxLength={16}
                      onChange={(e) => setNewStatusLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Цвет</Label>
                    <p className="text-xs text-muted-foreground">
                      Выберите один из предустановленных контрастных цветов.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {STATUS_COLOR_PRESETS.map((c) => {
                        const selected = newStatusColor === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setNewStatusColor(c.value)}
                            className={cn(
                              "flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs",
                              selected
                                ? "ring-2 ring-primary border-primary"
                                : "border-border bg-background hover:bg-muted/60"
                            )}
                          >
                            <span
                              className="inline-block h-6 w-10 rounded"
                              style={{ backgroundColor: c.value }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    onClick={async () => {
                      const label = newStatusLabel.trim();
                      if (!label) return;
                      try {
                        const res = await fetch("/api/psychologist/client-statuses", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            label,
                            color:
                              newStatusColor ||
                              STATUS_COLOR_PRESETS[0]?.value ||
                              "hsl(217 91% 60%)"
                          })
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          toast.error(
                            data.message ?? "Не удалось добавить статус"
                          );
                          return;
                        }
                        setNewStatusLabel("");
                        setNewStatusColor(
                          STATUS_COLOR_PRESETS[0]?.value ?? "hsl(217 91% 60%)"
                        );
                        setAddStatusDialogOpen(false);
                        refetchClientStatuses();
                        toast.success("Статус добавлен");
                      } catch (err) {
                        console.error(err);
                        toast.error("Не удалось добавить статус");
                      }
                    }}
                  >
                    Добавить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {clientStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Нет статусов. Добавьте первый или используйте стандартные (появятся при открытии списка клиентов).
            </p>
          ) : (
            <div className="rounded-lg border divide-y">
              <div className="grid grid-cols-[1fr,120px,auto] gap-2 border-b bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
                <span>Название</span>
                <span>Цвет</span>
                <span className="text-right">Действия</span>
              </div>
              {clientStatuses.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[1fr,120px,auto] gap-2 items-center px-3 py-2"
                >
                  {editingStatusId === s.id ? (
                    <>
                      <Input
                        value={editingStatusLabel}
                        onChange={(e) => setEditingStatusLabel(e.target.value)}
                        className="h-8"
                        maxLength={16}
                      />
                      <div className="grid grid-cols-3 gap-1">
                        {STATUS_COLOR_PRESETS.map((c) => {
                          const selected =
                            (editingStatusColor || s.color) === c.value;
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setEditingStatusColor(c.value)}
                              className={cn(
                                "flex flex-col items-center gap-0.5 rounded-md border px-1.5 py-1",
                                selected
                                  ? "ring-2 ring-primary border-primary"
                                  : "border-border bg-background hover:bg-muted/60"
                              )}
                            >
                              <span
                                className="inline-block h-4 w-8 rounded"
                                style={{ backgroundColor: c.value }}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingStatusId(null);
                            setEditingStatusLabel("");
                            setEditingStatusColor("");
                          }}
                        >
                          Отмена
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                "/api/psychologist/client-statuses",
                                {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    id: s.id,
                                    label:
                                      editingStatusLabel.trim() || s.label,
                                    color:
                                      editingStatusColor.trim() || s.color
                                  })
                                }
                              );
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                toast.error(
                                  data.message ?? "Не удалось сохранить"
                                );
                                return;
                              }
                              setEditingStatusId(null);
                              setEditingStatusLabel("");
                              setEditingStatusColor("");
                              refetchClientStatuses();
                              toast.success("Статус сохранён");
                            } catch (err) {
                              console.error(err);
                              toast.error("Не удалось сохранить");
                            }
                          }}
                        >
                          Сохранить
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">{s.label}</span>
                      <span
                        className="inline-block h-6 w-6 rounded border shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <div className="flex items-center justify-end gap-1 min-w-[4.5rem]">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingStatusId(s.id);
                            setEditingStatusLabel(s.label);
                            setEditingStatusColor(s.color);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {s.key === "NEW" ? (
                          <span className="h-8 w-8 shrink-0" aria-hidden />
                        ) : (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  "/api/psychologist/client-statuses",
                                  {
                                    method: "DELETE",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: s.id })
                                  }
                                );
                                if (!res.ok) {
                                  const data = await res.json().catch(() => ({}));
                                  toast.error(
                                    data.message ?? "Не удалось удалить"
                                  );
                                  return;
                                }
                                refetchClientStatuses();
                                toast.success("Статус удалён");
                              } catch (err) {
                                console.error(err);
                                toast.error("Не удалось удалить");
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

