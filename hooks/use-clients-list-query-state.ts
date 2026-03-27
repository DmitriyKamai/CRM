"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const SEARCH_DEBOUNCE_MS = 350;
const DEFAULT_PAGE_SIZE = 20;

export function useClientsListQueryState() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const isSearchTooShort = useMemo(() => {
    const trimmed = searchInput.trim();
    return trimmed.length > 0 && trimmed.length < 2;
  }, [searchInput]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = searchInput.trim();
      setSearchQuery(next.length >= 2 ? next : "");
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const onStatusFilterChange = useCallback((next: string) => {
    setStatusFilter(next);
    setPage(1);
  }, []);

  const onPageSizeChange = useCallback((next: number) => {
    setPageSize(next);
    setPage(1);
  }, []);

  return {
    statusFilter,
    page,
    pageSize,
    searchInput,
    searchQuery,
    isSearchTooShort,
    setPage,
    setSearchInput,
    onStatusFilterChange,
    onPageSizeChange
  };
}
