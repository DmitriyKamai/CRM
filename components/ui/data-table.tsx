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
  onRowDoubleClick?: (row: TData) => void;
  filterColumnId?: string;
  filterPlaceholder?: string;
  /** Карта id колонки → читаемый заголовок для Dropdown */
  columnLabels?: Record<string, string>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowDoubleClick,
  filterColumnId,
  filterPlaceholder,
  columnLabels
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

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
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {filterColumn && (
          <Input
            placeholder={filterPlaceholder ?? "Поиск..."}
            value={(filterColumn.getFilterValue() as string) ?? ""}
            onChange={e => filterColumn.setFilterValue(e.target.value)}
            className="h-8 max-w-sm"
          />
        )}
        {hideableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="ml-auto h-8 w-8 p-0"
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

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="bg-muted/10">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
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
                    (onRowDoubleClick ? "cursor-pointer " : "") +
                    "hover:bg-muted/40 transition-colors"
                  }
                  onDoubleClick={
                    onRowDoubleClick ? () => onRowDoubleClick(row.original) : undefined
                  }
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
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
