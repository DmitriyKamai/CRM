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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

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
  minTableWidthClassName
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility ?? {});
  const visibilityReadyRef = React.useRef(false);

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
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  const filterColumn = filterColumnId ? table.getColumn(filterColumnId) : undefined;

  const hideableColumns = table
    .getAllColumns()
    .filter(col => typeof col.accessorFn !== "undefined" && col.getCanHide());

  return (
    <div className="space-y-3">
      {/* Toolbar: поиск слева, колонки — у правого края строки */}
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
        {filterColumn && (
          <Input
            placeholder={filterPlaceholder ?? "Поиск..."}
            value={(filterColumn.getFilterValue() as string) ?? ""}
            onChange={e => filterColumn.setFilterValue(e.target.value)}
            className="h-8 min-w-0 flex-1 max-w-sm"
          />
        )}
        {hideableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="ml-auto h-8 w-8 shrink-0 p-0"
                aria-label="Настройка колонок"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
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
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table: горизонтальный скролл на узких экранах */}
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
                    <TableCell key={cell.id} className="whitespace-nowrap align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Нет данных.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Row count */}
      <div className="text-xs text-muted-foreground">
        {table.getFilteredRowModel().rows.length} из {data.length}{" "}
        {data.length === 1 ? "запись" : "записей"}
      </div>
    </div>
  );
}
