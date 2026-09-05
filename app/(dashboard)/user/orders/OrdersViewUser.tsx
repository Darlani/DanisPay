"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  History,
  Loader2,
  Package,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import {
  Order,
  OrderFilters,
  OrdersApiResponse,
  OrdersPagination as OrdersPaginationType,
  OrdersSummary,
} from "./types";
import OrderKpiCards from "./components/OrderKpiCards";
import OrderFilterBar from "./components/OrderFilterBar";
import OrderDesktopTable from "./components/OrderDesktopTable";
import OrderMobileCardList from "./components/OrderMobileCardList";
import OrderDetailModal from "./components/OrderDetailModal";
import OrderPagination from "./components/OrderPagination";

const INITIAL_SUMMARY: OrdersSummary = {
  totalSpent: 0,
  totalCount: 0,
  successCount: 0,
  processingCount: 0,
  failedCount: 0,
  expiredCount: 0,
};

const INITIAL_PAGINATION: OrdersPaginationType = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

function computeInitialSummary(initialOrders?: Partial<Order>[]): OrdersSummary {
  if (!initialOrders || initialOrders.length === 0) return INITIAL_SUMMARY;

  let totalSpent = 0;
  let successCount = 0;
  let processingCount = 0;
  let failedCount = 0;
  let expiredCount = 0;
  const statusCounts = {
    semua: initialOrders.length,
    pending: 0,
    expired: 0,
    proses: 0,
    berhasil: 0,
    gagal: 0,
  };

  for (const o of initialOrders) {
    const rawStatus = (o.status || "").toLowerCase().trim();
    const amount = Number(o.total_amount ?? o.price ?? 0);

    if (rawStatus === "berhasil" || rawStatus === "success" || rawStatus === "selesai") {
      successCount++;
      statusCounts.berhasil++;
      totalSpent += amount;
    } else if (rawStatus === "expired" || rawStatus === "kadaluarsa" || rawStatus === "dibatalkan") {
      expiredCount++;
      statusCounts.expired++;
    } else if (rawStatus === "pending" || rawStatus === "menunggu") {
      processingCount++;
      statusCounts.pending++;
    } else if (rawStatus === "proses" || rawStatus === "processing") {
      processingCount++;
      statusCounts.proses++;
    } else {
      failedCount++;
      statusCounts.gagal++;
    }
  }

  return {
    totalSpent,
    totalCount: initialOrders.length,
    successCount,
    processingCount,
    failedCount,
    expiredCount,
    statusCounts,
  };
}

interface OrdersViewUserProps {
  initialOrders?: Partial<Order>[];
  isSidebarExpanded?: boolean;
  onRefresh?: () => void | Promise<void>;
}

