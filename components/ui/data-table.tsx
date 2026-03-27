"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { Settings2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { DataTableColumnOrderDialog } from "@/components/ui/data-table-column-order-dialog";
import { getColumnIdsFromDefs, normalizeColumnOrder } from "@/lib/table-column-order";

/** Стабильная ссылка: значение по умолчанию в параметрах создавало новый массив каждый рендер → infinite loop (React #185). */
const DEFAULT_COLUMN_ORDER_FIXED_IDS: readonly string[] = ["select", "search"];

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Один клик/тап — удобно на мобильных */
  onRowClick?: (row: TData) => void;
  /** Двойной клик — только десктоп */
  onRowDoubleClick?: (row: TData) => void;
  filterColumnId?: string;
  filterPlaceholder?: string;
  /** Карта id колонки → читаемый заголовок для Dropdown */
  columnLabels?: Record<string, string>;
  /** Начальная видимость колонок (по умолчанию все видимы) */
  initialColumnVisibility?: VisibilityState;
  /** Ключ для сохранения видимости колонок в localStorage */
  visibilityStorageKey?: string;
  /** Минимальная ширина таблицы для горизонтального скролла */
  minTableWidthClassName?: string;
  /**
   * Порядок колонок с сервера: undefined — ещё не загружено, null — в БД нет сохранения.
   */
  initialColumnOrder?: string[] | null;
  /** Сохранить порядок колонок (например в БД). Без колбэка настройка порядка скрыта. */
  onColumnOrderPersist?: (order: string[]) => void | Promise<void>;
  /** Id колонок, которые всегда слева и не участвуют в диалоге переупорядочивания */
  columnOrderFixedIds?: string[];
  /** Внешние контролы тулбара (например поиск/пагинация) */
  topControls?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  onRowDoubleClick,
  filterColumnId,
  filterPlaceholder,
  columnLabels,
  initialColumnVisibility,
  visibilityStorageKey,
  minTableWidthClassName,
  initialColumnOrder,
  onColumnOrderPersist,
  columnOrderFixedIds: columnOrderFixedIdsProp,
  topControls
}: DataTableProps<TData, TValue>) {
  const reorderEnabled = Boolean(onColumnOrderPersist);

  const columnOrderFixedIds = React.useMemo(() => {
    return columnOrderFixedIdsProp ?? DEFAULT_COLUMN_ORDER_FIXED_IDS;
  }, [columnOrderFixedIdsProp]);

  const columnIds = React.useMemo(() => getColumnIdsFromDefs(columns), [columns]);
  const columnIdsKey = React.useMemo(() => columnIds.join("\0"), [columnIds]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility ?? {});
  const visibilityReadyRef = React.useRef(false);

  const [columnOrder, setColumnOrder] = React.useState<string[]>(() =>
    reorderEnabled
      ? normalizeColumnOrder(null, getColumnIdsFromDefs(columns), [
          ...DEFAULT_COLUMN_ORDER_FIXED_IDS
        ])
      : []
  );
  const [orderDialogOpen, setOrderDialogOpen] = React.useState(false);
  const initialColumnOrderAppliedRef = React.useRef(false);
  const prevColumnIdsKeyForOrderRef = React.useRef<string | null>(null);

  const persistTimerRef = React.useRef<number | undefined>(undefined);

  const schedulePersist = React.useCallback(
    (order: string[]) => {
      if (!onColumnOrderPersist) return;
      if (persistTimerRef.current !== undefined) {
        window.clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = window.setTimeout(() => {
        void Promise.resolve(onColumnOrderPersist(order));
      }, 400);
    },
    [onColumnOrderPersist]
  );

  /** Один раз подставляем порядок с сервера (или дефолт), когда initialColumnOrder перестал быть undefined. */
  React.useEffect(() => {
    if (!reorderEnabled) return;
    if (initialColumnOrder === undefined) return;
    if (initialColumnOrderAppliedRef.current) return;
    initialColumnOrderAppliedRef.current = true;
    setColumnOrder(
      normalizeColumnOrder(initialColumnOrder, columnIds, columnOrderFixedIds)
    );
  }, [reorderEnabled, initialColumnOrder, columnIds, columnOrderFixedIds]);

  /** Только при изменении набора id колонок (новые кастомные поля и т.д.), без лишних setState каждый рендер. */
  React.useEffect(() => {
    if (!reorderEnabled) return;
    if (!initialColumnOrderAppliedRef.current) return;
    if (prevColumnIdsKeyForOrderRef.current === columnIdsKey) return;
    const previousKey = prevColumnIdsKeyForOrderRef.current;
    prevColumnIdsKeyForOrderRef.current = columnIdsKey;
    if (previousKey === null) return;
    setColumnOrder(prev =>
      normalizeColumnOrder(prev, columnIds, columnOrderFixedIds)
    );
  }, [reorderEnabled, columnIdsKey, columnIds, columnOrderFixedIds]);

  React.useEffect(() => {
    if (!initialColumnVisibility) return;
    setColumnVisibility(prev => {
      const next: VisibilityState = { ...prev };
      for (const [key, value] of Object.entries(initialColumnVisibility)) {
        if (next[key] === undefined) {
          next[key] = value;
        }
      }
      return next;
    });
  }, [initialColumnVisibility]);

  React.useEffect(() => {
    if (!visibilityStorageKey || visibilityReadyRef.current) return;
    try {
      const raw = window.localStorage.getItem(visibilityStorageKey);
      if (!raw) {
        visibilityReadyRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw) as VisibilityState;
      if (parsed && typeof parsed === "object") {
        setColumnVisibility(prev => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.error("Failed to restore column visibility", err);
    } finally {
      visibilityReadyRef.current = true;
    }
  }, [visibilityStorageKey]);

  React.useEffect(() => {
    if (!visibilityStorageKey || !visibilityReadyRef.current) return;
    try {
      window.localStorage.setItem(
        visibilityStorageKey,
        JSON.stringify(columnVisibility)
      );
    } catch (err) {
      console.error("Failed to persist column visibility", err);
    }
  }, [columnVisibility, visibilityStorageKey]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      ...(reorderEnabled ? { columnOrder } : {})
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    ...(reorderEnabled ? { onColumnOrderChange: setColumnOrder } : {}),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  const filterColumn = filterColumnId ? table.getColumn(filterColumnId) : undefined;

  const hideableColumns = table
    .getAllColumns()
    .filter(col => typeof col.accessorFn !== "undefined" && col.getCanHide());

  const fixedOrderSet = React.useMemo(
    () => new Set(columnOrderFixedIds),
    [columnOrderFixedIds]
  );

  const reorderableColumnIds = React.useMemo(
    () => columnOrder.filter(id => !fixedOrderSet.has(id)),
    [columnOrder, fixedOrderSet]
  );

  const handleApplyColumnOrder = React.useCallback(
    (reordered: string[]) => {
      const prefix = columnOrderFixedIds.filter(id => columnIds.includes(id));
      const full = [...prefix, ...reordered];
      setColumnOrder(full);
      schedulePersist(full);
    },
    [columnIds, columnOrderFixedIds, schedulePersist]
  );

  const showSettingsMenu = hideableColumns.length > 0 || reorderEnabled;

  return (
    <div className="space-y-3">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-2 sm:items-center">
        {filterColumn && (
          <Input
            placeholder={filterPlaceholder ?? "Поиск..."}
            value={(filterColumn.getFilterValue() as string) ?? ""}
            onChange={e => filterColumn.setFilterValue(e.target.value)}
            className="h-8 min-w-0 flex-1 max-w-sm"
          />
        )}
        {topControls}
        {showSettingsMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="order-3 h-8 w-8 shrink-0 self-start p-0 sm:self-auto"
                aria-label="Настройка таблицы"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {hideableColumns.length > 0 && (
                <>
                  <DropdownMenuLabel>Показать колонки</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hideableColumns.map(col => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={col.getIsVisible()}
                      onCheckedChange={value => col.toggleVisibility(!!value)}
                    >
                      {columnLabels?.[col.id] ?? col.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}
              {reorderEnabled && hideableColumns.length > 0 && <DropdownMenuSeparator />}
              {reorderEnabled && (
                <DropdownMenuItem
                  onSelect={e => {
                    e.preventDefault();
                    setOrderDialogOpen(true);
                  }}
                >
                  Порядок колонок…
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {reorderEnabled && (
        <DataTableColumnOrderDialog
          open={orderDialogOpen}
          onOpenChange={setOrderDialogOpen}
          itemIds={reorderableColumnIds}
          labels={columnLabels ?? {}}
          onApply={handleApplyColumnOrder}
        />
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table className={minTableWidthClassName ?? "min-w-[600px]"}>
          <TableHeader className="bg-muted/10">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className="whitespace-nowrap align-middle"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={
                    (onRowClick || onRowDoubleClick ? "cursor-pointer " : "") +
                    "hover:bg-muted/40 transition-colors"
                  }
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                  onDoubleClick={
                    onRowDoubleClick ? () => onRowDoubleClick(row.original) : undefined
                  }
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="whitespace-nowrap align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
                  className="h-24 text-center text-muted-foreground"
                >
                  Нет данных.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground">
        {table.getFilteredRowModel().rows.length} из {data.length}{" "}
        {data.length === 1 ? "запись" : "записей"}
      </div>
    </div>
  );
}
