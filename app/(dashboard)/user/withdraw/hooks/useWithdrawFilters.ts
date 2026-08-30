"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Withdrawal,
  PAGE_SIZE,
  WithdrawalFilters,
  normalizeWithdrawalStatus,
} from "../types";

export function useWithdrawFilters(withdrawals: Withdrawal[]) {
  const [filters, setFilters] = useState<WithdrawalFilters>({
    search: "",
    status: "Semua",
    date: "",
    page: 1,
  });

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setStatusFilter = useCallback((status: string) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  const setDateFilter = useCallback((date: string) => {
    setFilters((prev) => ({ ...prev, date, page: 1 }));
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
      date: "",
      page: 1,
    });
  }, []);

  // Derived filtered list
  const filteredWithdrawals = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();

    return withdrawals.filter((w) => {
      const status = normalizeWithdrawalStatus(w.status);

      // Search matching non-sensitive fields
      const searchable = [
        w.id,
        w.bank_name,
        w.account_name,
        w.amount,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchable.includes(keyword);
      const matchesStatus =
        filters.status === "Semua" || status === filters.status;
      const matchesDate =
        !filters.date ||
        (w.created_at && w.created_at.slice(0, 10) === filters.date);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [withdrawals, filters.search, filters.status, filters.date]);

  const totalItems = filteredWithdrawals.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, filters.page), totalPages);

  // Sliced items for current page
  const visibleWithdrawals = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredWithdrawals.slice(start, start + PAGE_SIZE);
  }, [filteredWithdrawals, safePage]);

  const isFiltered =
    Boolean(filters.search.trim()) ||
    filters.status !== "Semua" ||
    Boolean(filters.date);

  return {
    filters: {
      ...filters,
      page: safePage,
    },
    setSearch,
    setStatusFilter,
    setDateFilter,
    setPage,
    resetFilters,
    filteredWithdrawals,
    visibleWithdrawals,
    totalItems,
    totalPages,
    isFiltered,
    pageSize: PAGE_SIZE,
  };
}

