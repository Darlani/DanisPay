"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Gauge,
  Package,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import AdminSkeleton from "../../shared/AdminSkeleton";
import AdminBadge from "../../shared/AdminBadge";
import { supabase } from "@/utils/supabaseClient";

type SystemHealthData = {
  success: boolean;
  checked_at?: string;
  active_provider?: string;
  statuses?: {
    database?: { status: "online" | "error"; label: string; detail: string };
    qris_generator?: { status: "online" | "warning" | "error"; label: string; detail: string };
    dana_dynamic?: { status: "online" | "error"; label: string; detail: string };
    dana_static?: { status: "online" | "error"; label: string; detail: string };
    gopay_static?: { status: "online" | "error"; label: string; detail: string };
    auto_save?: { status: "online" | "error"; label: string; detail: string };
  };
};

export type Order = {
  id: string;
  order_id?: string | null;
  product_name?: string | null;
  item_label?: string | null;
  email?: string | null;
  user_contact?: string | null;
  payment_method?: string | null;
  status?: string | null;
  created_at?: string | null;
  price?: number | string | null;
  buy_price?: number | string | null;
  cashback?: number | string | null;
  referral_commission?: number | string | null;
  voucher_amount?: number | string | null;
  voucher?: number | string | null;
  used_balance?: number | string | null;
  total_amount?: number | string | null;
};

export interface OverviewViewProps {
  orders: Order[];
  kpiOrders?: Pick<Order, "created_at" | "status" | "price">[] | null;
  recentOrders?: Order[];
  weeklyOrders?: Pick<Order, "created_at" | "status" | "price">[] | null;
  loading: boolean;
  dashboardError: string | null;
  pendingDepositCount: number;
  pendingWithdrawCount: number;
  hasLoadedOnce: boolean;
  onRefresh: () => void | Promise<void>;
  onSelectOrder: (order: Order) => void;
  onOpenFinanceModal: (
    mode: "deposit" | "withdraw",
    pendingOnly?: boolean,
  ) => void;
  onOpenAttentionOrders: (mode: "pending" | "onProcess") => void;
}

const FINANCIALLY_FINAL_SUCCESS_STATUSES = new Set(["Berhasil"]);

const isSuccessfulOrder = (status: unknown) =>
  typeof status === "string" && FINANCIALLY_FINAL_SUCCESS_STATUSES.has(status);

const formatRupiah = (value: unknown) =>
  `Rp ${(Number(value) || 0).toLocaleString("id-ID")}`;

const formatOrderTime = (value: unknown) => {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID");
};

const orderStatusClasses = (status: string | null | undefined) =>
  isSuccessfulOrder(status)
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : status === "Gagal"
      ? "border-rose-100 bg-rose-50 text-rose-700"
      : status === "Diproses"
        ? "border-blue-100 bg-blue-50 text-blue-700"
        : "border-amber-100 bg-amber-50 text-amber-700";

const orderStatusDotClasses = (status: string | null | undefined) =>
  isSuccessfulOrder(status)
    ? "bg-emerald-500"
    : status === "Gagal"
      ? "bg-rose-500"
      : status === "Diproses"
        ? "bg-blue-500"
        : "bg-amber-500";

