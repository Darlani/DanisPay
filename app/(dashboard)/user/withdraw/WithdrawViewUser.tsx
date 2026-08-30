"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowUpFromLine,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  Withdrawal,
} from "./types";
import { useWithdrawData } from "./hooks/useWithdrawData";
import { useWithdrawFilters } from "./hooks/useWithdrawFilters";
import WithdrawKpiCards from "./components/WithdrawKpiCards";
import WithdrawFilterBar from "./components/WithdrawFilterBar";
import WithdrawDesktopTable from "./components/WithdrawDesktopTable";
import WithdrawMobileCardList from "./components/WithdrawMobileCardList";
import WithdrawPagination from "./components/WithdrawPagination";
import WithdrawDetailModal from "./components/WithdrawDetailModal";
import WithdrawCreateModal from "./components/WithdrawCreateModal";

interface WithdrawViewUserProps {
  initialBalance?: number;
  initialCoinBalance?: number;
  initialWithdrawals?: Withdrawal[];
  isSidebarExpanded?: boolean;
}

export default function WithdrawViewUser({
  initialBalance = 0,
  initialCoinBalance = 0,
  initialWithdrawals = [],
  isSidebarExpanded = false,
}: WithdrawViewUserProps) {
  // SWR DATA HOOK
  const {
    withdrawals,
    balance,
    summary,
    statusCounts,
    error,
    refetch,
  } = useWithdrawData({
    initialBalance,
    initialCoinBalance,
    initialWithdrawals,
  });

  // FILTER & PAGINATION HOOK
  const {
    filters,
    setSearch,
    setStatusFilter,
    setDateFilter,
    setPage,
    resetFilters,
    visibleWithdrawals,
    totalItems,
    totalPages,
    isFiltered,
    pageSize,
  } = useWithdrawFilters(withdrawals);

  // MODAL STATES
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    if (!text || text === "-") return;
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage(`${label} berhasil disalin!`);
      setTimeout(() => setToastMessage(null), 2500);
    } catch {
      // Fallback
      setToastMessage(`${label}: ${text}`);
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* 1. TOP ACTION BAR (BUTTON TARIK SALDO RIGHT-ALIGNED) */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex h-9 sm:h-9.5 items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 text-xs font-bold text-white shadow-2xs transition hover:bg-rose-700 active:scale-95 cursor-pointer"
        >
          <ArrowUpFromLine size={14} />
          <span>+ Tarik Saldo</span>
        </button>
      </div>

      {/* 2. ASSET & SUMMARY KPI CARDS */}
      <WithdrawKpiCards summary={summary} />

      {/* ERROR BANNER IF ANY */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch(false)}
            className="flex items-center gap-1 font-bold text-rose-800 underline hover:no-underline"
          >
            <RotateCcw size={12} />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* 3. 1-LINE HORIZONTAL FILTER BAR */}
      <WithdrawFilterBar
        filters={filters}
        statusCounts={statusCounts}
        isFiltered={isFiltered}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onDateChange={setDateFilter}
        onResetFilters={resetFilters}
      />

      {/* 4. DATA LISTING (EMPTY STATE / TABLE / MOBILE CARDS) */}
      {totalItems === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/90 p-8 sm:p-12 text-center shadow-2xs backdrop-blur-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 shadow-2xs">
            <ArrowUpFromLine size={20} />
          </div>
          <h3 className="mt-3.5 text-sm font-bold text-slate-800">
            {isFiltered
              ? "Tidak ditemukan pengajuan yang sesuai"
              : "Belum ada riwayat penarikan saldo"}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {isFiltered
              ? "Coba ubah kata kunci pencarian, status, atau filter tanggal Anda."
              : "Ajukan penarikan Saldo DaPay ke rekening bank atau e-wallet Anda."}
          </p>
          <div className="mt-4 flex items-center gap-2">
            {isFiltered ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset Filter</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 active:scale-95 cursor-pointer"
              >
                <ArrowUpFromLine size={12} />
                <span>Tarik Saldo Sekarang</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* RESPONSIVE VIEWPORT MATRIX */}
          {/* A. MOBILE (<640px): Mobile Cards */}
          <div className="block sm:hidden">
            <WithdrawMobileCardList
              withdrawals={visibleWithdrawals}
              onSelectWithdrawal={setSelectedWithdrawal}
            />
          </div>

          {/* B. TABLET (640px-1023px): If sidebar expanded -> Card List, If Navigation Rail -> Compact Table */}
          <div className="hidden sm:block lg:hidden">
            {isSidebarExpanded ? (
              <WithdrawMobileCardList
                withdrawals={visibleWithdrawals}
                onSelectWithdrawal={setSelectedWithdrawal}
              />
            ) : (
              <WithdrawDesktopTable
                withdrawals={visibleWithdrawals}
                onSelectWithdrawal={setSelectedWithdrawal}
                onCopy={handleCopy}
              />
            )}
          </div>

          {/* C. DESKTOP (≥1024px): Full Desktop Table */}
          <div className="hidden lg:block">
            <WithdrawDesktopTable
              withdrawals={visibleWithdrawals}
              onSelectWithdrawal={setSelectedWithdrawal}
              onCopy={handleCopy}
            />
          </div>

          {/* 5. PAGINATION */}
          <WithdrawPagination
            page={filters.page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* 6. MODAL PENGAJUAN PENARIKAN (CREATE MODAL) */}
      <WithdrawCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        availableBalance={balance}
        onSuccess={() => {
          void refetch(false);
          setToastMessage("Pengajuan tarik saldo berhasil dibuat!");
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />

      {/* 7. MODAL RINCIAN PENARIKAN (DETAIL MODAL) */}
      <WithdrawDetailModal
        withdrawal={selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
        onCopy={handleCopy}
      />

      {/* TOAST COPIED NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-110 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}