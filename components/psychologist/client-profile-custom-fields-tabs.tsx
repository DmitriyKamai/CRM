"use client";

import type { Dispatch, SetStateAction } from "react";

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions
} from "@dnd-kit/core";
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Paperclip, Download, Trash } from "lucide-react";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { shouldCloseCalendarPopoverAfterSelect } from "@/lib/close-calendar-popover";

type CustomFieldSelectOption = {
  value: string;
  label: string;
};

type CustomFieldDef = {
  id: string;
  label: string;
  type: string;
  group?: string | null;
  description?: string | null;
  options?: { selectOptions?: CustomFieldSelectOption[] } | null;
};

type ClientFileItem = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

const FIELD_ROW_CLASS =
  "flex flex-col gap-1 py-3 border-b border-border last:border-b-0 md:flex-row md:items-center md:gap-4";
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 16" fill="currentColor" className="block h-full w-auto min-w-3 shrink-0 text-muted-foreground">
              <circle cx="2.5" cy="2.5" r="1.2" />
              <circle cx="2.5" cy="8" r="1.2" />
              <circle cx="2.5" cy="13.5" r="1.2" />
            </svg>
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

type Props = {
  clientId: string;

  customFieldsLoading: boolean;
  customFieldDefs: CustomFieldDef[];
  customFieldValues: Record<string, unknown>;
  setCustomFieldDefs: Dispatch<SetStateAction<CustomFieldDef[]>>;
  setCustomFieldValues: Dispatch<SetStateAction<Record<string, unknown>>>;

  customFieldsSaving: boolean;
  setCustomFieldsSaving: Dispatch<SetStateAction<boolean>>;

  isEditing: boolean;
  setEditing: (v: boolean) => void;

  groupDescriptions: Map<string, string>;

  sortableSensors: SensorDescriptor<SensorOptions>[];
  cfDatePopoverFieldId: string | null;
  setCfDatePopoverFieldId: Dispatch<SetStateAction<string | null>>;

  refetchCustomFieldDefs: () => void;

  saving: boolean;
  deleting: boolean;
  cancelAll: () => void;
  saveAll: () => Promise<void>;

  setHistoryTick: Dispatch<SetStateAction<number>>;

  files: ClientFileItem[];
  filesLoading: boolean;
  filesError: string | null;
  setFiles: Dispatch<SetStateAction<ClientFileItem[]>>;
  setFilesLoading: Dispatch<SetStateAction<boolean>>;
  setFilesError: Dispatch<SetStateAction<string | null>>;
};

export function ClientProfileCustomFieldsTabs({
  clientId,

  customFieldsLoading,
  customFieldDefs,
  customFieldValues,
  setCustomFieldDefs,
  setCustomFieldValues,

  customFieldsSaving,
  setCustomFieldsSaving,

  isEditing,
  setEditing,

  groupDescriptions,

  sortableSensors,
  cfDatePopoverFieldId,
  setCfDatePopoverFieldId,

  refetchCustomFieldDefs,

  saving,
  deleting,
  cancelAll,
  saveAll,

  setHistoryTick,

  files,
  filesLoading,
  filesError,
  setFiles,
  setFilesLoading,
  setFilesError
}: Props) {
  return (
    <>
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
              <p className="text-sm text-muted-foreground">{groupDescription}</p>
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
                      `/api/psychologist/clients/${clientId}/custom-fields`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ values: customFieldValues })
                      }
                    );
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      toast.error(
                        (data as { message?: string }).message ??
                          "Не удалось сохранить поля"
                      );
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
                            <SortableFieldWrap
                              key={def.id}
                              id={def.id}
                              isEditing={true}
                            >
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
                                      onOpenChange={(open) =>
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
                                          onSelect={(date) => {
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
                                          const current: string[] = Array.isArray(value) ? value : [];
                                          const checked = current.includes(opt.value);
                                          return (
                                            <label
                                              key={opt.value}
                                              className="flex items-center gap-2 text-sm cursor-pointer"
                                            >
                                              <Checkbox
                                                checked={checked}
                                                onCheckedChange={(checkedValue) => {
                                                  const next = new Set(current);
                                                  if (checkedValue) next.add(opt.value);
                                                  else next.delete(opt.value);
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
                                    const current: string[] = Array.isArray(value) ? value : [];
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
                      const input = e.currentTarget.elements.namedItem(
                        "file"
                      ) as HTMLInputElement | null;
                      if (!input?.files || !input.files[0]) return;

                      const file = input.files[0];
                      const form = new FormData();
                      form.append("file", file);

                      setFilesLoading(true);
                      setFilesError(null);
                      try {
                        const res = await fetch(`/api/psychologist/clients/${clientId}/files`, {
                          method: "POST",
                          body: form
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          setFilesError(data?.message ?? "Не удалось загрузить файл");
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
                    <input type="file" name="file" className="hidden" id={`client-file-${clientId}`} />
                    <label htmlFor={`client-file-${clientId}`}>
                      <Button type="button" variant="outline" size="sm" asChild>
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
                  <p className="text-sm text-muted-foreground">Загружаем список файлов…</p>
                ) : files.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Пока нет прикреплённых файлов.</p>
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
                            {(f.size / 1024).toFixed(1)} КБ · {new Date(f.createdAt).toLocaleDateString("ru-RU")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
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
                                const res = await fetch(`/api/psychologist/clients/${clientId}/files/${f.id}`, {
                                  method: "DELETE"
                                });
                                if (res.ok) {
                                  setFiles((prev) => prev.filter((file) => file.id !== f.id));
                                  setHistoryTick((t) => t + 1);
                                } else {
                                  const data = await res.json().catch(() => ({}));
                                  toast.error(
                                    (data as { message?: string }).message ?? "Не удалось удалить файл"
                                  );
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
    </>
  );
}

