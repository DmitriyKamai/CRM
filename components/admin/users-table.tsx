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
        <h2 className="text-sm font-semibold text-slate-50">Пользователи</h2>
        <Button variant="ghost" size="sm" onClick={load}>
          Обновить
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/60 bg-red-950/40 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-300">Загружаем список...</div>
      ) : users.length === 0 ? (
        <div className="text-sm text-slate-300">
          Пользователи пока не зарегистрированы.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left text-slate-200">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
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
                  className="border-b border-slate-900 hover:bg-slate-900/50"
                >
                  <td className="px-2 py-2">{user.email}</td>
                  <td className="px-2 py-2 text-slate-300">
                    {user.name ?? "—"}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      value={user.role}
                      disabled={savingId === user.id}
                      onChange={e => changeRole(user.id, e.target.value as Role)}
                    >
                      <option value="CLIENT">Клиент</option>
                      <option value="PSYCHOLOGIST">Специалист</option>
                      <option value="ADMIN">Админ</option>
                    </select>
                  </td>
                  <td className="px-2 py-2 text-slate-400">
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

