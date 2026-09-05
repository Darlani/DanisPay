"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  PlusCircle,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import {
  Deposit,
  DepositInstruction,
  DepositPaymentMethod,
} from "./types";
import { useDepositFilters } from "./hooks/useDepositFilters";
import { useDepositData } from "./hooks/useDepositData";
import { DepositService } from "./services/depositService";
import DepositKpiCards from "./components/DepositKpiCards";
import DepositFilterBar from "./components/DepositFilterBar";
import DepositDesktopTable from "./components/DepositDesktopTable";
import DepositMobileCardList from "./components/DepositMobileCardList";
import DepositPagination from "./components/DepositPagination";
import DepositCreateModal from "./components/DepositCreateModal";
import DepositInstructionModal from "./components/DepositInstructionModal";
import DepositDetailModal from "./components/DepositDetailModal";

interface DepositViewUserProps {
  initialBalance?: number | string | null;
  initialCoinBalance?: number | string | null;
  initialDeposits?: Deposit[];
  isSidebarExpanded?: boolean;
  onRefresh?: () => void | Promise<void>;
}

export default function DepositViewUser({
  initialBalance = 0,
  initialCoinBalance = 0,
  initialDeposits = [],
  isSidebarExpanded = false,
  onRefresh,
}: DepositViewUserProps) {
  // 1. FILTERS HOOK
  const {
    filters,
    debouncedSearch,
    setSearch,
    setStatus,
    setPaymentMethod,
    setDate,
    setPage,
    resetFilters,
    isFiltered,
  } = useDepositFilters();

  // 2. DATA HOOK (SWR: Instant-first initial render + silent background revalidation)
  const {
    visibleDeposits,
    totalPages,
    totalItems,
    paymentOptions,
    summary,
    statusCounts,
    revalidate,
  } = useDepositData({
    initialBalance,
    initialCoinBalance,
    initialDeposits,
    filters,
    debouncedSearch,
  });

  // 3. MODAL STATES
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<DepositPaymentMethod[]>(
    [],
  );
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  const [activeInstruction, setActiveInstruction] =
    useState<DepositInstruction | null>(null);
  const [isProcessingInstruction, setIsProcessingInstruction] =
    useState(false);

  const [selectedDetailDeposit, setSelectedDetailDeposit] =
    useState<Deposit | null>(null);

  // 4. TOAST NOTIFICATION
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        showToast(`${label} berhasil disalin!`);
      } catch {
        showToast(`Gagal menyalin ${label}.`);
      }
    },
    [showToast],
  );

  // 5. CREATE DEPOSIT FLOW
  const handleOpenCreateModal = useCallback(async () => {
    setShowCreateModal(true);
    setIsLoadingMethods(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/login";
        return;
      }

      const methods = await DepositService.fetchPaymentMethods(
        session.access_token,
      );
      setPaymentMethods(methods);
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Gagal memuat metode pembayaran deposit.",
      );
    } finally {
      setIsLoadingMethods(false);
    }
  }, [showToast]);

  const handleSubmitDeposit = useCallback(
    async (amount: string, paymentMethodKey: string) => {
      setIsSubmittingDeposit(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          window.location.href = "/login";
          return;
        }

        const instruction = await DepositService.createDeposit(
          session.access_token,
          amount,
          paymentMethodKey,
        );

        setShowCreateModal(false);
        setActiveInstruction(instruction);

        // If QRIS method, load QR payload
        if (instruction.payment.isQr) {
          try {
            const qrisString = await DepositService.fetchDepositQris(
              session.access_token,
              instruction.depositId,
            );
            setActiveInstruction((prev) =>
              prev ? { ...prev, qrisString } : prev,
            );
          } catch (qrisErr) {
            console.error("Gagal memuat QRIS payload:", qrisErr);
          }
        }

        // Revalidate shared dashboard data via Root
        if (onRefresh) {
          void onRefresh();
        } else {
          void revalidate(false);
        }
        showToast("Permintaan deposit berhasil dibuat!");
      } catch (err) {
        showToast(
          err instanceof Error
            ? err.message
            : "Gagal memproses permintaan deposit.",
        );
      } finally {
        setIsSubmittingDeposit(false);
      }
    },
    [onRefresh, revalidate, showToast],
  );

  // 6. RESUME PAYMENT / INSTRUCTION FOR PENDING DEPOSIT
  const handleOpenInstructionForDeposit = useCallback(
    async (deposit: Deposit) => {
      setIsProcessingInstruction(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          window.location.href = "/login";
          return;
        }

        // Load payment methods to construct instruction
        const methods = await DepositService.fetchPaymentMethods(
          session.access_token,
        );
        const method =
          methods.find(
            (m) =>
              m.methodKey === deposit.payment_channel ||
              m.name.toLowerCase() === deposit.payment_method?.toLowerCase(),
          ) || {
            methodKey: deposit.payment_channel || "transfer",
            name: deposit.payment_method || "Transfer Bank",
            accountName: "DaPay Payment",
            accountNo: "-",
            logoUrl: null,
            isQr: deposit.payment_channel === "qris",
            minPrice: null,
          };

        const instruction: DepositInstruction = {
          depositId: deposit.id,
          amount: String(deposit.amount || 0),
          uniqueCode: Number(deposit.unique_code || 0),
          totalAmount: String(deposit.total_amount || deposit.amount || 0),
          payment: method,
          adminContact: null,
          qrisString: null,
        };

        setActiveInstruction(instruction);

        if (method.isQr) {
          try {
            const qrisString = await DepositService.fetchDepositQris(
              session.access_token,
              deposit.id,
            );
            setActiveInstruction((prev) =>
              prev ? { ...prev, qrisString } : prev,
            );
          } catch (qrisErr) {
            console.error("Gagal memuat QRIS:", qrisErr);
          }
        }
      } catch (err) {
        showToast(
          err instanceof Error
            ? err.message
            : "Gagal memuat instruksi pembayaran.",
        );
      } finally {
        setIsProcessingInstruction(false);
      }
    },
    [showToast],
  );

  const handleRetryQris = useCallback(async () => {
    if (!activeInstruction) return;
    setIsProcessingInstruction(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/login";
        return;
      }

      const qrisString = await DepositService.fetchDepositQris(
        session.access_token,
        activeInstruction.depositId,
      );

      setActiveInstruction((prev) => (prev ? { ...prev, qrisString } : prev));
      showToast("QRIS berhasil dimuat ulang!");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal memuat ulang QRIS.",
      );
    } finally {
      setIsProcessingInstruction(false);
    }
  }, [activeInstruction, showToast]);

  return (
    <section className="w-full relative">
      {/* ============================================================ */}
      {/* 1. TOP ACTION BAR (ISI SALDO QUICK ACTION BUTTON)            */}
      {/* ============================================================ */}
      <div className="mb-3 sm:mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={handleOpenCreateModal}
          aria-label="Isi Saldo DaPay"
          className="inline-flex h-8 xs:h-8.5 sm:h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 sm:px-4 text-xs font-bold text-white shadow-2xs transition active:scale-95 cursor-pointer hover:bg-blue-700 hover:shadow-xs"
        >
          <PlusCircle size={14} />
          <span>Isi Saldo</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 2. KPI SUMMARY CARDS                                         */}
      {/* ============================================================ */}
      <DepositKpiCards
        summary={summary}
      />

      {/* ============================================================ */}
      {/* 3. FILTER TOOLBAR (1-LINE CONSISTENT)                        */}
      {/* ============================================================ */}
      <DepositFilterBar
        filters={filters}
        statusCounts={statusCounts}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onPaymentMethodChange={setPaymentMethod}
        onDateChange={setDate}
        onReset={resetFilters}
        isFiltered={isFiltered}
        paymentOptions={paymentOptions}
        isSidebarExpanded={isSidebarExpanded}
      />

      {/* ============================================================ */}
      {/* 4. TRANSACTION CONTENT: DESKTOP TABLE / MOBILE CARDS         */}
      {/* ============================================================ */}
      {visibleDeposits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-white/60 p-8 sm:p-12 text-center backdrop-blur-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100 shadow-2xs">
            <ArrowDownToLine size={22} />
          </div>
          <p className="text-sm font-bold text-slate-800">
            {isFiltered
              ? "Tidak ditemukan deposit yang sesuai dengan filter."
              : "Belum ada riwayat deposit."}
          </p>
          <p className="mt-1 max-w-sm text-xs text-slate-400 font-medium">
            {isFiltered
              ? "Coba ubah kata kunci pencarian atau reset filter untuk menampilkan data lainnya."
              : "Setiap permintaan deposit yang Anda buat akan tercatat rapi di sini."}
          </p>

          <div className="mt-4 flex items-center gap-2">
            {isFiltered ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-8.5 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-2xs hover:bg-blue-600 transition active:scale-95 cursor-pointer"
              >
                Reset Filter
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition active:scale-95 cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>Mulai Deposit</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* A. MOBILE CARDS (< 640px) */}
          <div className="block sm:hidden">
            <DepositMobileCardList
              deposits={visibleDeposits}
              onSelectDeposit={setSelectedDetailDeposit}
              onOpenInstruction={handleOpenInstructionForDeposit}
              onCopy={handleCopy}
            />
          </div>

          {/* B. TABLET ADAPTIVE (640px - 1023px) */}
          <div className="hidden sm:block lg:hidden">
            {!isSidebarExpanded ? (
              <DepositDesktopTable
                deposits={visibleDeposits}
                onSelectDeposit={setSelectedDetailDeposit}
                onOpenInstruction={handleOpenInstructionForDeposit}
                onCopy={handleCopy}
              />
            ) : (
              <DepositMobileCardList
                deposits={visibleDeposits}
                onSelectDeposit={setSelectedDetailDeposit}
                onOpenInstruction={handleOpenInstructionForDeposit}
                onCopy={handleCopy}
              />
            )}
          </div>

          {/* C. DESKTOP FULL TABLE (>= 1024px) */}
          <div className="hidden lg:block">
            <DepositDesktopTable
              deposits={visibleDeposits}
              onSelectDeposit={setSelectedDetailDeposit}
              onOpenInstruction={handleOpenInstructionForDeposit}
              onCopy={handleCopy}
            />
          </div>

          {/* 5. PAGINATION */}
          <DepositPagination
            page={filters.page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={filters.limit}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPage={setPage}
          />
        </>
      )}

      {/* ============================================================ */}
      {/* 6. MODALS                                                    */}
      {/* ============================================================ */}

      {/* CREATE MODAL */}
      <DepositCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSubmitDeposit}
        paymentMethods={paymentMethods}
        isLoadingMethods={isLoadingMethods}
        isSubmitting={isSubmittingDeposit}
      />

      {/* INSTRUCTION MODAL */}
      <DepositInstructionModal
        instruction={activeInstruction}
        onClose={() => setActiveInstruction(null)}
        onRefreshData={async () => {
          void revalidate(true);
          showToast("Data saldo berhasil diperbarui!");
        }}
        onRetryQris={handleRetryQris}
        isProcessing={isProcessingInstruction}
        onCopy={handleCopy}
      />

      {/* DETAIL MODAL */}
      <DepositDetailModal
        deposit={selectedDetailDeposit}
        onClose={() => setSelectedDetailDeposit(null)}
        onOpenInstruction={handleOpenInstructionForDeposit}
        onCopy={handleCopy}
      />

      {/* ============================================================ */}
      {/* 7. FLOATING TOAST NOTIFICATION                               */}
      {/* ============================================================ */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-150 flex items-center gap-2 rounded-2xl border border-slate-900/90 bg-slate-900/95 px-4 py-2.5 text-xs font-bold text-white shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </section>
  );
}