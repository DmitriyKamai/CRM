"use client";

import { ChevronDown } from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type AdaptationId = "shmishek" | "pavlova";

/** Параметры адаптации; количество вопросов может различаться между адаптациями. */
type Adaptation = {
  id: AdaptationId;
  label: string;
  questionCount: number;
  approximateTime: string;
  linkAvailable: boolean;
};

type ClientOption = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
};

const QUESTIONNAIRE = {
  name: "Личностный опросник для определения типа акцентуаций",
  author: "Леонгард К., Шмишек Г.",
  description:
    "Методика была разработана Гансом Шмишеком в 1970 году на основе концепции «акцентуированных личностей» Карла Леонгарда. Опросник предназначен для определения как явных, так и скрытых акцентуаций характера у подростков и взрослых."
};

const ADAPTATIONS: Adaptation[] = [
  {
    id: "shmishek",
    label: "Крук И.В., 1975 (детская)",
    questionCount: 88,
    approximateTime: "15–20 мин",
    linkAvailable: true
  },
  {
    id: "pavlova",
    label: "Павлова Г.Г., 2025",
    questionCount: 88,
    approximateTime: "15–20 мин",
    linkAvailable: true
  }
];

export function PsychologistDiagnosticsClient() {
  const [selectedAdaptationId, setSelectedAdaptationId] =
    useState<AdaptationId>("shmishek");
  const selectedAdaptation =
    ADAPTATIONS.find(a => a.id === selectedAdaptationId) ?? ADAPTATIONS[0];

  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [sendingToClient, setSendingToClient] = useState(false);
  const [sendToClientSuccess, setSendToClientSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLinkUrl(null);
  }, [selectedAdaptationId]);

  async function handleCreateLink() {
    const endpoint =
      selectedAdaptationId === "pavlova"
        ? "/api/diagnostics/pavlova/link"
        : "/api/diagnostics/shmishek/link";
    setLoadingLink(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
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
      `Пожалуйста, пройдите психодиагностический тест «${QUESTIONNAIRE.name}» (адаптация: ${selectedAdaptation.label}).`
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
      <div className="grid gap-4 md:grid-cols-[minmax(0,380px),minmax(0,1fr)]">
        {/* Один опросник слева */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Психодиагностические методики</CardTitle>
            <CardDescription className="text-xs">
              Выберите опросник, чтобы посмотреть описание и доступные действия.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 px-3 py-2.5 text-left text-sm">
              <span className="font-medium leading-snug text-foreground">
                {QUESTIONNAIRE.name}
              </span>
              <span className="text-xs text-muted-foreground">
                Автор: {QUESTIONNAIRE.author}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Детали и выбор адаптации справа */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{QUESTIONNAIRE.name}</CardTitle>
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              <span>Автор: {QUESTIONNAIRE.author}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <label className="mb-1.5 block font-medium text-muted-foreground">
                Адаптация:
              </label>
              <Select
                value={selectedAdaptationId}
                onValueChange={(v: AdaptationId) => setSelectedAdaptationId(v)}
              >
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADAPTATIONS.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Описание:</dt>
                <dd className="mt-0.5 text-justify">{QUESTIONNAIRE.description}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Количество вопросов:</dt>
                <dd className="mt-0.5">{selectedAdaptation.questionCount}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Примерное время:</dt>
                <dd className="mt-0.5">{selectedAdaptation.approximateTime}</dd>
              </div>
            </dl>

            {selectedAdaptation.linkAvailable ? (
              <>
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
              </>
            ) : (
              <p className="text-xs text-muted-foreground rounded-md border border-muted bg-muted/30 px-3 py-2">
                Данная адаптация пока доступна только в виде описания.
              </p>
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
            <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPopoverOpen}
                  disabled={clientsLoading}
                  className={cn(
                    "h-9 w-full justify-between font-normal text-sm",
                    !selectedClientId && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">
                  {clientsLoading
                    ? "Загрузка..."
                    : selectedClientId
                      ? (() => {
                          const c = clients.find(x => x.id === selectedClientId);
                          return c
                            ? `${c.lastName} ${c.firstName}${c.email ? ` (${c.email})` : ""}`
                            : "Выберите клиента";
                        })()
                            : "Выберите клиента из списка"}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command
                  filter={(value, search) => {
                    const s = search.toLowerCase().trim();
                    if (!s) return 1;
                    return value.toLowerCase().includes(s) ? 1 : 0;
                  }}
                >
                  <CommandInput placeholder="Поиск по имени или email..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Клиент не найден</CommandEmpty>
                    <CommandGroup>
                      {clients.map(c => {
                        const label = `${c.lastName} ${c.firstName}${c.email ? ` ${c.email}` : ""}`;
                        return (
                          <CommandItem
                            key={c.id}
                            value={label}
                            onSelect={() => {
                              setSelectedClientId(c.id);
                              setClientPopoverOpen(false);
                            }}
                          >
                            {c.lastName} {c.firstName}
                            {c.email ? (
                              <span className="text-muted-foreground"> ({c.email})</span>
                            ) : null}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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

