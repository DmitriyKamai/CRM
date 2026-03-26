"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ModulesData {
  schedulingEnabled: boolean;
  diagnosticsEnabled: boolean;
}

async function fetchModules(): Promise<ModulesData> {
  const res = await fetch("/api/admin/platform-modules");
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Не удалось загрузить настройки");
  return data as ModulesData;
}

async function patchModules(partial: Partial<ModulesData>): Promise<ModulesData> {
  const res = await fetch("/api/admin/platform-modules", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Не удалось сохранить");
  return data as ModulesData;
}

export function ModulesSettingsClient() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-platform-modules"],
    queryFn: fetchModules
  });

  const mutation = useMutation({
    mutationFn: patchModules,
    onSuccess: updated => {
      queryClient.setQueryData(["admin-platform-modules"], updated);
      toast.success("Настройки модулей обновлены");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка…</p>;
  }

  const scheduling = data?.schedulingEnabled ?? true;
  const diagnostics = data?.diagnosticsEnabled ?? true;

  return (
    <div className="grid gap-4 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Записи и расписание</CardTitle>
          <CardDescription>
            Расписание психолога, онлайн-запись на слоты, календарь (ICS), слоты и связанные API.
            Каталог психологов для клиентов остаётся доступен; блок записи на странице психолога
            скрывается. Отдельный модуль «только каталог» можно выделить позже.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <Label htmlFor="mod-scheduling" className="cursor-pointer">
            Модуль включён
          </Label>
          <Switch
            id="mod-scheduling"
            checked={scheduling}
            disabled={mutation.isPending}
            onCheckedChange={v => mutation.mutate({ schedulingEnabled: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Психодиагностика</CardTitle>
          <CardDescription>
            Тесты Шмишек / Павлова / СМИЛ, ссылки на прохождение, результаты в кабинетах, админка
            тестов. При выключении весь функционал скрыт, данные не отдаются.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <Label htmlFor="mod-diagnostics" className="cursor-pointer">
            Модуль включён
          </Label>
          <Switch
            id="mod-diagnostics"
            checked={diagnostics}
            disabled={mutation.isPending}
            onCheckedChange={v => mutation.mutate({ diagnosticsEnabled: v })}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Изменения применяются ко всем ролям сразу после сохранения. Прямые ссылки на отключённые
        разделы перенаправляют в кабинет или показывают сообщение.
      </p>

      <Button type="button" variant="outline" size="sm" asChild>
        <Link href="/admin">Назад к обзору</Link>
      </Button>
    </div>
  );
}
