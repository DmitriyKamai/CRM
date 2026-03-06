"use client";

import { useEffect, useState } from "react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type Method = {
  id: "shmishek";
  name: string;
  shortName: string;
  description: string;
};

type ClientOption = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
};

const METHODS: Method[] = [
  {
    id: "shmishek",
    name: "Опросник акцентуаций характера Шмишека",
    shortName: "Шмишек",
    description:
      "Классический опросник для оценки акцентуаций характера по методике К. Леонгарда – Х. Шмишека. Используется для первичной диагностики и уточнения индивидуально‑типологических особенностей клиента."
  }
];

export function PsychologistDiagnosticsClient() {
  const [selectedMethodId, setSelectedMethodId] = useState<Method["id"]>("shmishek");
  const selectedMethod =
    METHODS.find(m => m.id === selectedMethodId) ?? METHODS[0];

  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sendingToClient, setSendingToClient] = useState(false);
  const [sendToClientSuccess, setSendToClientSuccess] = useState<string | null>(null);

  async function handleCreateLink() {
    setLoadingLink(true);
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
      setLinkUrl(typeof data.url === "string" ? data.url : null);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось создать ссылку на тест"
      );
    } finally {
      setLoadingLink(false);
    }
  }

  async function handleCopy() {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
    } catch {
      // игнорируем — не критично
    }
  }

  function handleOpenInNewTab() {
    if (!linkUrl) {
      setError("Сначала создайте ссылку для прохождения.");
      return;
    }
    try {
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!sendDialogOpen || clients.length > 0 || clientsLoading) return;
    setClientsLoading(true);
    setClientsError(null);
    void (async () => {
      try {
        const res = await fetch("/api/psychologist/clients");
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as
          | { clients?: { id: string; firstName: string; lastName: string; email?: string | null }[] }
          | null;
        if (!data?.clients) return;
        setClients(
          data.clients.map(c => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email ?? null
          }))
        );
      } catch (err) {
        console.error(err);
        setClientsError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить список клиентов"
        );
      } finally {
        setClientsLoading(false);
      }
    })();
  }, [sendDialogOpen, clients.length, clientsLoading]);

  /** Отправить тест в кабинет клиента: создаём ссылку с clientId и уведомление */
  async function handleSendToClient() {
    if (!selectedClientId) return;
    setSendingToClient(true);
    setClientsError(null);
    setSendToClientSuccess(null);
    try {
      const res = await fetch("/api/diagnostics/shmishek/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось отправить тест клиенту");
      }
      const url = typeof data.url === "string" ? data.url : null;
      setSendToClientSuccess(
        url
          ? "Тест отправлен. Клиент получит уведомление и увидит тест в личном кабинете."
          : "Тест отправлен клиенту."
      );
      setLinkUrl(url);
    } catch (err) {
      console.error(err);
      setClientsError(
        err instanceof Error ? err.message : "Не удалось отправить тест клиенту"
      );
    } finally {
      setSendingToClient(false);
    }
  }

  /** Скопировать текст приглашения в буфер (для ручной отправки) */
  async function handlePrepareMessage() {
    if (!linkUrl) {
      setError("Сначала создайте ссылку для прохождения.");
      return;
    }
    if (!selectedClientId) return;
    const client = clients.find(c => c.id === selectedClientId);
    const textParts: string[] = [];
    textParts.push(
      `Здравствуйте${
        client ? `, ${client.firstName} ${client.lastName}` : ""
      }!`
    );
    textParts.push(
      `Пожалуйста, пройдите психодиагностический тест «${selectedMethod.name}».`
    );
    textParts.push(`Ссылка для прохождения: ${linkUrl}`);
    const message = textParts.join("\n\n");
    try {
      await navigator.clipboard.writeText(message);
      setClientsError(
        "Текст приглашения скопирован в буфер обмена. Вставьте его в письмо или мессенджер."
      );
    } catch {
      setClientsError(
        "Не удалось скопировать текст. Вы можете скопировать ссылку вручную."
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,260px),minmax(0,1fr)]">
        {/* Список методик слева */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Психодиагностические методики</CardTitle>
            <CardDescription className="text-xs">
              Выберите опросник, чтобы посмотреть описание и доступные действия.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex flex-col gap-1">
              {METHODS.map(method => {
                const active = method.id === selectedMethodId;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethodId(method.id)}
                    className={
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors " +
                      (active
                        ? "bg-muted text-foreground"
                        : "bg-background/30 text-muted-foreground hover:bg-muted/40 hover:text-foreground")
                    }
                  >
                    <span className="font-medium">{method.shortName}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Детали выбранной методики справа */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{selectedMethod.name}</CardTitle>
            <CardDescription className="text-xs">
              {selectedMethod.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {error && (
              <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleCreateLink}
                disabled={loadingLink}
              >
                {loadingLink ? "Создаём ссылку..." : "Создать ссылку для прохождения"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenInNewTab}
              >
                Открыть форму теста
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSendDialogOpen(true)}
              >
                Отправить клиенту
              </Button>
            </div>

            {!linkUrl && (
              <p className="text-xs text-muted-foreground">
                Для открытия формы и отправки клиенту сначала создайте ссылку.
              </p>
            )}

            {linkUrl && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Сгенерированная ссылка (можно отправить вручную клиенту):
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
              </div>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              В дальнейшем здесь можно будет добавить другие опросники и смотреть
              историю прохождения тестов клиентами.
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Диалог отправки клиенту */}
      <Dialog
        open={sendDialogOpen}
        onOpenChange={open => {
          setSendDialogOpen(open);
          if (!open) {
            setSendToClientSuccess(null);
            setClientsError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Отправка теста клиенту</DialogTitle>
            <DialogDescription>
              Выберите клиента. При нажатии «Отправить в кабинет» клиент получит
              уведомление, а тест появится в его личном кабинете. Либо скопируйте
              приглашение для отправки вручную.
            </DialogDescription>
          </DialogHeader>

          {sendToClientSuccess && (
            <div className="rounded-md border border-green-500/60 bg-green-500/10 px-3 py-2 text-xs text-green-200">
              {sendToClientSuccess}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground">Клиент</p>
            <Select
              value={selectedClientId ?? ""}
              onValueChange={value => setSelectedClientId(value || null)}
              disabled={clientsLoading}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue
                  placeholder={
                    clientsLoading ? "Загрузка..." : "Выберите клиента из списка"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.lastName} {c.firstName}
                    {c.email ? ` (${c.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientsError && (
              <p className="text-xs text-destructive">{clientsError}</p>
            )}
          </div>

          <DialogFooter className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!selectedClientId || sendingToClient}
              onClick={handleSendToClient}
            >
              {sendingToClient ? "Отправка…" : "Отправить в кабинет"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!linkUrl || !selectedClientId}
              onClick={handlePrepareMessage}
            >
              Скопировать приглашение
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

