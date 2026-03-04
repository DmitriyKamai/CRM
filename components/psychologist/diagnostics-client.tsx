"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PsychologistDiagnosticsClient() {
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateLink() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostics/shmishek/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось создать ссылку");
      }
      setLinkUrl(data.url ?? null);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось создать ссылку на тест"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Диагностика</CardTitle>
          <CardDescription>
            Управление ссылками на прохождение опросника Шмишека для клиентов.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Создайте персональную ссылку на тест, отправьте её клиенту (по
            почте, в мессенджере и т.п.). После прохождения результаты появятся
            в CRM.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleCreateLink} disabled={loading}>
              {loading ? "Создаём ссылку..." : "Создать ссылку на Шмишека"}
            </Button>
            {linkUrl && (
              <div className="flex gap-2 items-center">
                <Input readOnly value={linkUrl} className="text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  Скопировать
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Позже здесь можно будет управлять разными тестами, просматривать
            список приглашённых клиентов и их статус прохождения.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

