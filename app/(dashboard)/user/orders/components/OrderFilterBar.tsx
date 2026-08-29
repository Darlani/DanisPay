"use client";

import React, { useRef } from "react";
import {
  CalendarDays,
  ChevronDown,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  OrderFilters,
  SortOption,
  StatusCounts,
  formatDateOnly,
} from "../types";

interface OrderFilterBarProps {
  filters: OrderFilters;
  categories: string[];
  statusCounts?: StatusCounts;
  onFilterChange: (updates: Partial<OrderFilters>) => void;
  onReset: () => void;
  isSidebarExpanded?: boolean;
}

const STATUS_CONFIG: {
  key: string;
  label: string;
  countKey: keyof StatusCounts;
}[] = [
  { key: "Semua", label: "Semua Status", countKey: "semua" },
  { key: "Pending", label: "Pending", countKey: "pending" },
  { key: "Expired", label: "Expired", countKey: "expired" },
  { key: "Proses", label: "Proses", countKey: "proses" },
  { key: "Berhasil", label: "Berhasil", countKey: "berhasil" },
  { key: "Gagal", label: "Gagal", countKey: "gagal" },
];

const PAYMENT_OPTIONS = [
  { value: "Semua", label: "Semua Metode" },
  { value: "Saldo", label: "Saldo DaPay" },
  { value: "Koin", label: "Koin DaPay" },
  { value: "mixed", label: "Saldo + Koin" },
  { value: "QRIS", label: "QRIS" },
  { value: "DANA", label: "DANA" },
  { value: "GOPAY", label: "GoPay" },
  { value: "OVO", label: "OVO" },
  { value: "SHOPEEPAY", label: "ShopeePay" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "highest_amount", label: "Nominal Tertinggi" },
  { value: "lowest_amount", label: "Nominal Terendah" },
];

