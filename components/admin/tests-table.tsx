"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface TestRow {
  id: string;
  type: string;
  title: string;
  isActive: boolean;
  createdAt: string;
}

export function TestsTable() {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [take, setTake] = useState<number>(25);

  // Быстрые фильтры
  const ALL_STATUS = "ALL";
  const [isActiveFilter, setIsActiveFilter] = useState<string>(ALL_STATUS); // 'ALL', 'true', 'false'
  const [search, setSearch] = useState<string>("");

  const totalPages = Math.max(1, Math.ceil(totalCount / take));

  function buildQueryString(
    pageValue: number,
    overrides?: { isActiveFilter?: string; search?: string; take?: number }
  ) {
    const nextIsActiveFilter = overrides?.isActiveFilter ?? isActiveFilter;
    const nextSearch = overrides?.search ?? search;
    const nextTake = overrides?.take ?? take;
    const sp = new URLSearchParams();
    if (nextIsActiveFilter && nextIsActiveFilter !== ALL_STATUS)
      sp.set("isActive", nextIsActiveFilter);
    if (nextSearch.trim()) sp.set("search", nextSearch.trim());
    sp.set("take", String(nextTake));
    sp.set("page", String(pageValue));
    return sp.toString();
  }

  async function load(
    pageValue: number,
    overrides?: { isActiveFilter?: string; search?: string; take?: number }
  ) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/tests?${buildQueryString(pageValue, overrides)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Не удалось загрузить тесты");
      }
      const data = (await res.json()) as { rows: TestRow[]; totalCount: number };
      setTests(data.rows);
      setTotalCount(data.totalCount ?? 0);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить тесты"
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

  async function toggleActive(testId: string, isActive: boolean) {
    setSavingId(testId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tests/${testId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isActive })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось обновить статус теста");
      }
      setTests(prev =>
        prev.map(t => (t.id === testId ? { ...t, isActive } : t))
      );
      setSavingId(null);
    } catch (err) {
      console.error(err);
      setSavingId(null);
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось обновить статус теста"
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Диагностические тесты</h2>
        <Button variant="ghost" size="sm" onClick={applyFilters}>
          Обновить
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Статус</div>
          <Select
            value={isActiveFilter}
            onValueChange={(v) => {
              setIsActiveFilter(v);
              setPage(1);
              void load(1, { isActiveFilter: v });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUS}>Все</SelectItem>
              <SelectItem value="true">Активны</SelectItem>
              <SelectItem value="false">Отключены</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Поиск</div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => applyFilters()}
            placeholder="по названию"
          />
        </div>
        <div className="md:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Take</div>
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
        <div className="text-sm text-muted-foreground">Загружаем тесты...</div>
      ) : tests.length === 0 ? (
        <div className="text-sm text-muted-foreground">Тесты ещё не добавлены.</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-full text-xs text-left">
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="align-middle">Тест</TableHead>
                <TableHead className="align-middle">Тип</TableHead>
                <TableHead className="align-middle">Создан</TableHead>
                <TableHead className="align-middle">Статус</TableHead>
                <TableHead className="align-middle">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map(test => (
                <TableRow key={test.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{test.title}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{test.type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(test.createdAt).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short"
                    })}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-sm ${
                        test.isActive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {test.isActive ? "активен" : "отключён"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingId === test.id}
                      onClick={() => toggleActive(test.id, !test.isActive)}
                    >
                      {savingId === test.id
                        ? "Сохраняем..."
                        : test.isActive
                          ? "Отключить"
                          : "Включить"}
                    </Button>
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