export default function OverviewView({
  orders,
  kpiOrders: boundedKpiOrders,
  recentOrders: boundedRecentOrders,
  weeklyOrders: boundedWeeklyOrders,
  loading,
  dashboardError,
  pendingDepositCount,
  pendingWithdrawCount,
  hasLoadedOnce,
  onRefresh,
  onSelectOrder,
  onOpenFinanceModal,
  onOpenAttentionOrders,
}: OverviewViewProps) {
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(options.headers || {});
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
    return fetch(url, { ...options, headers });
  };
  const [dateFilter, setDateFilter] = useState("all");

  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [digiBalance, setDigiBalance] = useState<number | null>(null);
  const [digiBalanceLoading, setDigiBalanceLoading] = useState(true);
  const [digiLiveRefreshing, setDigiLiveRefreshing] = useState(false);
  const [digiRefreshError, setDigiRefreshError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSystemHealth = async () => {
      try {
        const res = await fetchWithAuth("/api/admin/system-health");
        if (!res.ok) throw new Error("Gagal memuat status sistem.");
        const data = await res.json();
        if (isMounted) {
          if (data.success) {
            setSystemHealth(data);
          } else {
            setHealthError(data.error || "Gagal memuat status sistem.");
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setHealthError(
            err instanceof Error ? err.message : "Gagal memuat status sistem.",
          );
        }
      } finally {
        if (isMounted) setHealthLoading(false);
      }
    };

    const loadCachedDigiBalance = async () => {
      try {
        const { data, error } = await supabase
          .from("store_settings")
          .select("balance_digiflazz")
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (isMounted && data && typeof data.balance_digiflazz === "number") {
          setDigiBalance(data.balance_digiflazz);
        }
      } catch (err: unknown) {
        console.error("Gagal membaca saldo cached Digiflazz:", err);
      } finally {
        if (isMounted) setDigiBalanceLoading(false);
      }
    };

    loadSystemHealth();
    loadCachedDigiBalance();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshDigiBalance = async () => {
    if (digiLiveRefreshing) return;
    setDigiLiveRefreshing(true);
    setDigiRefreshError(null);

    try {
      const res = await fetch("/api/digiflazz/balance");
      const data = await res.json();

      if (data.success && typeof data.balance === "number") {
        setDigiBalance(data.balance);
      } else {
        setDigiRefreshError(
          data.message || data.error || "Gagal cek saldo live.",
        );
      }
    } catch (err: unknown) {
      setDigiRefreshError(
        err instanceof Error
          ? err.message
          : "Server API Balance tidak merespons.",
      );
    } finally {
      setDigiLiveRefreshing(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const source = boundedKpiOrders ?? orders;
    const now = new Date();

    if (dateFilter === "today") {
      return source.filter(
        (order) =>
          new Date(order.created_at || "").toDateString() ===
          now.toDateString(),
      );
    }

    if (dateFilter === "week") {
      const startOfCurrentWeek = new Date(now);
      startOfCurrentWeek.setHours(0, 0, 0, 0);
      const dayOfWeek = startOfCurrentWeek.getDay();
      startOfCurrentWeek.setDate(
        startOfCurrentWeek.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek),
      );

      return source.filter((order) => {
        const createdAt = new Date(order.created_at || "");
        return createdAt >= startOfCurrentWeek && createdAt <= now;
      });
    }

    return source;
  }, [boundedKpiOrders, dateFilter, orders]);

  const dashboardKpis = useMemo(() => {
    const successfulOrders = filteredOrders.filter((order) =>
      isSuccessfulOrder(order.status),
    );

    const totalOrder = filteredOrders.length;

    return {
      totalOrder,
      successfulOrder: successfulOrders.length,
      omzetBerhasil: successfulOrders.reduce(
        (sum, order) => sum + (Number(order.price) || 0),
        0,
      ),
      successRate:
        totalOrder === 0
          ? 0
          : Math.round((successfulOrders.length / totalOrder) * 100),
    };
  }, [filteredOrders]);

  const pendingOrderCount = useMemo(
    () => orders.filter((order) => order.status === "Pending").length,
    [orders],
  );

  const onProcessOrderCount = useMemo(
    () => orders.filter((order) => order.status === "Diproses").length,
    [orders],
  );

  const totalAttentionCount =
    pendingDepositCount +
    pendingWithdrawCount +
    pendingOrderCount +
    onProcessOrderCount;

  const attentionItems = [
    {
      key: "deposit",
      label: "Deposit Pending",
      count: pendingDepositCount,
      description: "Menunggu verifikasi",
      icon: <CreditCard size={18} />,
      onClick: () => onOpenFinanceModal("deposit", true),
    },
    {
      key: "withdraw",
      label: "Withdraw Pending",
      count: pendingWithdrawCount,
      description: "Menunggu proses",
      icon: <Wallet size={18} />,
      onClick: () => onOpenFinanceModal("withdraw", true),
    },
    {
      key: "orderPending",
      label: "Order Pending",
      count: pendingOrderCount,
      description: "Perlu ditinjau",
      icon: <Clock size={18} />,
      onClick: () => onOpenAttentionOrders("pending"),
    },
    {
      key: "orderOnProcess",
      label: "Order On Process",
      count: onProcessOrderCount,
      description: "Perlu dipantau",
      icon: <Send size={18} />,
      onClick: () => onOpenAttentionOrders("onProcess"),
    },
  ].filter((item) => item.count > 0);

  const recentOrders = useMemo(
    () => boundedRecentOrders ?? orders.slice(0, 6),
    [boundedRecentOrders, orders],
  );

  const orderTrend = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() + mondayOffset);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    // Use bounded 14-day dataset when available; fall back to full orders
    // so the chart remains visible during initial load before the weekly query
    // resolves.
    const source = boundedWeeklyOrders ?? orders;

    const validOrders = source
      .map((order) => ({
        order,
        createdAt: new Date(order.created_at || ""),
      }))
      .filter(({ createdAt }) => !Number.isNaN(createdAt.getTime()));

    const getOrdersForDate = (targetDate: Date) =>
      validOrders
        .filter(
          ({ createdAt }) =>
            createdAt.toDateString() === targetDate.toDateString(),
        )
        .map(({ order }) => order);

    return Array.from({ length: 7 }, (_, index) => {
      const currentDate = new Date(currentWeekStart);
      currentDate.setDate(currentWeekStart.getDate() + index);

      const previousDate = new Date(previousWeekStart);
      previousDate.setDate(previousWeekStart.getDate() + index);

      const isFuture = currentDate > today;
      const currentOrders = isFuture ? [] : getOrdersForDate(currentDate);
      const previousOrders = getOrdersForDate(previousDate);

      const currentSuccessfulOrders = currentOrders.filter((order) =>
        isSuccessfulOrder(order.status),
      );
      const previousSuccessfulOrders = previousOrders.filter((order) =>
        isSuccessfulOrder(order.status),
      );

      const currentOmzet = currentSuccessfulOrders.reduce(
        (sum, order) => sum + (Number(order.price) || 0),
        0,
      );
      const previousOmzet = previousSuccessfulOrders.reduce(
        (sum, order) => sum + (Number(order.price) || 0),
        0,
      );

      const dayLabel = currentDate.toLocaleDateString("id-ID", {
        weekday: "short",
      });
      const shortDate = currentDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });

      return {
        day: dayLabel,
        date: shortDate,
        isFuture,
        currentCount: isFuture ? null : currentOrders.length,
        previousCount: previousOrders.length,
        currentSuccessCount: isFuture ? null : currentSuccessfulOrders.length,
        previousSuccessCount: previousSuccessfulOrders.length,
        currentOmzet: isFuture ? null : currentOmzet,
        previousOmzet,
      };
    });
  }, [boundedWeeklyOrders, orders]);

  const maxOrderCount = useMemo(() => {
    const allCounts = orderTrend.flatMap((item) => [
      item.currentCount ?? 0,
      item.previousCount,
    ]);
    return Math.max(...allCounts, 1);
  }, [orderTrend]);

  const trendAxisTicks = useMemo(() => {
    const step = maxOrderCount / 3;
    return [
      maxOrderCount,
      Math.round(step * 2),
      Math.round(step),
      0,
    ];
  }, [maxOrderCount]);

  const weeklyOrderTotals = useMemo(() => {
    const elapsedCurrentDays = orderTrend.filter((item) => !item.isFuture);
    const currentTotal = elapsedCurrentDays.reduce(
      (sum, item) => sum + (item.currentCount || 0),
      0,
    );

    const previousTotal = orderTrend
      .slice(0, elapsedCurrentDays.length)
      .reduce((sum, item) => sum + item.previousCount, 0);

    const currentSuccessTotal = elapsedCurrentDays.reduce(
      (sum, item) => sum + (item.currentSuccessCount || 0),
      0,
    );

    const previousSuccessTotal = orderTrend
      .slice(0, elapsedCurrentDays.length)
      .reduce((sum, item) => sum + item.previousSuccessCount, 0);

    const currentOmzetTotal = elapsedCurrentDays.reduce(
      (sum, item) => sum + (item.currentOmzet || 0),
      0,
    );

    const previousOmzetTotal = orderTrend
      .slice(0, elapsedCurrentDays.length)
      .reduce((sum, item) => sum + item.previousOmzet, 0);

    return {
      currentTotal,
      previousTotal,
      currentSuccessTotal,
      previousSuccessTotal,
      currentOmzetTotal,
      previousOmzetTotal,
    };
  }, [orderTrend]);

  const weeklyOrderDelta =
    weeklyOrderTotals.currentTotal - weeklyOrderTotals.previousTotal;

  const weeklyOrderDeltaPercent =
    weeklyOrderTotals.previousTotal === 0
      ? null
      : Math.round(
          (weeklyOrderDelta / weeklyOrderTotals.previousTotal) * 100,
        );

  const kpiSparkline = useMemo(() => {
    const totalTrend = orderTrend.map((item) => item.currentCount || 0);
    const successTrend = orderTrend.map(
      (item) => item.currentSuccessCount || 0,
    );
    const omzetTrend = orderTrend.map((item) => item.currentOmzet || 0);
    const rateTrend = orderTrend.map((item) => {
      const total = item.currentCount || 0;
      const success = item.currentSuccessCount || 0;
      return total === 0 ? 0 : Math.round((success / total) * 100);
    });

    return {
      totalOrder: totalTrend,
      successfulOrder: successTrend,
      omzet: omzetTrend,
      successRate: rateTrend,
      label: "Tren 7 hari kalender minggu ini",
    };
  }, [orderTrend]);

  const selectedPeriodLabel =
    dateFilter === "today"
      ? "Hari Ini"
      : dateFilter === "week"
        ? "Minggu Ini"
        : "Semua Data";

  const orderWeekLabel = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const start = new Date(today);
    start.setDate(today.getDate() + mondayOffset);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startFormatted = start.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
    const endFormatted = end.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });

    return `${startFormatted} - ${endFormatted}`;
  }, []);

  const previousOrderWeekLabel = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const start = new Date(today);
    start.setDate(today.getDate() + mondayOffset - 7);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startFormatted = start.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
    const endFormatted = end.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });

    return `${startFormatted} - ${endFormatted}`;
  }, []);

  return (
    <div className="space-y-5" aria-busy={loading}>
      <header className="rounded-3xl border border-slate-200/80 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.045)] md:px-6 md:py-6 lg:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#07152f] text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] sm:flex">
              <Activity size={26} />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 md:text-[30px]">
                  DASHBOARD
                </h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-blue-600 ring-1 ring-blue-100">
                  Command Center
                </span>
              </div>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-slate-500">
                Ringkasan operasional DaPay, antrean yang perlu ditindak, dan
                aktivitas order terbaru dalam satu tampilan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-[14px] border border-slate-200 bg-slate-50 p-1">
              {["all", "today", "week"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setDateFilter(filter)}
                  aria-pressed={dateFilter === filter}
                  className={`rounded-[10px] px-3.5 py-2.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:py-2 ${
                    dateFilter === filter
                      ? "bg-[#07152f] text-white shadow-sm"
                      : "text-slate-500 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  {filter === "all"
                    ? "Semua"
                    : filter === "today"
                      ? "Hari Ini"
                      : "Minggu Ini"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-10"
              aria-label="Muat ulang Dashboard"
              title="Muat ulang Dashboard"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
      </header>

      {loading && !hasLoadedOnce ? (
        <AdminSkeleton variant="dashboard" />
      ) : dashboardError ? (
        <section
          className="rounded-[22px] border border-rose-100 bg-white p-8 text-center shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
          aria-live="polite"
        >
          <AlertCircle className="mx-auto text-rose-500" size={28} />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            Dashboard belum dapat dimuat
          </h2>
          <p className="mt-1 text-sm text-slate-500">{dashboardError}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Coba lagi
          </button>
        </section>
      ) : (
        <>
          <section aria-labelledby="attention-heading">
            {totalAttentionCount === 0 ? (
              <div className="relative min-h-18 overflow-hidden rounded-[18px] border border-emerald-100 bg-linear-to-r from-emerald-50/80 via-white to-emerald-50/35 px-5 py-3.5 shadow-[0_7px_20px_rgba(15,23,42,0.025)] md:px-6">
                <div className="relative z-20 flex min-h-11 items-center gap-3.5 pr-0 sm:pr-60">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200">
                    <CheckCircle2 size={18} strokeWidth={2} />
                  </span>
                  <div>
                    <h2
                      id="attention-heading"
                      className="text-[12px] font-bold text-emerald-800"
                    >
                      Operasional dalam kondisi baik
                    </h2>
                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                      Tidak ada antrean yang memerlukan perhatian saat ini.
                    </p>
                  </div>
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 right-3 hidden w-56 sm:block"
                  aria-hidden="true"
                >
                  <div className="absolute bottom-0 right-1 flex h-12 items-end gap-1 opacity-75">
                    {[10, 18, 14, 26, 20, 34, 27, 44, 34, 52, 42].map(
                      (height, index) => (
                        <span
                          key={index}
                          className="w-1.5 rounded-t-sm bg-blue-100"
                          style={{ height }}
                        />
                      ),
                    )}
                  </div>

                  <svg
                    viewBox="0 0 210 64"
                    className="absolute bottom-0 right-0 h-16 w-52.5 text-blue-100/80"
                    fill="none"
                  >
                    <path
                      d="M2 51 C23 49, 34 30, 53 34 C71 38, 83 22, 101 27 C123 34, 136 13, 155 20 C174 27, 188 16, 208 18"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>

                  <span className="absolute bottom-2 right-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/85 text-emerald-600 shadow-[0_6px_16px_rgba(16,185,129,0.10)] ring-1 ring-emerald-200/80">
                    <ShieldCheck size={30} strokeWidth={1.9} />
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-[20px] border border-amber-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)] md:p-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2
                      id="attention-heading"
                      className="text-[15px] font-bold text-slate-950"
                    >
                      Needs Attention
                    </h2>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {totalAttentionCount.toLocaleString("id-ID")} antrean
                      memerlukan tindakan
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {attentionItems.map((item) => (
                    <AttentionCard
                      key={item.key}
                      label={item.label}
                      count={item.count}
                      description={item.description}
                      icon={item.icon}
                      onClick={item.onClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Operational Health & Provider Balance Layer */}
          <section
            aria-labelledby="operational-health-heading"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* Database & System Connectivity */}
            <div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-white p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Activity size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-900">
                    Database & Sistem
                  </p>
                  <p className="truncate text-[9px] text-slate-500">
                    {healthLoading
                      ? "Memeriksa status..."
                      : healthError
                        ? "Koneksi terganggu"
                        : systemHealth?.statuses?.database?.status === "online"
                          ? "Supabase & Auth Normal"
                          : "Database Gangguan"}
                  </p>
                </div>
              </div>
              <AdminBadge
                status={
                  healthLoading
                    ? "PENDING"
                    : healthError ||
                        systemHealth?.statuses?.database?.status !== "online"
                      ? "GAGAL"
                      : "BERHASIL"
                }
                label={
                  healthLoading
                    ? "Memuat..."
                    : healthError ||
                        systemHealth?.statuses?.database?.status !== "online"
                      ? "Gangguan"
                      : "Online"
                }
                size="sm"
              />
            </div>

            {/* Gateway QRIS & Provider Readiness */}
            <div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-white p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <ShieldCheck size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-900">
                    Gateway QRIS
                  </p>
                  <p className="truncate text-[9px] text-slate-500">
                    {healthLoading
                      ? "Memeriksa provider..."
                      : healthError
                        ? "Status tidak tersedia"
                        : `Provider: ${systemHealth?.active_provider || "dana_dynamic"}`}
                  </p>
                </div>
              </div>
              <AdminBadge
                status={
                  healthLoading
                    ? "PENDING"
                    : healthError ||
                        systemHealth?.statuses?.qris_generator?.status ===
                          "error"
                      ? "GAGAL"
                      : "BERHASIL"
                }
                label={
                  healthLoading
                    ? "Memuat..."
                    : healthError ||
                        systemHealth?.statuses?.qris_generator?.status ===
                          "error"
                      ? "Error"
                      : "Aktif"
                }
                size="sm"
              />
            </div>

            {/* Digiflazz Cached & Manual Live Balance */}
            <div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-white p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <Wallet size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-900">
                    Saldo Digiflazz
                  </p>
                  <p className="text-[10px] font-bold tabular-nums text-slate-900">
                    {digiBalanceLoading
                      ? "Memuat saldo..."
                      : digiBalance !== null
                        ? formatRupiah(digiBalance)
                        : "Belum disinkron"}
                  </p>
                  {digiRefreshError && (
                    <p
                      className="truncate text-[8px] text-rose-500"
                      title={digiRefreshError}
                    >
                      {digiRefreshError}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefreshDigiBalance}
                disabled={digiLiveRefreshing}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-white hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                title="Cek saldo live ke Digiflazz"
                aria-label="Cek saldo live Digiflazz"
              >
                <RefreshCw
                  size={11}
                  className={digiLiveRefreshing ? "animate-spin text-blue-600" : ""}
                />
                <span>{digiLiveRefreshing ? "Cek..." : "Cek Live"}</span>
              </button>
            </div>
          </section>

          <section
            aria-labelledby="kpi-heading"
            className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] md:p-6"
          >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  id="kpi-heading"
                  className="text-[15px] font-bold text-slate-950"
                >
                  Ringkasan KPI
                </h2>
                <p className="mt-1 text-[10px] text-slate-500">
                  Metrik utama performa order
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Total Order"
                value={dashboardKpis.totalOrder.toLocaleString("id-ID")}
                description={selectedPeriodLabel}
                icon={<ShoppingBag size={20} strokeWidth={1.9} />}
                tone="blue"
                trend={kpiSparkline.totalOrder}
                trendLabel={kpiSparkline.label}
              />
              <KpiCard
                label="Order Berhasil"
                value={dashboardKpis.successfulOrder.toLocaleString("id-ID")}
                description="Status Berhasil"
                icon={<BadgeCheck size={20} strokeWidth={1.9} />}
                tone="emerald"
                trend={kpiSparkline.successfulOrder}
                trendLabel={kpiSparkline.label}
              />
              <KpiCard
                label="Omzet Berhasil"
                value={formatRupiah(dashboardKpis.omzetBerhasil)}
                description="Nilai order berhasil"
                icon={<Banknote size={20} strokeWidth={1.9} />}
                tone="violet"
                trend={kpiSparkline.omzet}
                trendLabel={kpiSparkline.label}
              />
              <KpiCard
                label="Tingkat Keberhasilan"
                value={`${dashboardKpis.successRate}%`}
                description="Berhasil ÷ total order"
                icon={<Gauge size={20} strokeWidth={1.9} />}
                tone="amber"
                trend={kpiSparkline.successRate}
                trendLabel={kpiSparkline.label}
              />
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-12">
            <section
              className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] md:p-6 lg:col-span-8"
              aria-labelledby="trend-heading"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2
                    id="trend-heading"
                    className="text-[15px] font-bold text-slate-950"
                  >
                    Aktivitas Order
                  </h2>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Perbandingan total order per hari: minggu ini vs minggu lalu
                    (Senin - Minggu)
                  </p>
                </div>

                <div className="inline-flex shrink-0 items-center gap-2.5 self-start rounded-2xl bg-blue-50/70 px-3 py-2 ring-1 ring-blue-100/80">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                    <CalendarDays size={15} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-blue-700">
                      Minggu Ini vs Minggu Lalu
                    </p>
                    <p className="mt-0.5 text-[9px] font-medium text-slate-500">
                      {orderWeekLabel}
                    </p>
                    <p className="mt-0.5 text-[8px] font-medium text-slate-400">
                      vs {previousOrderWeekLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2.5 sm:gap-4">
                <div
                  className="flex h-36 w-6 shrink-0 flex-col justify-between pb-px text-right text-[9px] font-medium tabular-nums text-slate-400"
                  aria-hidden="true"
                >
                  {trendAxisTicks.map((tick, index) => (
                    <span key={`trend-tick-${index}`}>{tick}</span>
                  ))}
                </div>

                <div
                  className="min-w-0 flex-1"
                  aria-label={`Grafik perbandingan aktivitas order ${orderWeekLabel} dengan ${previousOrderWeekLabel}`}
                >
                  <div className="relative h-36">
                    <div className="pointer-events-none absolute inset-x-0 top-1 h-px border-t border-dashed border-slate-200" />
                    <div className="pointer-events-none absolute inset-x-0 top-[33.333%] h-px border-t border-dashed border-slate-200" />
                    <div className="pointer-events-none absolute inset-x-0 top-[66.666%] h-px border-t border-dashed border-slate-200" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-slate-200" />

                    <div className="relative z-10 flex h-full items-end gap-1.5 sm:gap-3">
                      {orderTrend.map((item) => {
                        const previousHeight =
                          item.previousCount === 0
                            ? 4
                            : Math.max(
                                (item.previousCount / maxOrderCount) * 128,
                                6,
                              );
                        const currentHeight =
                          item.currentCount === null
                            ? 0
                            : item.currentCount === 0
                              ? 4
                              : Math.max(
                                  (item.currentCount / maxOrderCount) * 128,
                                  6,
                                );

                        return (
                          <div
                            key={item.day}
                            className="group relative flex h-full flex-1 flex-col items-center justify-end"
                          >
                            <div className="relative flex h-full w-full items-end justify-center gap-1 sm:gap-1.5">
                              <div
                                style={{ height: `${previousHeight}px` }}
                                className="w-full max-w-3 rounded-t-[5px] bg-slate-200/90 transition-all group-hover:bg-slate-300"
                              />

                              {item.isFuture ? (
                                <div className="w-full max-w-3 rounded-t-[5px] border border-dashed border-slate-200 bg-transparent" />
                              ) : (
                                <div
                                  style={{ height: `${currentHeight}px` }}
                                  className="w-full max-w-3 rounded-t-[5px] bg-blue-600 shadow-sm shadow-blue-500/20 transition-all group-hover:bg-blue-500"
                                />
                              )}
                            </div>

                            <div className="pointer-events-none absolute -top-12 left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-950 px-2.5 py-1.5 text-[9px] font-semibold text-white shadow-xl group-hover:block">
                              <span className="block text-slate-300">
                                {item.day}, {item.date}
                              </span>
                              <span className="block text-white">
                                {item.isFuture
                                  ? "Mendatang"
                                  : `${item.currentCount} order (Minggu ini)`}
                              </span>
                              <span className="block text-slate-400">
                                {item.previousCount} order (Minggu lalu)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between gap-1 border-t border-slate-100 pt-2.5">
                    {orderTrend.map((item) => (
                      <div
                        key={item.day}
                        className="flex-1 text-center text-[9px] font-semibold text-slate-500"
                      >
                        <p>{item.day}</p>
                        <p className="mt-0.5 text-[8px] font-normal text-slate-400">
                          {item.date}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center gap-4 text-[9px] font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
                    <span>Minggu Ini ({weeklyOrderTotals.currentTotal})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" />
                    <span>Minggu Lalu ({weeklyOrderTotals.previousTotal})</span>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <span
                    className={`text-[9px] font-semibold ${
                      weeklyOrderDelta > 0
                        ? "text-emerald-600"
                        : weeklyOrderDelta < 0
                          ? "text-rose-600"
                          : "text-slate-500"
                    }`}
                  >
                    {weeklyOrderDeltaPercent === null
                      ? `${weeklyOrderDelta >= 0 ? "+" : ""}${weeklyOrderDelta} order vs minggu lalu`
                      : `${weeklyOrderDeltaPercent >= 0 ? "+" : ""}${weeklyOrderDeltaPercent}% vs minggu lalu`}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[8px] font-medium text-slate-400">
                    Pembanding memakai hari yang sama · hari mendatang: —
                    <AlertCircle size={11} />
                  </span>
                </div>
              </div>
            </section>

            <section
              className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] md:p-6 lg:col-span-4"
              aria-labelledby="shortcut-heading"
            >
              <h2
                id="shortcut-heading"
                className="text-[15px] font-bold text-slate-950"
              >
                Akses Cepat
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Jalan pintas ke modul yang sering digunakan.
              </p>

              <div className="mt-4 space-y-2.5">
                <Shortcut
                  label="Deposit"
                  description="Kelola deposit member"
                  icon={<CreditCard size={17} />}
                  tone="blue"
                  onClick={() => onOpenFinanceModal("deposit", false)}
                />
                <Shortcut
                  label="Withdraw"
                  description="Kelola withdraw member"
                  icon={<Wallet size={17} />}
                  tone="amber"
                  onClick={() => onOpenFinanceModal("withdraw", false)}
                />
                <Shortcut
                  label="Explore Produk"
                  description="Jelajahi semua produk"
                  icon={<Package size={17} />}
                  tone="emerald"
                  href="/admin?tab=explore"
                />
                <Shortcut
                  label="Analytics"
                  description="Lihat laporan lengkap"
                  icon={<TrendingUp size={17} />}
                  tone="violet"
                  href="/admin?tab=analytics"
                />
              </div>
            </section>
          </div>

          <section
            id="recent-orders"
            className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
            aria-labelledby="recent-orders-heading"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
              <div>
                <h2
                  id="recent-orders-heading"
                  className="text-[15px] font-bold text-slate-950"
                >
                  Aktivitas Order Terbaru
                </h2>
                <p className="mt-1 text-[10px] text-slate-500">
                  Transaksi terbaru yang masuk ke sistem DaPay.
                </p>
              </div>

              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-medium text-slate-500">
                6 order terakhir
              </span>
            </div>

            {recentOrders.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Package className="mx-auto text-slate-300" size={26} />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Belum ada order untuk ditampilkan.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-225 table-fixed text-left">
                    <colgroup>
                      <col className="w-[13%]" />
                      <col className="w-[23%]" />
                      <col className="w-[18%]" />
                      <col className="w-[13%]" />
                      <col className="w-[12%]" />
                      <col className="w-[14%]" />
                      <col className="w-[7%]" />
                    </colgroup>
                    <thead className="bg-slate-50/80 text-[9px] font-bold uppercase tracking-[0.06em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3.5">Order</th>
                        <th className="px-5 py-3.5">Produk</th>
                        <th className="px-5 py-3.5">Pelanggan</th>
                        <th className="px-5 py-3.5 text-right">Nominal</th>
                        <th className="px-5 py-3.5 text-center">Status</th>
                        <th className="px-5 py-3.5 text-right">Waktu</th>
                        <th className="px-5 py-3.5 text-center">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentOrders.map((order) => (
                        <RecentOrderRow
                          key={order.id}
                          order={order}
                          onClick={() => onSelectOrder(order)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {recentOrders.map((order) => (
                    <RecentOrderMobileCard
                      key={order.id}
                      order={order}
                      onClick={() => onSelectOrder(order)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function AttentionCard({
  label,
  count,
  description,
  icon,
  onClick,
}: {
  label: string;
  count: number;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-amber-100">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-bold text-slate-900">
          {label}
        </span>
        <span className="mt-0.5 block text-[10px] text-slate-500">
          {description}
        </span>
      </span>

      <span className="flex items-center gap-2">
        <span className="text-xl font-black tabular-nums tracking-tight text-slate-950">
          {count}
        </span>
        <ChevronRight
          size={15}
          className="text-amber-500 transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </button>
  );
}

function KpiCard({
  label,
  value,
  description,
  icon,
  tone,
  trend,
  trendLabel,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "violet" | "amber";
  trend: number[];
  trendLabel: string;
}) {
  const tones = {
    blue: {
      iconShell: "bg-blue-50 text-blue-600 ring-blue-100",
      line: "#2563eb",
      fill: "#dbeafe",
    },
    emerald: {
      iconShell: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      line: "#059669",
      fill: "#d1fae5",
    },
    violet: {
      iconShell: "bg-violet-50 text-violet-600 ring-violet-100",
      line: "#7c3aed",
      fill: "#ede9fe",
    },
    amber: {
      iconShell: "bg-amber-50 text-orange-600 ring-amber-100",
      line: "#ea580c",
      fill: "#ffedd5",
    },
  };

  const selected = tones[tone];

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[18px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="relative z-10 flex items-center justify-between gap-2">
        <p className="truncate text-[9px] font-bold uppercase tracking-[0.07em] text-slate-500">
          {label}
        </p>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ring-1 ${selected.iconShell}`}
        >
          {icon}
        </span>
      </div>

      <p
        title={value}
        className="relative z-10 mt-3 whitespace-nowrap text-[19px] font-black tracking-[-0.035em] text-slate-950 md:text-[21px] xl:text-[22px]"
      >
        {value}
      </p>
      <p className="relative z-10 mt-1 truncate text-[10px] text-slate-500">
        {description}
      </p>

      <div
        className="pointer-events-none absolute bottom-0 right-0 z-0 h-16 w-2/5 opacity-70 sm:h-20 sm:w-1/2"
        title={trendLabel}
        aria-hidden="true"
      >
        <KpiSparkline
          values={trend}
          lineColor={selected.line}
          fillColor={selected.fill}
        />
      </div>

      <span className="sr-only">{trendLabel}</span>
    </article>
  );
}

