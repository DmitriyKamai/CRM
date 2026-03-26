"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

interface UsersResponse {
  rows: UserRow[];
  totalCount: number;
}

const ALL_ROLE = "ALL";

async function fetchUsers(params: {
  page: number;
  role: string;
  search: string;
  take: number;
}): Promise<UsersResponse> {
  const sp = new URLSearchParams();
  if (params.role && params.role !== ALL_ROLE) sp.set("role", params.role);
  if (params.search.trim()) sp.set("search", params.search.trim());
  sp.set("take", String(params.take));
  sp.set("page", String(params.page));
  const res = await fetch(`/api/admin/users?${sp}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Не удалось загрузить пользователей");
  return data as UsersResponse;
}

async function changeRoleApi(userId: string, role: Role): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Не удалось изменить роль");
}

export function UsersTable() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [take, setTake] = useState(25);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const queryKey = ["admin-users", { page, role, search, take }] as const;

  const { data, isFetching, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchUsers({ page, role, search, take }),
    placeholderData: prev => prev
  });

  const rolesMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: Role }) =>
      changeRoleApi(userId, newRole),
    onMutate: ({ userId }) => setSavingId(userId),
    onSuccess: (_, { userId, newRole }) => {
      queryClient.setQueryData(queryKey, (old: UsersResponse | undefined) =>
        old
          ? { ...old, rows: old.rows.map(u => (u.id === userId ? { ...u, role: newRole } : u)) }
          : old
      );
      setSavingId(null);
      setMutationError(null);
    },
    onError: (e: Error) => {
      setSavingId(null);
      setMutationError(e.message);
    }
  });

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / take));

  function applySearch() {
    setSearch(searchInput);
    setPage(1);
  }

  const displayError = isError
    ? (error as Error).message
    : mutationError;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Пользователи</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
        >
          Обновить
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Роль</div>
          <Select
            value={role || ALL_ROLE}
            onValueChange={v => {
              setRole(v === ALL_ROLE ? "" : v);
              setPage(1);
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
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onBlur={applySearch}
            onKeyDown={e => e.key === "Enter" && applySearch()}
            placeholder="email или имя"
          />
        </div>

        <div className="md:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Записей</div>
          <Select
            value={String(take)}
            onValueChange={v => {
              setTake(Number(v));
              setPage(1);
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

      {displayError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {displayError}
        </div>
      )}

      {isFetching && !data ? (
        <div className="text-sm text-muted-foreground">Загружаем список...</div>
      ) : (data?.rows ?? []).length === 0 ? (
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
              {(data?.rows ?? []).map(user => (
                <TableRow key={user.id} className={isFetching ? "opacity-60" : ""}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                      value={user.role}
                      disabled={savingId === user.id}
                      onChange={e =>
                        rolesMutation.mutate({
                          userId: user.id,
                          newRole: e.target.value as Role
                        })
                      }
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

      {totalCount > 0 && (
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
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Назад
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Далее
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
