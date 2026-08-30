"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import {
  Deposit,
  DepositFilters,
  DepositStatusCounts,
  DepositSummary,
  getDepositId,
  normalizeDepositStatus,
  normalizePaymentName,
  PAGE_SIZE,
  toNumber,
} from "../types";
import { DepositService } from "../services/depositService";

interface UseDepositDataProps {
  initialBalance?: number | string | null;
  initialCoinBalance?: number | string | null;
  initialDeposits?: Deposit[];
  filters: DepositFilters;
  debouncedSearch: string;
}

export function useDepositData({
  initialBalance = 0,
  initialCoinBalance = 0,
  initialDeposits = [],
  filters,
  debouncedSearch,
}: UseDepositDataProps) {
  // Local state override for background / manual revalidations
  const [localDeposits, setLocalDeposits] = useState<Deposit[] | null>(null);
  const [localBalance, setLocalBalance] = useState<number | null>(null);
  const [localCoinBalance, setLocalCoinBalance] = useState<number | null>(null);

  // Instant-first initial render: bind to initial server props directly
  const deposits = useMemo(() => {
    return localDeposits ?? (Array.isArray(initialDeposits) ? initialDeposits : []);
  }, [localDeposits, initialDeposits]);

  const balance = localBalance ?? toNumber(initialBalance);
  const coinBalance = localCoinBalance ?? toNumber(initialCoinBalance);

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstMountRef = useRef(true);

  // Revalidate data via SWR silent background fetch
  const revalidate = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      }
      setError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          window.location.href = "/login";
          return;
        }

        const result = await DepositService.fetchDashboardData(
          session.access_token,
        );

        if (result.data) {
          setLocalBalance(toNumber(result.data.profile?.balance));
          setLocalCoinBalance(
            toNumber(
              result.data.profile?.coin_balance ??
                result.data.profile?.coinBalance,
            ),
          );
          setLocalDeposits(
            Array.isArray(result.data.deposits) ? result.data.deposits : [],
          );
        }
      } catch (err) {
        console.error("useDepositData revalidate error:", err);
        if (isManual) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal menyegarkan data deposit.",
          );
        }
      } finally {
        setRefreshing(false);
      }
    },
    [],
  );

  // Background silent revalidation on mount
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      void revalidate(false);
    }
  }, [revalidate]);

  // Extract unique payment method options
  const paymentOptions = useMemo(() => {
    return Array.from(
      new Set(
        deposits
          .map((deposit) => normalizePaymentName(deposit.payment_method))
          .filter((value) => value !== "-" && Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b, "id"));
  }, [deposits]);

  // Compute authoritative summary
  const summary: DepositSummary = useMemo(() => {
    let successfulAmount = 0;
    let pendingAmount = 0;
    let successfulCount = 0;
    let pendingCount = 0;
    let totalAmount = 0;

    for (const deposit of deposits) {
      const amount = toNumber(deposit.amount);
      const status = normalizeDepositStatus(deposit.status);

      totalAmount += amount;

      if (status === "Berhasil") {
        successfulAmount += amount;
        successfulCount += 1;
      } else if (status === "Pending") {
        pendingAmount += amount;
        pendingCount += 1;
      }
    }

    return {
      balance,
      coinBalance,
      successfulAmount,
      successfulCount,
      pendingAmount,
      pendingCount,
      totalAmount,
      totalCount: deposits.length,
    };
  }, [deposits, balance, coinBalance]);

  // Filter and sort deposits
  const filteredDeposits = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();

    return deposits
      .filter((deposit) => {
        const status = normalizeDepositStatus(deposit.status);
        const payment = normalizePaymentName(deposit.payment_method);
        const depositId = getDepositId(deposit);

        const searchable = [
          depositId,
          deposit.payment_method,
          payment,
          deposit.amount,
          deposit.total_amount,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !keyword || searchable.includes(keyword);

        const matchesStatus =
          filters.status === "Semua" || status === filters.status;

        const matchesPayment =
          filters.paymentMethod === "Semua" ||
          payment === filters.paymentMethod;

        const matchesDate =
          !filters.date ||
          (deposit.created_at &&
            deposit.created_at.slice(0, 10) === filters.date);

        return matchesSearch && matchesStatus && matchesPayment && matchesDate;
      })
      .sort((a, b) => {
        if (filters.sort === "oldest") {
          return (
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime()
          );
        }
        if (filters.sort === "highest") {
          return toNumber(b.amount) - toNumber(a.amount);
        }
        if (filters.sort === "lowest") {
          return toNumber(a.amount) - toNumber(b.amount);
        }
        // Default "newest"
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });
  }, [deposits, debouncedSearch, filters.status, filters.paymentMethod, filters.date, filters.sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDeposits.length / (filters.limit || PAGE_SIZE)),
  );

  const visibleDeposits = useMemo(() => {
    const limit = filters.limit || PAGE_SIZE;
    const start = (filters.page - 1) * limit;
    return filteredDeposits.slice(start, start + limit);
  }, [filteredDeposits, filters.page, filters.limit]);

  // Compute individual status counts
  const statusCounts: DepositStatusCounts = useMemo(() => {
    let semua = 0;
    let pending = 0;
    let berhasil = 0;
    let gagal = 0;
    let dibatalkan = 0;

    for (const deposit of deposits) {
      semua += 1;
      const status = normalizeDepositStatus(deposit.status);
      if (status === "Pending") pending += 1;
      else if (status === "Berhasil") berhasil += 1;
      else if (status === "Gagal") gagal += 1;
      else if (status === "Dibatalkan") dibatalkan += 1;
    }

    return {
      semua,
      pending,
      berhasil,
      gagal,
      dibatalkan,
    };
  }, [deposits]);

  return {
    deposits,
    filteredDeposits,
    visibleDeposits,
    totalPages,
    totalItems: filteredDeposits.length,
    paymentOptions,
    summary,
    statusCounts,
    balance,
    coinBalance,
    refreshing,
    error,
    revalidate,
  };
}