export default function OrdersViewUser({
  initialOrders = [],
  isSidebarExpanded = false,
  onRefresh,
}: OrdersViewUserProps) {
  void onRefresh;
  const hasInitialData = Boolean(initialOrders && initialOrders.length > 0);

  const [orders, setOrders] = useState<Order[]>(() =>
    hasInitialData ? (initialOrders as Order[]) : [],
  );
  const [summary, setSummary] = useState<OrdersSummary>(() =>
    computeInitialSummary(initialOrders),
  );
  const [pagination, setPagination] = useState<OrdersPaginationType>(() => ({
    page: 1,
    limit: 10,
    total: initialOrders?.length || 0,
    totalPages: Math.max(1, Math.ceil((initialOrders?.length || 0) / 10)),
  }));
  const [categories, setCategories] = useState<string[]>(() => {
    if (!hasInitialData) return [];
    return Array.from(
      new Set(initialOrders.map((o) => o.category).filter(Boolean) as string[]),
    );
  });

  // If initial data is present, loading starts as false for 0ms instant render!
  const [loading, setLoading] = useState(!hasInitialData);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    status: "Semua",
    category: "Semua",
    paymentMethod: "Semua",
    sort: "newest",
    date: "",
    page: 1,
    limit: 10,
  });

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMountRef = useRef(true);

  // Show floating toast notification
  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  const handleCopy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(`${label} berhasil disalin ke clipboard!`);
      } catch {
        showToast(`Gagal menyalin ${label}.`);
      }
    },
    [showToast],
  );

  // SWR: Synchronize when parent passes updated orders
  useEffect(() => {
    if (initialOrders && initialOrders.length > 0) {
      setOrders(initialOrders as Order[]);
      setSummary(computeInitialSummary(initialOrders));
    }
  }, [initialOrders]);

  // ================================================================== //
  // FETCH USER ORDERS (GET /api/user/orders)                            //
  // ================================================================== //
  const fetchOrders = useCallback(
    async (currentFilters: OrderFilters, isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          window.location.href = "/login";
          return;
        }

        const params = new URLSearchParams({
          page: String(currentFilters.page),
          limit: String(currentFilters.limit),
          status: currentFilters.status,
          category: currentFilters.category,
          payment_method: currentFilters.paymentMethod,
          sort: currentFilters.sort,
        });

        if (currentFilters.search.trim()) {
          params.set("search", currentFilters.search.trim());
        }
        if (currentFilters.date) {
          params.set("date", currentFilters.date);
        }

        const response = await fetch(`/api/user/orders?${params.toString()}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        const result = (await response.json()) as OrdersApiResponse;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error || "Gagal memuat data transaksi.");
        }

        setOrders(result.data.orders || []);
        setPagination(result.data.pagination || INITIAL_PAGINATION);
        setSummary(result.data.summary || INITIAL_SUMMARY);
        if (result.data.categories?.length) {
          setCategories(result.data.categories);
        }
      } catch (error) {
        console.error("OrdersViewUser fetch error:", error);
        if (isManual) {
          showToast(
            error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data.",
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast],
  );

  // Initial load (SWR background sync only if memory is empty)
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      if (!initialOrders || initialOrders.length === 0) {
        void fetchOrders(filters, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle filter changes (with debounce for search)
  const handleFilterChange = (updates: Partial<OrderFilters>) => {
    const updatedFilters = { ...filters, ...updates };
    setFilters(updatedFilters);

    if ("search" in updates) {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        void fetchOrders(updatedFilters, false);
      }, 350);
    } else {
      void fetchOrders(updatedFilters, false);
    }
  };

  const handleResetFilters = () => {
    const resetState: OrderFilters = {
      search: "",
      status: "Semua",
      category: "Semua",
      paymentMethod: "Semua",
      sort: "newest",
      date: "",
      page: 1,
      limit: filters.limit,
    };
    setFilters(resetState);
    void fetchOrders(resetState, false);
  };

  return (
    <section className="w-full relative min-w-0">
      {/* ============================================================ */}
      {/* 1. GLASSMORPHIC KPI SUMMARY CARDS                            */}
      {/* ============================================================ */}
      <OrderKpiCards summary={summary} loading={loading} />

      {/* ============================================================ */}
      {/* 2. MODERN 1-LINE FILTER TOOLBAR                              */}
      {/* ============================================================ */}
      <OrderFilterBar
        filters={filters}
        categories={categories}
        statusCounts={summary.statusCounts}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        isSidebarExpanded={isSidebarExpanded}
      />

      {/* ============================================================ */}
      {/* 3. MAIN TRANSACTIONS CONTAINER                               */}
      {/* ============================================================ */}
      <section className="overflow-hidden rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
        {/* Table/List Subheader */}
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-3 sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <History size={15} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                Riwayat Transaksi
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                Menampilkan {orders.length} dari {pagination.total} transaksi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchOrders(filters, false)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Refresh Data Transaksi"
            >
              <RefreshCw
                size={12}
                className={refreshing ? "animate-spin text-blue-600" : "text-slate-500"}
              />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          </div>
        </div>

        {/* LOADING SKELETON (Only on pure zero-data initial load) */}
        {loading ? (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 size={28} className="animate-spin text-blue-600" />
            <p className="text-xs sm:text-sm font-semibold text-slate-500">
              Memuat data transaksi...
            </p>
          </div>
        ) : orders.length === 0 ? (
          /* EMPTY STATE */
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Tidak ada transaksi ditemukan
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Coba ubah filter atau kata kunci pencarian Anda.
              </p>
            </div>
            {(filters.search ||
              filters.status !== "Semua" ||
              filters.category !== "Semua" ||
              filters.paymentMethod !== "Semua" ||
              filters.date) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          /* DATA TABLES / CARD LIST */
          <>
            {/* Table View: Always on Desktop (>=1024px), on Tablet (640px-1023px) only when Navigation Rail is active */}
            <div className={isSidebarExpanded ? "hidden lg:block" : "hidden sm:block"}>
              <OrderDesktopTable
                orders={orders}
                onSelectOrder={setSelectedOrder}
                onCopy={handleCopy}
              />
            </div>

            {/* Card View: Always on Mobile (<640px), on Tablet (640px-1023px) when Sidebar is Expanded */}
            <div className={isSidebarExpanded ? "block lg:hidden" : "block sm:hidden"}>
              <OrderMobileCardList
                orders={orders}
                onSelectOrder={setSelectedOrder}
                onCopy={handleCopy}
              />
            </div>

            {/* Pagination Controls */}
            <OrderPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              limit={pagination.limit}
              onPageChange={(page) => handleFilterChange({ page })}
              onLimitChange={(limit) => handleFilterChange({ limit, page: 1 })}
            />
          </>
        )}
      </section>

      {/* ============================================================ */}
      {/* 4. MODAL DETAIL TRANSAKSI                                    */}
      {/* ============================================================ */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onCopy={handleCopy}
        />
      )}

      {/* ============================================================ */}
      {/* 5. TOAST NOTIFICATION                                        */}
      {/* ============================================================ */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-none">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-900/95 px-4 py-3 text-xs font-bold text-white shadow-2xl backdrop-blur-md border border-white/10">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </section>
  );
}