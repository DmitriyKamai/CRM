"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function ModulesSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(true);
  const [diagnostics, setDiagnostics] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/platform-modules");
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.message ?? "Не удалось загрузить настройки");
        }
        if (!cancelled) {
          setScheduling(Boolean(data?.schedulingEnabled));
          setDiagnostics(Boolean(data?.diagnosticsEnabled));
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function patch(partial: { schedulingEnabled?: boolean; diagnosticsEnabled?: boolean }) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/platform-modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось сохранить");
      }
      if (typeof data?.schedulingEnabled === "boolean") setScheduling(data.schedulingEnabled);
      if (typeof data?.diagnosticsEnabled === "boolean") setDiagnostics(data.diagnosticsEnabled);
      toast.success("Настройки модулей обновлены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Загрузка…</p>;
  }

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
            disabled={saving}
            onCheckedChange={(v) => {
              setScheduling(v);
              void patch({ schedulingEnabled: v });
            }}
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
            disabled={saving}
            onCheckedChange={(v) => {
              setDiagnostics(v);
              void patch({ diagnosticsEnabled: v });
            }}
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