function KpiSparkline({
  values,
  lineColor,
  fillColor,
}: {
  values: number[];
  lineColor: string;
  fillColor: string;
}) {
  const width = 110;
  const height = 58;
  const paddingX = 4;
  const paddingY = 6;

  const safeValues =
    values.length > 1
      ? values
      : values.length === 1
        ? [values[0], values[0]]
        : [0, 0];

  const minValue = Math.min(...safeValues);
  const maxValue = Math.max(...safeValues);
  const spread = Math.max(maxValue - minValue, 1);

  const points = safeValues.map((value, index) => {
    const x =
      paddingX +
      (index / Math.max(safeValues.length - 1, 1)) * (width - paddingX * 2);
    const y =
      height -
      paddingY -
      ((value - minValue) / spread) * (height - paddingY * 2);

    return { x, y };
  });

  const smoothPath = points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }

    const previous = points[index - 1];
    const previousPrevious = points[index - 2] ?? previous;
    const next = points[index + 1] ?? point;

    const control1X = previous.x + (point.x - previousPrevious.x) / 6;
    const control1Y = previous.y + (point.y - previousPrevious.y) / 6;
    const control2X = point.x - (next.x - previous.x) / 6;
    const control2Y = point.y - (next.y - previous.y) / 6;

    return `${path} C ${control1X.toFixed(2)} ${control1Y.toFixed(2)}, ${control2X.toFixed(2)} ${control2Y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, "");

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaPath = `${smoothPath} L ${lastPoint.x.toFixed(2)} ${(height - paddingY).toFixed(2)} L ${firstPoint.x.toFixed(2)} ${(height - paddingY).toFixed(2)} Z`;

  const gradientId = `kpi-spark-${lineColor.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full overflow-visible"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.45" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={smoothPath}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Shortcut({
  label,
  description,
  icon,
  tone,
  onClick,
  href,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "violet" | "amber";
  onClick?: () => void;
  href?: string;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
  };

  const content = (
    <>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ring-1 ${tones[tone]}`}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold text-slate-950">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[9px] text-slate-500">
          {description}
        </span>
      </span>

      <ChevronRight
        size={15}
        className="shrink-0 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-blue-600"
      />
    </>
  );

  const className =
    "group flex w-full items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-3 text-left transition-all hover:-translate-y-px hover:border-blue-200 hover:bg-slate-50/60 hover:shadow-[0_8px_20px_rgba(15,23,42,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1";

  if (href) {
    return (
      <Link href={href} scroll={false} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function RecentOrderRow({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  return (
    <tr className="transition-colors hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <span className="text-[11px] font-bold text-blue-600">
          #{order.order_id?.slice(-8) || "-"}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className="truncate text-[11px] font-bold text-slate-900">
          {order.product_name || "-"}
        </p>
        <p className="mt-0.5 truncate text-[9px] text-slate-400">
          {order.item_label || "-"}
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="truncate text-[10px] text-slate-600">
          {order.email || order.user_contact || "Guest"}
        </p>
      </td>

      <td className="px-5 py-4 text-right text-[11px] font-bold tabular-nums text-slate-900">
        {formatRupiah(order.price)}
      </td>

      <td className="px-5 py-4 text-center">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${orderStatusClasses(
            order.status,
          )}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${orderStatusDotClasses(
              order.status,
            )}`}
          />
          {order.status || "Pending"}
        </span>
      </td>

      <td className="px-5 py-4 text-right text-[9px] text-slate-400">
        {formatOrderTime(order.created_at)}
      </td>

      <td className="px-5 py-4 text-center">
        <button
          type="button"
          onClick={onClick}
          className="text-[10px] font-bold text-blue-600 transition hover:text-blue-800 focus-visible:outline-none focus-visible:underline focus-visible:text-blue-800"
        >
          Lihat Detail
        </button>
      </td>
    </tr>
  );
}

function RecentOrderMobileCard({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-slate-900">
            {order.product_name || "Produk tidak tersedia"}
          </p>
          <p className="mt-1 truncate text-[10px] text-slate-400">
            #{order.order_id?.slice(-8) || "-"} ·{" "}
            {order.email || order.user_contact || "Guest"}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${orderStatusClasses(
            order.status,
          )}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${orderStatusDotClasses(
              order.status,
            )}`}
          />
          {order.status || "Pending"}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold tabular-nums text-slate-950">
            {formatRupiah(order.price)}
          </p>
          <p className="mt-1 text-[9px] text-slate-400">
            {formatOrderTime(order.created_at)}
          </p>
        </div>

        <button
          type="button"
          onClick={onClick}
          className="rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-600 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          Lihat Detail
        </button>
      </div>
    </article>
  );
}

