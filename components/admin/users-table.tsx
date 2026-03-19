"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

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

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Не удалось загрузить пользователей");
      }
      const data = (await res.json()) as UserRow[];
      setUsers(data);
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
    load();
  }, []);

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
        <Button variant="ghost" size="sm" onClick={load}>
          Обновить
        </Button>
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left text-foreground">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Имя</th>
                <th className="px-2 py-2">Роль</th>
                <th className="px-2 py-2">Создан</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr
                  key={user.id}
                  className="border-b border-border hover:bg-muted/40"
                >
                  <td className="px-2 py-2">{user.email}</td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {user.name ?? "—"}
                  </td>
                  <td className="px-2 py-2">
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
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short"
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

