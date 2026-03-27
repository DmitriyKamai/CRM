"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export function ClientsListControls(props: {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  isSearchTooShort: boolean;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
}) {
  const { searchInput, onSearchInputChange, isSearchTooShort, pageSize, onPageSizeChange } = props;

  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="space-y-1">
        <Input
          placeholder="Поиск по имени, email или телефону..."
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          className="h-8 w-full max-w-sm"
        />
        {isSearchTooShort && (
          <p className="text-xs text-muted-foreground">Введите минимум 2 символа для поиска</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Строк на странице:</span>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-8 w-[92px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="30">30</SelectItem>
            <SelectItem value="40">40</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
