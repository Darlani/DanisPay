"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CircleDollarSign,
  Coins,
  Package,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import {
  BalanceLog,
  DashboardResponse,
  WalletEntry,
  WalletFilters,
  WalletSummary,
  cleanDescription,
  detectAsset,
  detectFlow,
  flowLabel,
  mapTypeLabel,
  toNumber,
} from "./types";
import WalletKpiCards from "./components/WalletKpiCards";
import WalletFilterBar from "./components/WalletFilterBar";
import WalletDesktopTable from "./components/WalletDesktopTable";
import WalletMobileCardList from "./components/WalletMobileCardList";
import WalletDetailModal from "./components/WalletDetailModal";
import WalletPagination from "./components/WalletPagination";

interface WalletViewUserProps {
  initialBalance?: number | string | null;
  initialCoinBalance?: number | string | null;
  initialLogs?: BalanceLog[];
  isSidebarExpanded?: boolean;
}

function computeEntriesFromLogs(rawLogs: BalanceLog[]): WalletEntry[] {
  return rawLogs.map((log) => {
    const asset = detectAsset(log);
    const amount =
      asset === "coin"
        ? log.coin_amount !== null && log.coin_amount !== undefined
          ? toNumber(log.coin_amount)
          : toNumber(log.amount)
        : toNumber(log.amount);

    return {
      log,
      asset,
      amount,
      description: cleanDescription(log.description, log.type, asset),
      type: log.type || "Aktivitas",
      flow: detectFlow(amount),
      createdAt: log.created_at || "",
    };
  });
}

function computeSummary(
  balance: number,
  coinBalance: number,
  entries: WalletEntry[],
): WalletSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let totalCoinIncome = 0;
  let totalCoinExpense = 0;

  for (const entry of entries) {
    if (entry.asset === "balance") {
      if (entry.amount > 0) {
        totalIncome += entry.amount;
      } else if (entry.amount < 0) {
        totalExpense += Math.abs(entry.amount);
      }
    } else {
      if (entry.amount > 0) {
        totalCoinIncome += entry.amount;
      } else if (entry.amount < 0) {
        totalCoinExpense += Math.abs(entry.amount);
      }
    }
  }

  return {
    balance,
    coinBalance,
    totalIncome,
    totalExpense,
    totalCoinIncome,
    totalCoinExpense,
    totalCount: entries.length,
  };
}

