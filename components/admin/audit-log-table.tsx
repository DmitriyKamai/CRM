"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  actorUserId: string | null;
  actorRole: string | null;
  actorEmail: string | null;
  actorName: string | null;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  meta: Record<string, unknown> | null;
};

function qs(v: string | null | undefined) {
  return (v ?? "").trim();
}

function formatActorRole(role: string | null | undefined) {
  const v = (role ?? "").trim();
  if (!v) return "—";
  if (v === "ADMIN") return "Админ";
  if (v === "PSYCHOLOGIST") return "Психолог";
  if (v === "CLIENT") return "Клиент";
  if (v === "UNSPECIFIED") return "Не определено";
  return v;
}

function formatAction(action: string) {
  switch (action) {
    case "PASSWORD_CHANGE":
      return "Смена пароля";
    case "ADMIN_USER_ROLE_CHANGE":
      return "Смена роли админом";
    case "CALENDAR_FEED_TOKEN_ROTATE":
      return "Перевыпуск календарной ссылки";
    case "SCHEDULE_SLOT_DELETE":
      return "Удаление слота расписания";
    case "APPOINTMENT_STATUS_CHANGE":
      return "Изменение статуса записи";
    case "ADMIN_TEST_TOGGLE":
      return "Переключение активности теста";
    default:
      return action;
  }
}

export function AuditLogTable() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [action, setAction] = useState("");
  const [actorRole, setActorRole] = useState<string>("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [take, setTake] = useState<number>(50);

  const ACTION_ALL = "ALL";

  const totalPages = Math.max(1, Math.ceil(totalCount / take));

  function buildQueryString(
    pageValue: number,
    overrides?: { action?: string; actorRole?: string; targetType?: string; targetId?: string; from?: string; to?: string; take?: number }
  ) {
    const nextAction = overrides?.action ?? action;
    const nextActorRole = overrides?.actorRole ?? actorRole;
    const nextTargetType = overrides?.targetType ?? targetType;
    const nextTargetId = overrides?.targetId ?? targetId;
    const nextFrom = overrides?.from ?? from;
    const nextTo = overrides?.to ?? to;
    const nextTake = overrides?.take ?? take;
    const sp = new URLSearchParams();
    if (qs(nextAction)) sp.set("action", qs(nextAction));
    if (qs(nextActorRole)) sp.set("actorRole", qs(nextActorRole));
    if (qs(nextTargetType)) sp.set("targetType", qs(nextTargetType));
    if (qs(nextTargetId)) sp.set("targetId", qs(nextTargetId));
    if (qs(nextFrom)) sp.set("from", qs(nextFrom));
    if (qs(nextTo)) sp.set("to", qs(nextTo));
    if (nextTake) sp.set("take", String(nextTake));
    if (pageValue) sp.set("page", String(pageValue));
    return sp.toString();
  }

  async function load(
    pageValue: number,
    overrides?: { action?: string; actorRole?: string; targetType?: string; targetId?: string; from?: string; to?: string; take?: number }
  ) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/audit-log?${buildQueryString(pageValue, overrides)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Не удалось загрузить аудит-лог");
      }
      const data = (await res.json()) as { rows: AuditRow[]; totalCount: number };
      setRows(data.rows);
      setTotalCount(data.totalCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить аудит-лог");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    setPage(1);
    load(1);
  }

  function goToPage(next: number) {
    const clamped = Math.min(Math.max(1, next), totalPages);
    setPage(clamped);
    load(clamped);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Аудит действий пользователей
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={applyFilters}>
            Применить / обновить
          </Button>
        </div>
      </div>

      {/* Быстрые фильтры */}
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Быстрый фильтр</div>
          <Select
            value={[
              "PASSWORD_CHANGE",
              "ADMIN_USER_ROLE_CHANGE",
              "CALENDAR_FEED_TOKEN_ROTATE",
              "SCHEDULE_SLOT_DELETE",
              "APPOINTMENT_STATUS_CHANGE",
              "ADMIN_TEST_TOGGLE"
            ].includes(action)
              ? action
              : ACTION_ALL}
            onValueChange={(v) => {
              if (v === ACTION_ALL) {
                setAction("");
                void load(1, { action: "" });
              } else {
                setAction(v);
                void load(1, { action: v });
              }
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Любое" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ACTION_ALL}>Любое</SelectItem>
              <SelectItem value="PASSWORD_CHANGE">Смена пароля</SelectItem>
              <SelectItem value="ADMIN_USER_ROLE_CHANGE">Смена роли админом</SelectItem>
              <SelectItem value="CALENDAR_FEED_TOKEN_ROTATE">Перевыпуск календарной ссылки</SelectItem>
              <SelectItem value="SCHEDULE_SLOT_DELETE">Удаление слота расписания</SelectItem>
              <SelectItem value="APPOINTMENT_STATUS_CHANGE">Изменение статуса записи</SelectItem>
              <SelectItem value="ADMIN_TEST_TOGGLE">Переключение активности теста</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Событие</div>
          <Input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Напр. PASSWORD_CHANGE"
          />
        </div>

        <div className="md:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Роль</div>
          <Select value={actorRole} onValueChange={setActorRole}>
            <SelectTrigger>
              <SelectValue placeholder="Любая" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Админ</SelectItem>
              <SelectItem value="PSYCHOLOGIST">Психолог</SelectItem>
              <SelectItem value="CLIENT">Клиент</SelectItem>
              <SelectItem value="UNSPECIFIED">Не определено</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Тип объекта</div>
          <Input
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            placeholder="Напр. User / PsychologistProfile"
          />
        </div>

        <div className="md:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">ID объекта</div>
          <Input
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="ID"
          />
        </div>

        <div className="md:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Записей</div>
          <Select value={String(take)} onValueChange={(v) => setTake(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">С</div>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">По</div>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Загружаем аудит-лог...</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">Событий не найдено.</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-full text-xs text-left">
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="align-middle">Дата</TableHead>
                <TableHead className="align-middle">Событие</TableHead>
                <TableHead className="align-middle">Исполнитель</TableHead>
                <TableHead className="align-middle">Объект</TableHead>
                <TableHead className="align-middle">IP</TableHead>
                <TableHead className="align-middle">Данные</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short"
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{formatAction(r.action)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div>{formatActorRole(r.actorRole)}</div>
                    <div className="text-[11px]">
                      {r.actorEmail ?? r.actorName ?? r.actorUserId ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div>{r.targetType ?? "—"}</div>
                    <div>{r.targetId ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.ip ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[320px]">
                    <div className="max-h-28 overflow-auto rounded border border-border/60 p-2 bg-card">
                      {r.meta ? JSON.stringify(r.meta) : "—"}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Пагинация */}
      {!loading && totalCount > 0 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-muted-foreground">
            Страница <span className="font-medium text-foreground">{page}</span> из{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              Назад
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
              Далее
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

