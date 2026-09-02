"use client";

import { useCallback, useMemo, useState } from "react";
import { AffiliateFilters, MemberSortOption, PAGE_SIZE, Referral } from "../types";

export function useAffiliateFilters(referrals: Referral[]) {
  const [filters, setFilters] = useState<AffiliateFilters>({
    search: "",
    date: "",
    sortBy: "all",
    page: 1,
  });

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setDate = useCallback((date: string) => {
    setFilters((prev) => ({ ...prev, date, page: 1 }));
  }, []);

  const setSortBy = useCallback((sortBy: MemberSortOption) => {
    setFilters((prev) => ({ ...prev, sortBy, page: 1 }));
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
      date: "",
      sortBy: "all",
      page: 1,
    });
  }, []);

  // Derived filtered referrals
  const filteredReferrals = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();

    const filtered = referrals.filter((referral) => {
      const searchable = [referral.full_name, referral.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchable.includes(keyword);
      const matchesDate =
        !filters.date ||
        (referral.created_at && referral.created_at.slice(0, 10) === filters.date);

      return matchesSearch && matchesDate;
    });

    if (filters.sortBy === "newest") {
      return [...filtered].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    }

    if (filters.sortBy === "oldest") {
      return [...filtered].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });
    }

    if (filters.sortBy === "name_asc") {
      return [...filtered].sort((a, b) => {
        const nameA = (a.full_name || a.email || "").toLowerCase();
        const nameB = (b.full_name || b.email || "").toLowerCase();
        return nameA.localeCompare(nameB, "id");
      });
    }

    if (filters.sortBy === "name_desc") {
      return [...filtered].sort((a, b) => {
        const nameA = (a.full_name || a.email || "").toLowerCase();
        const nameB = (b.full_name || b.email || "").toLowerCase();
        return nameB.localeCompare(nameA, "id");
      });
    }

    return filtered;
  }, [referrals, filters.search, filters.date, filters.sortBy]);

  const totalItems = filteredReferrals.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, filters.page), totalPages);

  // Sliced items for current page
  const visibleReferrals = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredReferrals.slice(start, start + PAGE_SIZE);
  }, [filteredReferrals, safePage]);

  const isFiltered =
    Boolean(filters.search.trim()) ||
    Boolean(filters.date) ||
    filters.sortBy !== "all";

  return {
    filters: {
      ...filters,
      page: safePage,
    },
    setSearch,
    setDate,
    setSortBy,
    setPage,
    resetFilters,
    filteredReferrals,
    visibleReferrals,
    totalItems,
    totalPages,
    isFiltered,
    pageSize: PAGE_SIZE,
  };
}

