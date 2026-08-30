"use client";

import { useCallback, useEffect, useState } from "react";
import { DepositFilters, PAGE_SIZE } from "../types";

export function useDepositFilters(initialParams?: Partial<DepositFilters>) {
  const [filters, setFilters] = useState<DepositFilters>({
    search: initialParams?.search || "",
    status: initialParams?.status || "Semua",
    paymentMethod: initialParams?.paymentMethod || "Semua",
    date: initialParams?.date || "",
    page: initialParams?.page || 1,
    limit: initialParams?.limit || PAGE_SIZE,
    sort: initialParams?.sort || "newest",
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  // Debounce search input (~300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => clearTimeout(handler);
  }, [filters.search]);

  // Set individual filters with automatic page reset to 1
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setStatus = useCallback((status: string) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  const setPaymentMethod = useCallback((paymentMethod: string) => {
    setFilters((prev) => ({ ...prev, paymentMethod, page: 1 }));
  }, []);

  const setDate = useCallback((date: string) => {
    setFilters((prev) => ({ ...prev, date, page: 1 }));
  }, []);

  const setSort = useCallback((sort: DepositFilters["sort"]) => {
    setFilters((prev) => ({ ...prev, sort, page: 1 }));
  }, []);

  const setPage = useCallback((page: number | ((prev: number) => number)) => {
    setFilters((prev) => ({
      ...prev,
      page: typeof page === "function" ? page(prev.page) : page,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: "",
      status: "Semua",
      paymentMethod: "Semua",
      date: "",
      page: 1,
      limit: PAGE_SIZE,
      sort: "newest",
    });
  }, []);

  const isFiltered =
    Boolean(filters.search.trim()) ||
    filters.status !== "Semua" ||
    filters.paymentMethod !== "Semua" ||
    Boolean(filters.date);

  return {
    filters,
    debouncedSearch,
    setSearch,
    setStatus,
    setPaymentMethod,
    setDate,
    setSort,
    setPage,
    resetFilters,
    isFiltered,
  };
}