export default function WalletViewUser({
  initialBalance = 0,
  initialCoinBalance = 0,
  initialLogs = [],
  isSidebarExpanded = false,
}: WalletViewUserProps) {
  // Local state override for manual refresh
  const [localLogs, setLocalLogs] = useState<BalanceLog[] | null>(null);
  const [localBalance, setLocalBalance] = useState<number | null>(null);
  const [localCoinBalance, setLocalCoinBalance] = useState<number | null>(null);

  // 1. TRUE INSTANT 0ms HYDRATION: Directly bind to parent live memory state with zero delay
  const logs = useMemo(() => {
    return localLogs ?? (Array.isArray(initialLogs) ? initialLogs : []);
  }, [localLogs, initialLogs]);
  const balance = localBalance ?? toNumber(initialBalance);
  const coinBalance = localCoinBalance ?? toNumber(initialCoinBalance);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WalletEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<WalletFilters>({
    search: "",
    asset: "Semua",
    type: "Semua",
    flow: "Semua",
    date: "",
    page: 1,
    limit: 10,
  });

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // ================================================================== //
  // SWR: FETCH WALLET DATA & SILENT BACKGROUND REFRESH                 //
  // ================================================================== //
  const fetchWalletData = useCallback(
    async (isManual = false) => {
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

        const response = await fetch("/api/user/dashboard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        const result = (await response.json()) as DashboardResponse;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error || "Gagal memuat data keuangan.");
        }

        setLocalBalance(toNumber(result.data.profile?.balance));
        setLocalCoinBalance(
          toNumber(
            result.data.profile?.coin_balance ?? result.data.profile?.coinBalance,
          ),
        );
        setLocalLogs(
          Array.isArray(result.data.balanceLogs) ? result.data.balanceLogs : [],
        );
      } catch (error) {
        console.error("WalletViewUser SWR error:", error);
        if (isManual) {
          showToast(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat data.",
          );
        }
      } finally {
        setRefreshing(false);
      }
    },
    [showToast],
  );

  // SWR: Only trigger background fetch if initial memory is empty (e.g. direct page refresh on wallet tab)
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      if (!initialLogs || initialLogs.length === 0) {
        void fetchWalletData(false);
      }
    }
  }, [fetchWalletData, initialLogs]);

  // Synchronously compute entries from memory
  const entries = useMemo<WalletEntry[]>(() => {
    return computeEntriesFromLogs(logs);
  }, [logs]);

  // Distinct types for filter dropdown
  const types = useMemo<string[]>(() => {
    return Array.from(
      new Set(entries.map((entry) => mapTypeLabel(entry.type)).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "id"));
  }, [entries]);

  // Synchronously compute wallet summary for 0ms KPI cards
  const summary = useMemo<WalletSummary>(() => {
    return computeSummary(balance, coinBalance, entries);
  }, [balance, coinBalance, entries]);

  // Filtered entries
  const filteredEntries = useMemo<WalletEntry[]>(() => {
    const keyword = filters.search.trim().toLowerCase();

    return entries.filter((entry) => {
      // 1. Search keyword
      if (keyword) {
        const searchable = [
          entry.log.id,
          entry.type,
          mapTypeLabel(entry.type),
          entry.description,
          entry.asset,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(keyword)) return false;
      }

      // 2. Asset filter
      if (filters.asset === "Saldo" && entry.asset !== "balance") return false;
      if (filters.asset === "Koin" && entry.asset !== "coin") return false;

      // 3. Type filter
      if (
        filters.type !== "Semua" &&
        mapTypeLabel(entry.type) !== filters.type &&
        entry.type !== filters.type
      ) {
        return false;
      }

      // 4. Flow filter
      if (filters.flow !== "Semua" && flowLabel(entry.flow) !== filters.flow) {
        return false;
      }

      // 5. Date filter
      if (filters.date) {
        const entryDate = (entry.log.created_at || "").slice(0, 10);
        if (entryDate !== filters.date) return false;
      }

      return true;
    });
  }, [entries, filters]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredEntries.length / filters.limit),
  );

  const visibleEntries = useMemo(() => {
    const start = (filters.page - 1) * filters.limit;
    return filteredEntries.slice(start, start + filters.limit);
  }, [filteredEntries, filters.limit, filters.page]);

  const handleFilterChange = (updates: Partial<WalletFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
      page: "page" in updates ? (updates.page as number) : 1,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      asset: "Semua",
      type: "Semua",
      flow: "Semua",
      date: "",
      page: 1,
      limit: filters.limit,
    });
  };

  // Dynamic ledger title based on active filter state
  const ledgerTitle = useMemo(() => {
    // 1. Tab Koin
    if (filters.asset === "Koin") {
      // Prioritas Filter Arus: jika arus Masuk atau Keluar dipilih
      if (filters.flow === "Masuk") {
        return "Mutasi Koin Masuk";
      }
      if (filters.flow === "Keluar") {
        return "Mutasi Koin Keluar";
      }

      // Jika arus "Semua", tapi filter jenis dipilih
      if (filters.type && filters.type !== "Semua") {
        const typeLower = filters.type.toLowerCase();
        if (
          typeLower.includes("deposit") ||
          typeLower.includes("withdraw") ||
          typeLower.includes("tarik") ||
          typeLower.includes("penarikan")
        ) {
          return "Mutasi Koin";
        }
        if (typeLower.includes("admin") || typeLower.includes("adjustment")) {
          return "Mutasi Koin Admin Adjustment";
        }
        if (typeLower.includes("refund")) {
          return "Mutasi Koin Refund";
        }
        return `Mutasi Koin ${filters.type}`;
      }

      // Default Tab Koin tanpa filter jenis/arus
      return "Mutasi Koin";
    }

    // 2. Tab Saldo
    if (filters.asset === "Saldo") {
      // Prioritas Filter Arus: jika arus Masuk atau Keluar dipilih, abaikan filter jenis
      if (filters.flow === "Masuk") {
        return "Mutasi Saldo Masuk";
      }
      if (filters.flow === "Keluar") {
        return "Mutasi Saldo Keluar";
      }
      // Jika arus "Semua", tapi filter jenis dipilih (Deposit, Withdraw, Admin Adjustment, Refund, dll.)
      if (filters.type && filters.type !== "Semua") {
        return `Mutasi Saldo ${filters.type}`;
      }
      return "Mutasi Saldo";
    }

    // 3. Tab Semua (filters.asset === "Semua")
    // Prioritas Filter Arus
    if (filters.flow === "Masuk") {
      return "Mutasi Saldo & Koin Masuk";
    }
    if (filters.flow === "Keluar") {
      return "Mutasi Saldo & Koin Keluar";
    }
    // Jika arus "Semua", tapi filter jenis dipilih
    if (filters.type && filters.type !== "Semua") {
      return `Mutasi Saldo & Koin ${filters.type}`;
    }

    // Default ketika tab Semua dipilih dan tanpa filter
    return "Mutasi Saldo & Koin";
  }, [filters.asset, filters.flow, filters.type]);

  // Dynamic header icon based on asset
  const HeaderIcon =
    filters.asset === "Koin"
      ? Coins
      : filters.asset === "Saldo"
      ? CircleDollarSign
      : WalletCards;

  const headerIconBg =
    filters.asset === "Koin"
      ? "bg-violet-50 text-violet-600 border border-violet-100"
      : filters.asset === "Saldo"
      ? "bg-blue-50 text-blue-600 border border-blue-100"
      : "bg-blue-50 text-blue-600 border border-blue-100";

  return (
    <section className="w-full relative min-w-0">
      {/* ============================================================ */}
      {/* 1. GLASSMORPHIC KPI SUMMARY CARDS (0ms Instant Render)       */}
      {/* ============================================================ */}
      <WalletKpiCards summary={summary} />

      {/* ============================================================ */}
      {/* 2. MODERN FILTER TOOLBAR                                     */}
      {/* ============================================================ */}
      <WalletFilterBar
        filters={filters}
        types={types}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        isSidebarExpanded={isSidebarExpanded}
      />

      {/* ============================================================ */}
      {/* 3. MAIN MUTATION LEDGER CONTAINER (0ms Instant Render)       */}
      {/* ============================================================ */}
      <section className="overflow-hidden rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
        {/* Table/List Subheader */}
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-3 sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${headerIconBg}`}>
              <HeaderIcon size={15} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                {ledgerTitle}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                Menampilkan {visibleEntries.length} dari {filteredEntries.length} mutasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void fetchWalletData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Refresh Data Keuangan"
            >
              <RefreshCw
                size={12}
                className={refreshing ? "animate-spin text-blue-600" : "text-slate-500"}
              />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          </div>
        </div>

        {/* DATA / EMPTY STATE (0ms Instant Render) */}
        {filteredEntries.length === 0 ? (
          /* EMPTY STATE */
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Tidak ada riwayat mutasi ditemukan
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Coba ubah filter atau kata kunci pencarian Anda.
              </p>
            </div>
            {(filters.search ||
              filters.asset !== "Semua" ||
              filters.type !== "Semua" ||
              filters.flow !== "Semua" ||
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
              <WalletDesktopTable
                entries={visibleEntries}
                onSelectEntry={setSelectedEntry}
                onCopy={handleCopy}
              />
            </div>

            {/* Card View: Always on Mobile (<640px), on Tablet (640px-1023px) when Sidebar is Expanded */}
            <div className={isSidebarExpanded ? "block lg:hidden" : "block sm:hidden"}>
              <WalletMobileCardList
                entries={visibleEntries}
                onSelectEntry={setSelectedEntry}
                onCopy={handleCopy}
              />
            </div>

            {/* Pagination Controls */}
            <WalletPagination
              page={filters.page}
              totalPages={totalPages}
              totalItems={filteredEntries.length}
              limit={filters.limit}
              onPageChange={(page) => handleFilterChange({ page })}
              onLimitChange={(limit) => handleFilterChange({ limit, page: 1 })}
            />
          </>
        )}
      </section>

      {/* ============================================================ */}
      {/* 4. MODAL DETAIL MUTASI                                       */}
      {/* ============================================================ */}
      <WalletDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onCopy={handleCopy}
      />

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