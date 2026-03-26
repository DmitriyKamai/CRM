"use client";

import type { Dispatch, FC, SetStateAction } from "react";

import type { CustomFieldDef } from "@/hooks/use-custom-fields-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

export type CustomFieldsTabRow = { name: string; description?: string; count: number };

type Props = {
  createTabDialogOpen: boolean;
  setCreateTabDialogOpen: Dispatch<SetStateAction<boolean>>;

  newTabName: string;
  setNewTabName: Dispatch<SetStateAction<string>>;
  newTabDescription: string;
  setNewTabDescription: Dispatch<SetStateAction<string>>;

  setLocalTabs: Dispatch<SetStateAction<{ name: string; description: string }[]>>;

  setNewFieldGroup: Dispatch<SetStateAction<string>>;

  allTabsForList: CustomFieldsTabRow[];

  editingTabGroup: string | null;
  setEditingTabGroup: Dispatch<SetStateAction<string | null>>;
  editingTabName: string;
  setEditingTabName: Dispatch<SetStateAction<string>>;
  editingTabDescription: string;
  setEditingTabDescription: Dispatch<SetStateAction<string>>;

  customFields: CustomFieldDef[];
  refetchCustomFields: () => void;

  setCustomFieldsError: Dispatch<SetStateAction<string | null>>;
};

export const CustomFieldsTabsPanel: FC<Props> = ({
  createTabDialogOpen,
  setCreateTabDialogOpen,

  newTabName,
  setNewTabName,
  newTabDescription,
  setNewTabDescription,
  setLocalTabs,
  setNewFieldGroup,

  allTabsForList,

  editingTabGroup,
  setEditingTabGroup,
  editingTabName,
  setEditingTabName,
  editingTabDescription,
  setEditingTabDescription,

  customFields,
  refetchCustomFields,

  setCustomFieldsError
}) => {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">Вкладки</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Вкладки группируют поля в отдельные разделы карточки клиента.
          </p>
          <Dialog open={createTabDialogOpen} onOpenChange={setCreateTabDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Создать вкладку</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Создать вкладку</DialogTitle>
                <DialogDescription>
                  Укажите название и, при необходимости, описание вкладки для дополнительных данных
                  клиента.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="new-tab-name-dialog">Название вкладки</Label>
                  <Input
                    id="new-tab-name-dialog"
                    placeholder="Например, Анамнез"
                    value={newTabName}
                    maxLength={64}
                    onChange={(e) => setNewTabName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-tab-description-dialog">Описание вкладки</Label>
                  <Textarea
                    id="new-tab-description-dialog"
                    rows={3}
                    placeholder="Кратко опишите, какие данные будут храниться на этой вкладке"
                    value={newTabDescription}
                    maxLength={512}
                    onChange={(e) => setNewTabDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => {
                    const name = newTabName.trim();
                    const description = newTabDescription.trim();
                    if (!name) return;
                    setLocalTabs((prev) => {
                      const without = prev.filter((t) => t.name !== name);
                      return [...without, { name, description }];
                    });
                    setNewTabName("");
                    setNewTabDescription("");
                    setNewFieldGroup(name);
                    setCreateTabDialogOpen(false);
                  }}
                >
                  Сохранить вкладку
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Существующие вкладки</p>
          {allTabsForList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Пока нет ни одной вкладки. Создайте вкладку слева, затем добавьте на неё поля.
            </p>
          ) : (
            <div className="rounded-lg border bg-card">
              <div className="grid grid-cols-[1.5fr,2fr,auto] gap-2 border-b bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
                <span>Название</span>
                <span>Описание</span>
                <span className="text-right">Действия</span>
              </div>
              <div className="divide-y">
                {allTabsForList.map((g) => (
                  <div
                    key={g.name}
                    className="grid grid-cols-[1.5fr,2fr,auto] items-start gap-2 px-3 py-2 text-sm"
                  >
                    {editingTabGroup === g.name ? (
                      <>
                        <div className="space-y-1">
                          <Input
                            value={editingTabName}
                            onChange={(e) => setEditingTabName(e.target.value)}
                            placeholder="Название вкладки"
                          />
                        </div>
                        <div className="space-y-1">
                          <Textarea
                            rows={2}
                            className="text-xs"
                            placeholder="Описание вкладки"
                            value={editingTabDescription}
                            onChange={(e) => setEditingTabDescription(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTabGroup(null);
                              setEditingTabName("");
                              setEditingTabDescription("");
                            }}
                          >
                            Отменить
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={async () => {
                              const nextName = editingTabName.trim();
                              const nextDescription = editingTabDescription.trim();
                              if (!nextName) return;
                              const defsForGroup = customFields.filter(
                                (f) =>
                                  f.group &&
                                  typeof f.group === "string" &&
                                  f.group.trim() === g.name
                              );
                              try {
                                if (defsForGroup.length === 0) {
                                  setLocalTabs((prev) =>
                                    prev.map((t) =>
                                      t.name === g.name
                                        ? {
                                            name: nextName,
                                            description: nextDescription
                                          }
                                        : t
                                    )
                                  );
                                } else {
                                  await Promise.all(
                                    defsForGroup.map((f) =>
                                      fetch("/api/psychologist/custom-fields", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          id: f.id,
                                          group: nextName,
                                          description:
                                            nextDescription.length > 0
                                              ? nextDescription
                                              : null
                                        })
                                      })
                                    )
                                  );
                                  refetchCustomFields();
                                }
                                setEditingTabGroup(null);
                                setEditingTabName("");
                                setEditingTabDescription("");
                              } catch (err) {
                                console.error(err);
                                setCustomFieldsError("Не удалось сохранить вкладку");
                              }
                            }}
                          >
                            Сохранить
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-0.5">
                          <span>{g.name}</span>
                          <p className="text-xs text-muted-foreground">
                            Полей: {g.count}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          {g.description ? (
                            <p className="text-xs text-muted-foreground">{g.description}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Описание не задано</p>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingTabGroup(g.name);
                              setEditingTabName(g.name);
                              setEditingTabDescription(g.description ?? "");
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
                              const defsForGroup = customFields.filter(
                                (f) =>
                                  f.group &&
                                  typeof f.group === "string" &&
                                  f.group.trim() === g.name
                              );
                              try {
                                if (defsForGroup.length === 0) {
                                  setLocalTabs((prev) => prev.filter((t) => t.name !== g.name));
                                } else {
                                  await Promise.all(
                                    defsForGroup.map((f) =>
                                      fetch(
                                        `/api/psychologist/custom-fields?id=${encodeURIComponent(
                                          f.id
                                        )}`,
                                        { method: "DELETE" }
                                      )
                                    )
                                  );
                                  refetchCustomFields();
                                }
                              } catch (err) {
                                console.error(err);
                                setCustomFieldsError("Не удалось удалить вкладку");
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
      </div>
    </div>
  );
};

