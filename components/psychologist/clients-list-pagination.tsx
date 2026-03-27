"use client";

import { Button } from "@/components/ui/button";
import type { ClientsPaginationMeta } from "@/hooks/use-clients-data";

export function ClientsListPagination(props: {
  pagination: ClientsPaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const { pagination, onPageChange } = props;

  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        Страница {pagination.page} из {pagination.totalPages} · Всего клиентов: {pagination.total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Вперёд
        </Button>
      </div>
    </div>
  );
}