export default function OrderFilterBar({
  filters,
  categories,
  statusCounts,
  onFilterChange,
  onReset,
  isSidebarExpanded = false,
}: OrderFilterBarProps) {
  const desktopDateInputRef = useRef<HTMLInputElement>(null);
  const mobileDateInputRef = useRef<HTMLInputElement>(null);

  const isFiltered =
    Boolean(filters.search) ||
    filters.status !== "Semua" ||
    filters.category !== "Semua" ||
    filters.paymentMethod !== "Semua" ||
    filters.sort !== "newest" ||
    Boolean(filters.date);

  const counts: StatusCounts = statusCounts || {
    semua: 0,
    pending: 0,
    expired: 0,
    proses: 0,
    berhasil: 0,
    gagal: 0,
  };

  const handleDateIconClick = (isMobile = false) => {
    const input = isMobile ? mobileDateInputRef.current : desktopDateInputRef.current;
    if (!input) return;

    if (typeof (input as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
      try {
        (input as HTMLInputElement & { showPicker: () => void }).showPicker();
        return;
      } catch {
        // Fallback to focus
      }
    }
    input.focus();
  };

  return (
    <section className="mb-3.5 sm:mb-5 space-y-2">
      {/* ============================================================ */}
      {/* 1. DESKTOP / LAPTOP (>= 1024px) — LOCKED 1-LINE TOOLBAR     */}
      {/* ============================================================ */}
      <div className="hidden lg:flex items-center gap-2 p-2.5 rounded-2xl md:rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
        {/* 1. STATUS DROPDOWN (WITH COUNTS) */}
        <div className="relative shrink-0 min-w-35 max-w-46.25">
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value, page: 1 })}
            aria-label="Filter Status"
            className={`h-9 w-full appearance-none rounded-xl border px-3.5 pr-8 text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
              filters.status !== "Semua"
                ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10"
            }`}
          >
            {STATUS_CONFIG.map((st) => {
              const countVal = counts[st.countKey] ?? 0;
              return (
                <option key={st.key} value={st.key}>
                  {st.label} ({countVal})
                </option>
              );
            })}
          </select>
          <ChevronDown
            size={13}
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition ${
              filters.status !== "Semua" ? "text-blue-600" : "text-slate-400"
            }`}
          />
        </div>

        {/* 2. CATEGORY DROPDOWN */}
        <div className="relative shrink-0 min-w-33.75 max-w-43.75">
          <select
            value={filters.category}
            onChange={(e) => onFilterChange({ category: e.target.value, page: 1 })}
            aria-label="Filter Kategori"
            className={`h-9 w-full appearance-none rounded-xl border px-3.5 pr-8 text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
              filters.category !== "Semua"
                ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10"
            }`}
          >
            <option value="Semua">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition ${
              filters.category !== "Semua" ? "text-blue-600" : "text-slate-400"
            }`}
          />
        </div>

        {/* 3. PAYMENT METHOD DROPDOWN */}
        <div className="relative shrink-0 min-w-32.5 max-w-41.25">
          <select
            value={filters.paymentMethod}
            onChange={(e) => onFilterChange({ paymentMethod: e.target.value, page: 1 })}
            aria-label="Filter Pembayaran"
            className={`h-9 w-full appearance-none rounded-xl border px-3.5 pr-8 text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
              filters.paymentMethod !== "Semua"
                ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10"
            }`}
          >
            {PAYMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition ${
              filters.paymentMethod !== "Semua" ? "text-blue-600" : "text-slate-400"
            }`}
          />
        </div>

        {/* 4. SORT DROPDOWN */}
        <div className="relative shrink-0 min-w-30 max-w-37.5">
          <select
            value={filters.sort}
            onChange={(e) => onFilterChange({ sort: e.target.value as SortOption, page: 1 })}
            aria-label="Urutan Transaksi"
            className={`h-9 w-full appearance-none rounded-xl border px-3.5 pr-8 text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
              filters.sort !== "newest"
                ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10"
            }`}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <SlidersHorizontal
            size={13}
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition ${
              filters.sort !== "newest" ? "text-blue-600" : "text-slate-400"
            }`}
          />
        </div>

        {/* 5. FULL-WIDTH EXPANDING SEARCH INPUT */}
        <div className="relative flex-1 min-w-45">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            placeholder="Cari Order ID, Produk, Pelanggan..."
            className="h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-8.5 pr-8 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: "", page: 1 })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Hapus kata kunci"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* RIGHT SECTION: CALENDAR DATE BUTTON & RESET BUTTON */}
        <div className="flex items-center gap-2 shrink-0 pl-1.5 border-l border-slate-100">
          {/* CALENDAR DATE FILTER ICON BUTTON */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => handleDateIconClick(false)}
              className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs ${
                filters.date
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 font-bold ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
              }`}
              title={
                filters.date
                  ? `Tanggal: ${formatDateOnly(filters.date)} (Klik untuk ubah)`
                  : "Filter Tanggal Transaksi"
              }
              aria-label="Filter Tanggal"
            >
              <CalendarDays size={15} />
              {filters.date && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
              )}
            </button>

            {/* Hidden Date Input Trigger */}
            <input
              ref={desktopDateInputRef}
              type="date"
              value={filters.date}
              onChange={(e) => onFilterChange({ date: e.target.value, page: 1 })}
              className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          {/* RESET BUTTON */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-rose-200/90 bg-rose-50/90 px-3 text-xs font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-100 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
              title="Reset Semua Filter"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. TABLET, MOBILE, ULTRA-COMPACT (< 1024px)                  */}
      {/* ============================================================ */}
      <div className="block lg:hidden space-y-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 xs:p-2.5 backdrop-blur-md shadow-xs">
        {/* ROW 1: FULL WIDTH SEARCH INPUT + CALENDAR + RESET */}
        <div className="flex items-center gap-1.5 xs:gap-2">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 xs:left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
              placeholder="Cari transaksi..."
              className="h-8.5 xs:h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-7.5 xs:pl-8.5 pr-7 xs:pr-8 text-[11px] xs:text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFilterChange({ search: "", page: 1 })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                aria-label="Hapus kata kunci"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* CALENDAR DATE BUTTON */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => handleDateIconClick(true)}
              className={`relative inline-flex h-8.5 w-8.5 xs:h-9 xs:w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs ${
                filters.date
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 font-bold ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
              }`}
              title={
                filters.date
                  ? `Tanggal: ${formatDateOnly(filters.date)} (Klik untuk ubah)`
                  : "Filter Tanggal Transaksi"
              }
              aria-label="Filter Tanggal"
            >
              <CalendarDays size={14} />
              {filters.date && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
              )}
            </button>

            {/* Hidden Mobile Date Input */}
            <input
              ref={mobileDateInputRef}
              type="date"
              value={filters.date}
              onChange={(e) => onFilterChange({ date: e.target.value, page: 1 })}
              className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          {/* RESET BUTTON */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-8.5 xs:h-9 shrink-0 items-center gap-1 rounded-xl border border-rose-200/90 bg-rose-50/90 px-2 xs:px-2.5 text-[10.5px] xs:text-xs font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-100 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
              title="Reset Semua Filter"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* ROW 2: 2x2 PROPORTIONAL GRID ON MOBILE (<640px) / 1x4 FULL-WIDTH GRID ON TABLET (640px-1023px) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 xs:gap-2 sm:gap-2.5 w-full pt-1.5 border-t border-slate-100/80">
          {/* 1. Status Dropdown */}
          <div className="relative w-full min-w-0">
            <select
              value={filters.status}
              onChange={(e) => onFilterChange({ status: e.target.value, page: 1 })}
              aria-label="Filter Status"
              className={`h-8 xs:h-8.5 w-full appearance-none rounded-xl border px-2.5 xs:px-3 pr-6 xs:pr-7 text-[10px] xs:text-[11px] sm:text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                filters.status !== "Semua"
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
              }`}
            >
              {STATUS_CONFIG.map((st) => {
                const countVal = counts[st.countKey] ?? 0;
                const labelText =
                  st.key === "Semua" && isSidebarExpanded
                    ? `Status (${countVal})`
                    : `${st.label} (${countVal})`;
                return (
                  <option key={st.key} value={st.key}>
                    {labelText}
                  </option>
                );
              })}
            </select>
            <ChevronDown
              size={11}
              className={`pointer-events-none absolute right-2 xs:right-2.5 top-1/2 -translate-y-1/2 transition ${
                filters.status !== "Semua" ? "text-blue-600" : "text-slate-400"
              }`}
            />
          </div>

          {/* 2. Kategori Dropdown (Hidden on mobile <640px, visible on tablet sm:) */}
          <div className="relative hidden sm:block w-full min-w-0">
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ category: e.target.value, page: 1 })}
              aria-label="Filter Kategori"
              className={`h-8 xs:h-8.5 w-full appearance-none rounded-xl border px-2.5 xs:px-3 pr-6 xs:pr-7 text-[10px] xs:text-[11px] sm:text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                filters.category !== "Semua"
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
              }`}
            >
              <option value="Semua">
                {isSidebarExpanded ? "Kategori" : "Semua Kategori"}
              </option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown
              size={11}
              className={`pointer-events-none absolute right-2 xs:right-2.5 top-1/2 -translate-y-1/2 transition ${
                filters.category !== "Semua" ? "text-blue-600" : "text-slate-400"
              }`}
            />
          </div>

          {/* 3. Pembayaran Dropdown (Hidden on mobile <640px, visible on tablet sm:) */}
          <div className="relative hidden sm:block w-full min-w-0">
            <select
              value={filters.paymentMethod}
              onChange={(e) => onFilterChange({ paymentMethod: e.target.value, page: 1 })}
              aria-label="Filter Pembayaran"
              className={`h-8 xs:h-8.5 w-full appearance-none rounded-xl border px-2.5 xs:px-3 pr-6 xs:pr-7 text-[10px] xs:text-[11px] sm:text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                filters.paymentMethod !== "Semua"
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
              }`}
            >
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value === "Semua" && isSidebarExpanded ? "Metode" : opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={11}
              className={`pointer-events-none absolute right-2 xs:right-2.5 top-1/2 -translate-y-1/2 transition ${
                filters.paymentMethod !== "Semua" ? "text-blue-600" : "text-slate-400"
              }`}
            />
          </div>

          {/* 4. Urutan Dropdown */}
          <div className="relative w-full min-w-0">
            <select
              value={filters.sort}
              onChange={(e) => onFilterChange({ sort: e.target.value as SortOption, page: 1 })}
              aria-label="Urutan Transaksi"
              className={`h-8 xs:h-8.5 w-full appearance-none rounded-xl border px-2.5 xs:px-3 pr-6 xs:pr-7 text-[10px] xs:text-[11px] sm:text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                filters.sort !== "newest"
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
              }`}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <SlidersHorizontal
              size={11}
              className={`pointer-events-none absolute right-2 xs:right-2.5 top-1/2 -translate-y-1/2 transition ${
                filters.sort !== "newest" ? "text-blue-600" : "text-slate-400"
              }`}
            />
          </div>
        </div>
      </div>

      {/* ACTIVE DATE BADGE (IF DATE FILTER IS ACTIVE) */}
      {filters.date && (
        <div className="flex items-center gap-2 px-1">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] xs:text-[11px] font-bold text-blue-700 shadow-2xs">
            <CalendarDays size={11} />
            <span>Tanggal: {formatDateOnly(filters.date)}</span>
            <button
              type="button"
              onClick={() => onFilterChange({ date: "", page: 1 })}
              className="ml-1 text-blue-500 hover:text-blue-800 cursor-pointer"
              title="Hapus filter tanggal"
            >
              <X size={11} />
            </button>
          </span>
        </div>
      )}
    </section>
  );
}
