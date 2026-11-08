"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useI18n } from "@/lib/i18n/context";
import {
  Withdrawal,
  WithdrawalStatusCounts,
  WithdrawalSummary,
  normalizeWithdrawalStatus,
  toNumber,
} from "../types";
import { withdrawService } from "../services/withdrawService";

interface UseWithdrawDataProps {
  initialBalance?: number;
  initialCoinBalance?: number;
  initialWithdrawals?: Withdrawal[];
}

export function useWithdrawData({
  initialBalance = 0,
  initialCoinBalance = 0,
  initialWithdrawals = [],
}: UseWithdrawDataProps = {}) {
  const { t } = useI18n();
  // 1. INSTANT INITIAL RENDER: Seed immediately from server-passed props
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(initialWithdrawals);
  const [balance, setBalance] = useState<number>(initialBalance);
  const [coinBalance, setCoinBalance] = useState<number>(initialCoinBalance);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize when initial props change
  useEffect(() => {
    if (initialWithdrawals) {
      setWithdrawals(initialWithdrawals);
    }
  }, [initialWithdrawals]);

  useEffect(() => {
    if (initialBalance !== undefined) {
      setBalance(initialBalance);
    }
  }, [initialBalance]);

  useEffect(() => {
    if (initialCoinBalance !== undefined) {
      setCoinBalance(initialCoinBalance);
    }
  }, [initialCoinBalance]);

  // 2. REFRESH / REVALIDATION (preserved for manual refresh / mutation)
  const refetch = useCallback(async (silent = false) => {
    if (!silent) {
      setRefreshing(true);
    }
    setError(null);

    try {
      const data = await withdrawService.fetchWithdrawData();
      setBalance(data.balance);
      setCoinBalance(data.coinBalance);
      setWithdrawals(data.withdrawals);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        const isEn = typeof window !== "undefined" && window.location.pathname.startsWith("/en");
        window.location.href = isEn ? "/en/login" : "/login";
        return;
      }
      console.error("useWithdrawData refetch error:", err);
      setError(err instanceof Error ? err.message : t("dashboard.withdraw.errLoadData"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // Supabase Realtime: dengarkan perubahan penarikan dana & saldo secara langsung
  useEffect(() => {
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id || !isMounted) return;

      const userEmail = session.user.email || "";
      const channelName = `user-withdrawals-realtime-${session.user.id}`;

      const channelBuilder = supabase.channel(channelName);

      if (userEmail) {
        channelBuilder
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "withdrawals",
              filter: `user_email=eq.${userEmail}`,
            },
            () => {
              void refetch(true);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `email=eq.${userEmail}`,
            },
            () => {
              void refetch(true);
            }
          );
      } else {
        channelBuilder
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "withdrawals",
              filter: `user_id=eq.${session.user.id}`,
            },
            () => {
              void refetch(true);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${session.user.id}`,
            },
            () => {
              void refetch(true);
            }
          );
      }

      activeChannel = channelBuilder.subscribe();
    };

    void setupRealtime();

    return () => {
      isMounted = false;
      if (activeChannel) {
        void supabase.removeChannel(activeChannel);
      }
    };
  }, [refetch]);

  // 3. STATUS COUNTS PER CATEGORY
  const statusCounts = useMemo<WithdrawalStatusCounts>(() => {
    const counts: WithdrawalStatusCounts = {
      semua: withdrawals.length,
      pending: 0,
      berhasil: 0,
      gagal: 0,
      dibatalkan: 0,
    };

    for (const w of withdrawals) {
      const status = normalizeWithdrawalStatus(w.status);
      if (status === "Pending") counts.pending++;
      else if (status === "Berhasil") counts.berhasil++;
      else if (status === "Gagal") counts.gagal++;
      else if (status === "Dibatalkan") counts.dibatalkan++;
    }

    return counts;
  }, [withdrawals]);

  // 4. FINANCIAL SUMMARY
  const summary = useMemo<WithdrawalSummary>(() => {
    let successfulAmount = 0;
    let pendingAmount = 0;
    let pendingHeldAmount = 0;
    let successfulCount = 0;
    let pendingCount = 0;

    for (const w of withdrawals) {
      const amount = toNumber(w.amount);
      const fee = toNumber(w.admin_fee);
      const heldAmount =
        w.held_amount !== null && w.held_amount !== undefined
          ? toNumber(w.held_amount)
          : amount + fee;

      const status = normalizeWithdrawalStatus(w.status);

      if (status === "Berhasil") {
        successfulAmount += amount;
        successfulCount += 1;
      } else if (status === "Pending") {
        pendingAmount += amount;
        pendingHeldAmount += heldAmount;
        pendingCount += 1;
      }
    }

    return {
      balance,
      coinBalance,
      successfulAmount,
      successfulCount,
      pendingAmount,
      pendingHeldAmount,
      pendingCount,
    };
  }, [withdrawals, balance, coinBalance]);

  return {
    withdrawals,
    balance,
    coinBalance,
    summary,
    statusCounts,
    loading,
    refreshing,
    error,
    refetch,
    setWithdrawals,
    setBalance,
  };
}

