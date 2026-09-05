"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  RotateCcw,
  UsersRound,
} from "lucide-react";
import { BalanceLog, Profile, Referral } from "./types";
import { useAffiliateData } from "./hooks/useAffiliateData";
import { useAffiliateFilters } from "./hooks/useAffiliateFilters";
import AffiliateReferralBanner from "./components/AffiliateReferralBanner";
import AffiliateKpiCards from "./components/AffiliateKpiCards";
import AffiliateRecentCommission from "./components/AffiliateRecentCommission";
import AffiliateFilterBar from "./components/AffiliateFilterBar";
import AffiliateDesktopTable from "./components/AffiliateDesktopTable";
import AffiliateMobileCardList from "./components/AffiliateMobileCardList";
import AffiliatePagination from "./components/AffiliatePagination";
import AffiliateDetailModal from "./components/AffiliateDetailModal";

interface AffiliateViewUserProps {
  initialProfile?: Profile;
  initialReferrals?: Referral[];
  initialBalanceLogs?: BalanceLog[];
  isSidebarExpanded?: boolean;
  onRefresh?: () => void | Promise<void>;
}

export default function AffiliateViewUser({
  initialProfile = {},
  initialReferrals = [],
  initialBalanceLogs = [],
  isSidebarExpanded = false,
  onRefresh,
}: AffiliateViewUserProps) {
  // SWR DATA HOOK
  const {
    profile,
    referrals,
    recentCommissions,
    summary,
    referralLink,
    error,
    refetch,
  } = useAffiliateData({
    initialProfile,
    initialReferrals,
    initialBalanceLogs,
  });

  // FILTERS & PAGINATION HOOK
  const {
    filters,
    setSearch,
    setDate,
    setSortBy,
    setPage,
    resetFilters,
    visibleReferrals,
    totalItems,
    totalPages,
    isFiltered,
    pageSize,
  } = useAffiliateFilters(referrals);

  // MODAL STATES
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
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
    <section className="w-full relative">
      {/* 1. REFERRAL HERO BANNER (LINK & KODE REFERRAL) */}
      <AffiliateReferralBanner
        referralLink={referralLink}
        referralCode={profile.referral_code}
        onCopy={handleCopy}
      />

      {/* 2. ASSET & KPI SUMMARY CARDS */}
      <AffiliateKpiCards summary={summary} />

      {/* 3. ERROR BANNER IF ANY */}
      {error && (
        <div className="mb-4 sm:mb-5 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onRefresh) {
                void onRefresh();
              } else {
                void refetch(false);
              }
            }}
            className="flex items-center gap-1 font-bold text-rose-800 underline hover:no-underline cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* 4. RECENT COMMISSION FEED */}
      <AffiliateRecentCommission commissions={recentCommissions} />

      {/* 5. 1-LINE HORIZONTAL FILTER BAR */}
      <AffiliateFilterBar
        filters={filters}
        isFiltered={isFiltered}
        totalItems={totalItems}
        onSearchChange={setSearch}
        onSortChange={setSortBy}
        onDateChange={setDate}
        onResetFilters={resetFilters}
      />

      {/* 6. DOWNLINE MEMBER LISTING (EMPTY STATE / TABLE / MOBILE CARDS) */}
      {totalItems === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/90 p-8 sm:p-12 text-center shadow-2xs backdrop-blur-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 shadow-2xs">
            <UsersRound size={20} />
          </div>
          <h3 className="mt-3.5 text-sm font-bold text-slate-800">
            {isFiltered
              ? "Tidak ditemukan member yang sesuai"
              : "Belum ada member yang bergabung"}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {isFiltered
              ? "Coba ubah kata kunci pencarian atau reset filter tanggal Anda."
              : "Bagikan link referral Anda untuk mulai membangun jaringan member downline."}
          </p>
          {isFiltered && (
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset Filter</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* A. MOBILE (<640px): Mobile Cards */}
          <div className="block sm:hidden">
            <AffiliateMobileCardList
              referrals={visibleReferrals}
              onSelectReferral={setSelectedReferral}
            />
          </div>

          {/* B. TABLET (640px-1023px): 3-Kolom saat Sidebar Terbuka, 4-Kolom saat Navigation Rail */}
          <div className="hidden sm:block lg:hidden">
            <AffiliateDesktopTable
              referrals={visibleReferrals}
              onSelectReferral={setSelectedReferral}
              isSidebarExpanded={isSidebarExpanded}
            />
          </div>

          {/* C. DESKTOP (≥1024px): Full 5-Column Table */}
          <div className="hidden lg:block">
            <AffiliateDesktopTable
              referrals={visibleReferrals}
              onSelectReferral={setSelectedReferral}
              isSidebarExpanded={false}
            />
          </div>

          {/* 7. PAGINATION */}
          <AffiliatePagination
            page={filters.page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* 8. MODAL DETAIL MEMBER (DETAIL MODAL) */}
      <AffiliateDetailModal
        referral={selectedReferral}
        onClose={() => setSelectedReferral(null)}
        onCopy={handleCopy}
      />

      {/* TOAST COPIED NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-110 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </section>
  );
}