"use client";

import type { Dispatch, FC, SetStateAction } from "react";

import type { CustomFieldDef } from "@/hooks/use-custom-fields-settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type AvailableTab = { name: string; description?: string };

export type CustomFieldType =
  | "TEXT"
  | "MULTILINE"
  | "NUMBER"
  | "DATE"
  | "BOOLEAN"
  | "SELECT"
  | "MULTI_SELECT";

type Props = {
  availableTabs: AvailableTab[];
  customFieldsLoading: boolean;
  customFields: CustomFieldDef[];

  // Состояние создания нового поля
  newFieldGroup: string;
  setNewFieldGroup: Dispatch<SetStateAction<string>>;
  newFieldLabel: string;
  setNewFieldLabel: Dispatch<SetStateAction<string>>;
  newFieldType: CustomFieldType;
  setNewFieldType: Dispatch<SetStateAction<CustomFieldType>>;
  newFieldOptionLabels: string[];
  setNewFieldOptionLabels: Dispatch<SetStateAction<string[]>>;

  // Ошибка (общая для вкладки customFields)
  setCustomFieldsError: Dispatch<SetStateAction<string | null>>;
  refetchCustomFields: () => void;

  // Состояние редактирования поля
  editingFieldId: string | null;
  setEditingFieldId: Dispatch<SetStateAction<string | null>>;
  editingLabel: string;
  setEditingLabel: Dispatch<SetStateAction<string>>;
  editingGroup: string;
  setEditingGroup: Dispatch<SetStateAction<string>>;
  editingDescription: string;
  setEditingDescription: Dispatch<SetStateAction<string>>;

  customFieldTypeLabels: Record<string, string>;
};

