"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type Role = "CLIENT" | "PSYCHOLOGIST" | "ADMIN";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
}

export function UsersTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [take, setTake] = useState<number>(25);

  // Быстрые фильтры
  const [role, setRole] = useState<string>(""); // пусто = все
  const [search, setSearch] = useState<string>("");

  const totalPages = Math.max(1, Math.ceil(totalCount / take));

  const ALL_ROLE = "ALL";

  function buildQueryString(
    pageValue: number,
    overrides?: { role?: string; search?: string; take?: number }
  ) {
    const nextRole = overrides?.role ?? role;
    const nextSearch = overrides?.search ?? search;
    const nextTake = overrides?.take ?? take;
    const sp = new URLSearchParams();
    if (nextRole && nextRole !== ALL_ROLE) sp.set("role", nextRole);
    if (nextSearch.trim()) sp.set("search", nextSearch.trim());
    sp.set("take", String(nextTake));
    sp.set("page", String(pageValue));
    return sp.toString();
  }

  async function load(
    pageValue: number,
    overrides?: { role?: string; search?: string; take?: number }
  ) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/users?${buildQueryString(pageValue, overrides)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Не удалось загрузить пользователей");
      }
      const data = (await res.json()) as {
        rows: UserRow[];
        totalCount: number;
      };
      setUsers(data.rows);
      setTotalCount(data.totalCount ?? 0);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить пользователей"
      );
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

  async function changeRole(userId: string, role: Role) {
    setSavingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось изменить роль");
      }
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role } : u))
      );
      setSavingId(null);
    } catch (err) {
      console.error(err);
      setSavingId(null);
      setError(
        err instanceof Error ? err.message : "Не удалось изменить роль"
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Пользователи</h2>
        <Button variant="ghost" size="sm" onClick={applyFilters}>
          Обновить
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Роль</div>
          <Select
            value={role || ALL_ROLE}
            onValueChange={(v) => {
              setRole(v);
              setPage(1);
              void load(1, { role: v });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ROLE}>Все</SelectItem>
              <SelectItem value="CLIENT">CLIENT</SelectItem>
              <SelectItem value="PSYCHOLOGIST">PSYCHOLOGIST</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Поиск</div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => applyFilters()}
            placeholder="email или имя"
          />
        </div>

        <div className="md:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Записей</div>
          <Select
            value={String(take)}
            onValueChange={(v) => {
              const nextTake = Number(v);
              setTake(nextTake);
              setPage(1);
              void load(1, { take: nextTake });
            }}
          >
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
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Загружаем список...</div>
      ) : users.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Пользователи пока не зарегистрированы.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-full text-xs text-left">
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="align-middle">Email</TableHead>
                <TableHead className="align-middle">Имя</TableHead>
                <TableHead className="align-middle">Роль</TableHead>
                <TableHead className="align-middle">Создан</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                      value={user.role}
                      disabled={savingId === user.id}
                      onChange={e => changeRole(user.id, e.target.value as Role)}
                    >
                      <option value="CLIENT">Клиент</option>
                      <option value="PSYCHOLOGIST">Специалист</option>
                      <option value="ADMIN">Админ</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short"
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && totalCount > 0 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-muted-foreground">
            Страница{" "}
            <span className="font-medium text-foreground">{page}</span> из{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Назад
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Далее
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

