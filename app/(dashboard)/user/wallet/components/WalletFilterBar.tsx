"use client";

import React, { useRef } from "react";
import {
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Coins,
  RotateCcw,
  Search,
  WalletCards,
} from "lucide-react";
import { WalletFilters } from "../types";

interface WalletFilterBarProps {
  filters: WalletFilters;
  types: string[];
  onFilterChange: (updates: Partial<WalletFilters>) => void;
  onReset: () => void;
  isSidebarExpanded?: boolean;
}

export default function WalletFilterBar({
  filters,
  types,
  onFilterChange,
  onReset,
  isSidebarExpanded = false,
}: WalletFilterBarProps) {
  const desktopDateInputRef = useRef<HTMLInputElement>(null);
  const mobileDateInputRef = useRef<HTMLInputElement>(null);

  const isFiltered =
    Boolean(filters.search) ||
    filters.asset !== "Semua" ||
    filters.type !== "Semua" ||
    filters.flow !== "Semua" ||
    Boolean(filters.date);

  const handleDateIconClick = (isMobile = false) => {
    const input = isMobile ? mobileDateInputRef.current : desktopDateInputRef.current;
    if (!input) return;

    if (typeof (input as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
      try {
        (input as HTMLInputElement & { showPicker: () => void }).showPicker();
        return;
      } catch {
        // Fallback
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
        {/* ASSET SEGMENTED TABS */}
        <div className="inline-flex shrink-0 items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => onFilterChange({ asset: "Semua", page: 1 })}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filters.asset === "Semua"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <WalletCards size={13} />
            <span>Semua</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ asset: "Saldo", page: 1 })}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filters.asset === "Saldo"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CircleDollarSign size={13} />
            <span>Saldo</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ asset: "Koin", page: 1 })}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filters.asset === "Koin"
                ? "bg-white text-violet-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Coins size={13} />
            <span>Koin</span>
          </button>
        </div>

        {/* SEARCH INPUT */}
        <div className="relative flex-1 min-w-50">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            placeholder="Cari deskripsi, ID, atau tipe mutasi..."
            className="h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-9 pr-3.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
          />
        </div>

        {/* TYPE DROPDOWN */}
        <div className="relative shrink-0 min-w-35 max-w-45">
          <select
            value={filters.type}
            onChange={(e) => onFilterChange({ type: e.target.value, page: 1 })}
            aria-label="Filter Jenis Transaksi"
            className={`h-9 w-full appearance-none rounded-xl border px-3.5 pr-8 text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
              filters.type !== "Semua"
                ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10"
            }`}
          >
            <option value="Semua">Semua Jenis</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition ${
              filters.type !== "Semua" ? "text-blue-600" : "text-slate-400"
            }`}
          />
        </div>

        {/* FLOW DROPDOWN (Masuk / Keluar) */}
        <div className="relative shrink-0 min-w-31.25 max-w-38.75">
          <select
            value={filters.flow}
            onChange={(e) => onFilterChange({ flow: e.target.value as "Semua" | "Masuk" | "Keluar", page: 1 })}
            aria-label="Filter Arus Mutasi"
            className={`h-9 w-full appearance-none rounded-xl border px-3.5 pr-8 text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
              filters.flow !== "Semua"
                ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10"
            }`}
          >
            <option value="Semua">Semua Arus</option>
            <option value="Masuk">Masuk</option>
            <option value="Keluar">Keluar</option>
          </select>
          <ChevronDown
            size={13}
            className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition ${
              filters.flow !== "Semua" ? "text-blue-600" : "text-slate-400"
            }`}
          />
        </div>

        {/* DATE PICKER */}
        <div className="relative shrink-0">
          <input
            ref={desktopDateInputRef}
            type="date"
            value={filters.date}
            onChange={(e) => onFilterChange({ date: e.target.value, page: 1 })}
            aria-label="Filter Tanggal"
            className={`h-9 rounded-xl border px-3 text-xs font-bold outline-none transition-all duration-200 cursor-pointer shadow-2xs ${
              filters.date
                ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white"
            }`}
          />
        </div>

        {/* RESET BUTTON */}
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-rose-200/90 bg-rose-50/90 px-3 text-xs font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-100 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs"
            title="Reset Filter"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. MOBILE (<640px) & TABLET (640px-1023px) MULTI-TIER BAR   */}
      {/* ============================================================ */}
      <div className="flex lg:hidden flex-col gap-2 p-2.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        {/* ROW 1: ASSET SEGMENTED TABS */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => onFilterChange({ asset: "Semua", page: 1 })}
            className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
              filters.asset === "Semua"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <WalletCards size={12} />
            <span>Semua</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ asset: "Saldo", page: 1 })}
            className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
              filters.asset === "Saldo"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CircleDollarSign size={12} />
            <span>Saldo</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ asset: "Koin", page: 1 })}
            className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
              filters.asset === "Koin"
                ? "bg-white text-violet-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Coins size={12} />
            <span>Koin</span>
          </button>
        </div>

        {/* ROW 2: SEARCH + DATE + RESET */}
        <div className="flex items-center gap-1.5 xs:gap-2">
          <div className="relative flex-1 min-w-0">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 xs:left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
              placeholder="Cari mutasi..."
              className="h-8.5 xs:h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-7.5 xs:pl-8.5 pr-2.5 text-[11px] xs:text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white shadow-2xs"
            />
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => handleDateIconClick(true)}
              aria-label="Pilih Tanggal"
              className={`inline-flex h-8.5 w-8.5 xs:h-9 xs:w-9 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs ${
                filters.date
                  ? "border-blue-400 bg-blue-50 text-blue-600 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
              }`}
              title={filters.date ? `Tanggal: ${filters.date}` : "Filter Tanggal"}
            >
              <CalendarDays size={14} />
            </button>
            <input
              ref={mobileDateInputRef}
              type="date"
              value={filters.date}
              onChange={(e) => onFilterChange({ date: e.target.value, page: 1 })}
              className="sr-only"
              tabIndex={-1}
            />
          </div>

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

        {/* ROW 3: 2-COLUMN GRID (JENIS & ARUS) */}
        <div className="grid grid-cols-2 gap-1.5 xs:gap-2 sm:gap-2.5 w-full pt-1.5 border-t border-slate-100/80">
          {/* JENIS DROPDOWN */}
          <div className="relative w-full min-w-0">
            <select
              value={filters.type}
              onChange={(e) => onFilterChange({ type: e.target.value, page: 1 })}
              aria-label="Filter Jenis Transaksi"
              className={`h-8 xs:h-8.5 w-full appearance-none rounded-xl border px-2.5 xs:px-3 pr-6 xs:pr-7 text-[10px] xs:text-[11px] sm:text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                filters.type !== "Semua"
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
              }`}
            >
              <option value="Semua">
                {isSidebarExpanded ? "Jenis" : "Semua Jenis"}
              </option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown
              size={11}
              className={`pointer-events-none absolute right-2 xs:right-2.5 top-1/2 -translate-y-1/2 transition ${
                filters.type !== "Semua" ? "text-blue-600" : "text-slate-400"
              }`}
            />
          </div>

          {/* ARUS DROPDOWN */}
          <div className="relative w-full min-w-0">
            <select
              value={filters.flow}
              onChange={(e) => onFilterChange({ flow: e.target.value as "Semua" | "Masuk" | "Keluar", page: 1 })}
              aria-label="Filter Arus Mutasi"
              className={`h-8 xs:h-8.5 w-full appearance-none rounded-xl border px-2.5 xs:px-3 pr-6 xs:pr-7 text-[10px] xs:text-[11px] sm:text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                filters.flow !== "Semua"
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
              }`}
            >
              <option value="Semua">
                {isSidebarExpanded ? "Arus" : "Semua Arus"}
              </option>
              <option value="Masuk">Masuk</option>
              <option value="Keluar">Keluar</option>
            </select>
            <ChevronDown
              size={11}
              className={`pointer-events-none absolute right-2 xs:right-2.5 top-1/2 -translate-y-1/2 transition ${
                filters.flow !== "Semua" ? "text-blue-600" : "text-slate-400"
              }`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