export const CustomFieldsFieldsPanel: FC<Props> = ({
  availableTabs,
  customFieldsLoading,
  customFields,

  newFieldGroup,
  setNewFieldGroup,
  newFieldLabel,
  setNewFieldLabel,
  newFieldType,
  setNewFieldType,
  newFieldOptionLabels,
  setNewFieldOptionLabels,

  setCustomFieldsError,
  refetchCustomFields,

  editingFieldId,
  setEditingFieldId,
  editingLabel,
  setEditingLabel,
  editingGroup,
  setEditingGroup,
  editingDescription,
  setEditingDescription,

  customFieldTypeLabels
}) => {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Поля</p>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">Создать поле</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать поле</DialogTitle>
              <DialogDescription>
                Укажите вкладку, название, тип поля и при необходимости опции.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="cf-group-dialog">
                    Вкладка <span className="text-destructive">*</span>
                  </Label>
                  <Select value={newFieldGroup} onValueChange={(v) => setNewFieldGroup(v)}>
                    <SelectTrigger id="cf-group-dialog">
                      <SelectValue placeholder="Выберите вкладку" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTabs.map((t) => (
                        <SelectItem key={t.name} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cf-label-dialog">
                    Название поля <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cf-label-dialog"
                    placeholder="Например, Основной запрос"
                    value={newFieldLabel}
                    onChange={(e) => {
                      setNewFieldLabel(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cf-type-dialog">
                    Тип поля <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newFieldType}
                    onValueChange={(v) =>
                      setNewFieldType(
                        v as
                          | "TEXT"
                          | "MULTILINE"
                          | "NUMBER"
                          | "DATE"
                          | "BOOLEAN"
                          | "SELECT"
                          | "MULTI_SELECT"
                      )
                    }
                  >
                    <SelectTrigger id="cf-type-dialog">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Текст (одна строка)</SelectItem>
                      <SelectItem value="MULTILINE">Текст (несколько строк)</SelectItem>
                      <SelectItem value="NUMBER">Число</SelectItem>
                      <SelectItem value="DATE">Дата</SelectItem>
                      <SelectItem value="BOOLEAN">Флажок</SelectItem>
                      <SelectItem value="SELECT">Выбор из списка (один вариант)</SelectItem>
                      <SelectItem value="MULTI_SELECT">
                        Выбор из списка (несколько вариантов)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(newFieldType === "SELECT" || newFieldType === "MULTI_SELECT") && (
                <div className="mt-2 space-y-2">
                  <Label>Варианты выбора</Label>
                  <div className="space-y-2">
                    {newFieldOptionLabels.map((label, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Текст варианта"
                          value={label}
                          onChange={(e) => {
                            const next = [...newFieldOptionLabels];
                            next[idx] = e.target.value;
                            setNewFieldOptionLabels(next);
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setNewFieldOptionLabels((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewFieldOptionLabels((prev) => [...prev, ""])}
                    >
                      Добавить вариант
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={async () => {
                  setCustomFieldsError(null);
                  if (!newFieldGroup.trim()) {
                    toast.error("Выберите вкладку");
                    return;
                  }
                  if (!newFieldLabel.trim()) {
                    toast.error("Введите название поля");
                    return;
                  }
                  if (
                    (newFieldType === "SELECT" || newFieldType === "MULTI_SELECT") &&
                    newFieldOptionLabels.every((label) => label.trim().length === 0)
                  ) {
                    toast.error("Добавьте хотя бы один вариант");
                    return;
                  }

                  const existingKeys = new Set(
                    customFields.map((f) => String(f.key ?? "")).filter(Boolean)
                  );
                  let baseKey = newFieldLabel
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, "_");
                  if (!baseKey) baseKey = `field_${customFields.length + 1}`;

                  let key = baseKey;
                  let counter = 2;
                  while (existingKeys.has(key)) {
                    key = `${baseKey}_${counter++}`;
                  }

                  try {
                    const res = await fetch("/api/psychologist/custom-fields", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        group: newFieldGroup.trim() || null,
                        key,
                        label: newFieldLabel.trim(),
                        type: newFieldType,
                        options:
                          newFieldType === "SELECT" || newFieldType === "MULTI_SELECT"
                            ? {
                                selectOptions: newFieldOptionLabels
                                  .map((label, i) => ({
                                    value: String(i),
                                    label: label.trim()
                                  }))
                                  .filter((o) => o.label.length > 0)
                              }
                            : null
                      })
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setCustomFieldsError(
                        data?.message ?? "Не удалось добавить поле"
                      );
                      return;
                    }

                    setNewFieldGroup("");
                    setNewFieldLabel("");
                    setNewFieldType("TEXT");
                    setNewFieldOptionLabels([]);
                    refetchCustomFields();
                  } catch (err) {
                    console.error(err);
                    setCustomFieldsError("Не удалось добавить поле");
                  }
                }}
              >
                Сохранить поле
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {customFieldsLoading ? (
        <p className="text-sm text-muted-foreground">Загружаем поля…</p>
      ) : customFields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Пока нет ни одного пользовательского поля. Сначала создайте вкладку, затем
          добавьте на неё поля.
        </p>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-[1.2fr,1.5fr,1.5fr,auto] gap-2 border-b bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
            <span>Вкладка</span>
            <span>Название</span>
            <span>Тип</span>
            <span className="text-right">Действия</span>
          </div>
          <div className="divide-y">
            {customFields.map((f) => (
              <div
                key={f.id}
                className="grid grid-cols-[1.2fr,1.5fr,1.5fr,auto] items-start gap-2 px-3 py-2 text-sm"
              >
                {editingFieldId === f.id ? (
                  <>
                    <div className="space-y-1">
                      <Select value={editingGroup || ""} onValueChange={(v) => setEditingGroup(v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Выберите вкладку" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTabs.map((t) => (
                            <SelectItem key={t.name} value={t.name}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Input
                        className="w-full"
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        placeholder="Название поля"
                      />
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {customFieldTypeLabels[f.type as string] ?? f.type}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingFieldId(null);
                        }}
                      >
                        Отменить
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          if (!editingLabel.trim()) return;
                          try {
                            const res = await fetch("/api/psychologist/custom-fields", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                id: f.id,
                                label: editingLabel.trim(),
                                group:
                                  editingGroup.trim().length > 0
                                    ? editingGroup.trim()
                                    : null,
                                description:
                                  editingDescription.trim().length > 0
                                    ? editingDescription.trim()
                                    : null
                              })
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) {
                              setCustomFieldsError(
                                data?.message ?? "Не удалось сохранить поле"
                              );
                              return;
                            }

                            setEditingFieldId(null);
                            setEditingLabel("");
                            setEditingGroup("");
                            setEditingDescription("");
                            refetchCustomFields();
                          } catch (err) {
                            console.error(err);
                            setCustomFieldsError("Не удалось сохранить поле");
                          }
                        }}
                      >
                        Сохранить
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span>{f.group ?? "Без вкладки"}</span>
                    <div className="space-y-0.5">
                      <span>{f.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {customFieldTypeLabels[f.type as string] ?? f.type}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingFieldId(f.id);
                          setEditingLabel(f.label ?? "");
                          setEditingGroup(
                            f.group && typeof f.group === "string" ? f.group : ""
                          );
                          setEditingDescription(f.description ?? "");
                          setCustomFieldsError(null);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `/api/psychologist/custom-fields?id=${encodeURIComponent(
                                f.id
                              )}`,
                              { method: "DELETE" }
                            );
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) {
                              setCustomFieldsError(
                                data?.message ?? "Не удалось удалить поле"
                              );
                              return;
                            }
                            refetchCustomFields();
                          } catch (err) {
                            console.error(err);
                            setCustomFieldsError("Не удалось удалить поле");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

