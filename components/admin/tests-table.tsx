"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

interface TestsResponse {
  rows: TestRow[];
  totalCount: number;
}

const ALL_STATUS = "ALL";

async function fetchTests(params: {
  page: number;
  isActiveFilter: string;
  search: string;
  take: number;
}): Promise<TestsResponse> {
  const sp = new URLSearchParams();
  if (params.isActiveFilter && params.isActiveFilter !== ALL_STATUS)
    sp.set("isActive", params.isActiveFilter);
  if (params.search.trim()) sp.set("search", params.search.trim());
  sp.set("take", String(params.take));
  sp.set("page", String(params.page));
  const res = await fetch(`/api/admin/tests?${sp}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Не удалось загрузить тесты");
  return data as TestsResponse;
}

async function toggleTestApi(testId: string, isActive: boolean): Promise<void> {
  const res = await fetch(`/api/admin/tests/${testId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive })
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Не удалось обновить статус теста");
}

export function TestsTable() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [take, setTake] = useState(25);
  const [isActiveFilter, setIsActiveFilter] = useState(ALL_STATUS);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const queryKey = ["admin-tests", { page, isActiveFilter, search, take }] as const;

  const { data, isFetching, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchTests({ page, isActiveFilter, search, take }),
    placeholderData: prev => prev
  });

  const toggleMutation = useMutation({
    mutationFn: ({ testId, isActive }: { testId: string; isActive: boolean }) =>
      toggleTestApi(testId, isActive),
    onMutate: ({ testId }) => setSavingId(testId),
    onSuccess: (_, { testId, isActive }) => {
      queryClient.setQueryData(queryKey, (old: TestsResponse | undefined) =>
        old
          ? { ...old, rows: old.rows.map(t => (t.id === testId ? { ...t, isActive } : t)) }
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

  const displayError = isError ? (error as Error).message : mutationError;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Диагностические тесты</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-tests"] })}
        >
          Обновить
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Статус</div>
          <Select
            value={isActiveFilter}
            onValueChange={v => {
              setIsActiveFilter(v);
              setPage(1);
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
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onBlur={applySearch}
            onKeyDown={e => e.key === "Enter" && applySearch()}
            placeholder="по названию"
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
        <div className="text-sm text-muted-foreground">Загружаем тесты...</div>
      ) : (data?.rows ?? []).length === 0 ? (
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
              {(data?.rows ?? []).map(test => (
                <TableRow key={test.id} className={isFetching ? "opacity-60" : ""}>
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
                      onClick={() =>
                        toggleMutation.mutate({ testId: test.id, isActive: !test.isActive })
                      }
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
