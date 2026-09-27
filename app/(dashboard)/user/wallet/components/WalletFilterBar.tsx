"use client";

import React, { useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Coins,
  RotateCcw,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import { WalletFilters } from "../types";
import { useI18n } from "@/lib/i18n/context";

interface WalletFilterBarProps {
  filters: WalletFilters;
  types: string[];
  onFilterChange: (updates: Partial<WalletFilters>) => void;
  onReset: () => void;
  isSidebarExpanded?: boolean;
  isSandboxMode?: boolean;
}

export default function WalletFilterBar({
  filters,
  types,
  onFilterChange,
  onReset,
  isSidebarExpanded = false,
  isSandboxMode = false,
}: WalletFilterBarProps) {
  const { t } = useI18n();
  const desktopDateInputRef = useRef<HTMLInputElement>(null);
  const mobileDateInputRef = useRef<HTMLInputElement>(null);
  const tabletDateInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const [isTabletSearchOpen, setIsTabletSearchOpen] = useState<boolean>(
    Boolean(filters.search),
  );
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(
    Boolean(filters.search),
  );

  const isFiltered =
    Boolean(filters.search) ||
    filters.asset !== "Semua" ||
    filters.type !== "Semua" ||
    filters.flow !== "Semua" ||
    Boolean(filters.date);

  const handleDateIconClick = (target: "desktop" | "mobile" | "tablet" = "desktop") => {
    let input = desktopDateInputRef.current;
    if (target === "mobile") input = mobileDateInputRef.current;
    if (target === "tablet") input = tabletDateInputRef.current;
    if (!input) return;

    if (
      typeof (input as HTMLInputElement & { showPicker?: () => void }).showPicker ===
      "function"
    ) {
      try {
        (input as HTMLInputElement & { showPicker: () => void }).showPicker();
        return;
      } catch {
        // Fallback
      }
    }
    input.focus();
  };

  const handleToggleTabletSearch = () => {
    setIsTabletSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
      return next;
    });
  };

  const handleToggleMobileSearch = () => {
    setIsMobileSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          mobileSearchInputRef.current?.focus();
        }, 100);
      }
      return next;
    });
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
            <span>{t("dashboard.wallet.tabAll")}</span>
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
            <span>{isSandboxMode ? t("dashboard.wallet.tabVirtualBalance") : t("dashboard.wallet.tabBalance")}</span>
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
            <span>{isSandboxMode ? t("dashboard.wallet.tabSandboxCoin") : t("dashboard.wallet.tabCoin")}</span>
          </button>
        </div>

        {/* TYPE DROPDOWN */}
        <div className="relative shrink-0 min-w-35 max-w-45">
          <select
            value={filters.type}
            onChange={(e) => onFilterChange({ type: e.target.value, page: 1 })}
            aria-label={t("dashboard.wallet.filterTypeAria")}
            className={`h-9 w-full appearance-none rounded-xl border px-3.5 pr-8 text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
              filters.type !== "Semua"
                ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10"
            }`}
          >
            <option value="Semua">{t("dashboard.wallet.typeAll")}</option>
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
            aria-label={t("dashboard.wallet.filterFlowAria")}
            className={`h-9 w-full appearance-none rounded-xl border px-3.5 pr-8 text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
              filters.flow !== "Semua"
                ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10"
            }`}
          >
            <option value="Semua">{t("dashboard.wallet.flowAll")}</option>
            <option value="Masuk">{t("dashboard.wallet.flowIncome")}</option>
            <option value="Keluar">{t("dashboard.wallet.flowExpense")}</option>
          </select>
          <ChevronDown
            size={13}
            className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition ${
              filters.flow !== "Semua" ? "text-blue-600" : "text-slate-400"
            }`}
          />
        </div>

        {/* SEARCH INPUT */}
        <div className="relative flex-1 min-w-50">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            placeholder={t("dashboard.wallet.searchPlaceholder")}
            className="h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10 shadow-2xs"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: "", page: 1 })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
              title={t("dashboard.wallet.clearKeyword")}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* DATE PICKER (ICON ONLY FOR ALL DEVICES — ANCHORED LEFT) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => handleDateIconClick("desktop")}
            aria-label={t("dashboard.wallet.filterDateAria")}
            title={filters.date ? t("dashboard.wallet.dateFilterActive", { date: filters.date }) : t("dashboard.wallet.dateFilterTitle")}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs ${
              filters.date
                ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                : "border-slate-200/90 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-900"
            }`}
          >
            <CalendarDays size={15} />
            {filters.date && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 border border-white"></span>
              </span>
            )}
          </button>
          <input
            ref={desktopDateInputRef}
            type="date"
            value={filters.date}
            onChange={(e) => onFilterChange({ date: e.target.value, page: 1 })}
            className="absolute left-0 top-0 h-full w-full opacity-0 pointer-events-none"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>

        {/* RESET BUTTON */}
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-rose-200/90 bg-rose-50/90 px-3 text-xs font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-100 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs"
            title={t("dashboard.wallet.resetTitle")}
          >
            <RotateCcw size={12} />
            <span>{t("dashboard.wallet.reset")}</span>
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. TABLET (640px-1023px) 1-LINE HORIZONTAL TOOLBAR           */}
      {/* ============================================================ */}
      <div className="hidden sm:block lg:hidden rounded-2xl border border-slate-200/90 bg-white/95 p-2.5 backdrop-blur-md shadow-xs space-y-2">
        {/* 1-LINE HORIZONTAL TOOLBAR */}
        <div className="flex items-center justify-between gap-1.5 md:gap-2">
          {/* ASSET SELECTOR: SEGMENTED TABS (IF RAIL) OR DROPDOWN (IF EXPANDED) */}
          {!isSidebarExpanded ? (
            /* NAVIGATION RAIL: SEGMENTED TABS */
            <div className="inline-flex shrink-0 items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => onFilterChange({ asset: "Semua", page: 1 })}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  filters.asset === "Semua"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <WalletCards size={12} />
                <span>{t("dashboard.wallet.tabAll")}</span>
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ asset: "Saldo", page: 1 })}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  filters.asset === "Saldo"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CircleDollarSign size={12} />
                <span>{isSandboxMode ? t("dashboard.wallet.tabVirtualBalance") : t("dashboard.wallet.tabBalance")}</span>
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ asset: "Koin", page: 1 })}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  filters.asset === "Koin"
                    ? "bg-white text-violet-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Coins size={12} />
                <span>{isSandboxMode ? t("dashboard.wallet.tabSandboxCoin") : t("dashboard.wallet.tabCoin")}</span>
              </button>
            </div>
          ) : (
            /* EXPANDED SIDEBAR: ASSET DROPDOWN */
            <div className="relative flex-1 min-w-0">
              <select
                value={filters.asset}
                onChange={(e) =>
                  onFilterChange({
                    asset: e.target.value as "Semua" | "Saldo" | "Koin",
                    page: 1,
                  })
                }
                aria-label={t("dashboard.wallet.filterAssetAria")}
                className={`h-9 w-full appearance-none rounded-xl border px-3 pr-7 text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                  filters.asset !== "Semua"
                    ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                    : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10"
                }`}
              >
                <option value="Semua">{t("dashboard.wallet.tabAll")}</option>
                <option value="Saldo">{isSandboxMode ? t("dashboard.wallet.tabVirtualBalance") : t("dashboard.wallet.tabBalance")}</option>
                <option value="Koin">{isSandboxMode ? t("dashboard.wallet.tabSandboxCoin") : t("dashboard.wallet.tabCoin")}</option>
              </select>
              <ChevronDown
                size={12}
                className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition ${
                  filters.asset !== "Semua" ? "text-blue-600" : "text-slate-400"
                }`}
              />
            </div>
          )}

          {/* TYPE DROPDOWN */}
          <div className="relative flex-1 min-w-0">
            <select
              value={filters.type}
              onChange={(e) => onFilterChange({ type: e.target.value, page: 1 })}
              aria-label={t("dashboard.wallet.filterTypeAria")}
              className={`h-9 w-full appearance-none rounded-xl border px-3 pr-7 text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                filters.type !== "Semua"
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10"
              }`}
            >
              <option value="Semua">
                {isSidebarExpanded ? t("dashboard.wallet.typeShort") : t("dashboard.wallet.typeAll")}
              </option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition ${
                filters.type !== "Semua" ? "text-blue-600" : "text-slate-400"
              }`}
            />
          </div>

          {/* FLOW DROPDOWN */}
          <div className="relative flex-1 min-w-0">
            <select
              value={filters.flow}
              onChange={(e) =>
                onFilterChange({
                  flow: e.target.value as "Semua" | "Masuk" | "Keluar",
                  page: 1,
                })
              }
              aria-label={t("dashboard.wallet.filterFlowAria")}
              className={`h-9 w-full appearance-none rounded-xl border px-3 pr-7 text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                filters.flow !== "Semua"
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-500/10"
              }`}
            >
              <option value="Semua">
                {isSidebarExpanded ? t("dashboard.wallet.flowShort") : t("dashboard.wallet.flowAll")}
              </option>
              <option value="Masuk">{t("dashboard.wallet.flowIncome")}</option>
              <option value="Keluar">{t("dashboard.wallet.flowExpense")}</option>
            </select>
            <ChevronDown
              size={12}
              className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 transition ${
                filters.flow !== "Semua" ? "text-blue-600" : "text-slate-400"
              }`}
            />
          </div>

          {/* ACTION ICONS: SEARCH TOGGLE, DATE PICKER, RESET */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-100">
            {/* SEARCH ICON TOGGLE BUTTON */}
            <button
              type="button"
              onClick={handleToggleTabletSearch}
              aria-label={t("dashboard.wallet.searchAria")}
              title={isTabletSearchOpen ? t("dashboard.wallet.closeSearch") : t("dashboard.wallet.openSearch")}
              className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs ${
                isTabletSearchOpen || Boolean(filters.search)
                  ? "border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 font-bold"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-900"
              }`}
            >
              <Search size={14} />
              {Boolean(filters.search) && !isTabletSearchOpen && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 border border-white"></span>
                </span>
              )}
            </button>

            {/* DATE PICKER ICON BUTTON (ANCHORED LEFT) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => handleDateIconClick("tablet")}
                aria-label={t("dashboard.wallet.filterDateAria")}
                title={filters.date ? t("dashboard.wallet.dateFilterActive", { date: filters.date }) : t("dashboard.wallet.dateFilterTitle")}
                className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs ${
                  filters.date
                    ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20 font-bold"
                    : "border-slate-200/90 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <CalendarDays size={14} />
                {filters.date && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 border border-white"></span>
                  </span>
                )}
              </button>
              <input
                ref={tabletDateInputRef}
                type="date"
                value={filters.date}
                onChange={(e) => onFilterChange({ date: e.target.value, page: 1 })}
                className="absolute left-0 top-0 h-full w-full opacity-0 pointer-events-none"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            {/* RESET BUTTON */}
            {isFiltered && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-rose-200/90 bg-rose-50/90 px-2.5 text-xs font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-100 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
                title={t("dashboard.wallet.resetTitle")}
              >
                <RotateCcw size={12} />
                <span>{t("dashboard.wallet.reset")}</span>
              </button>
            )}
          </div>
        </div>

        {/* EXPANDABLE SEARCH ROW IN TABLET (SINGLE X) */}
        {isTabletSearchOpen && (
          <div className="relative pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 mt-1"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
              placeholder={t("dashboard.wallet.searchPlaceholder")}
              className="h-9 w-full rounded-xl border border-blue-400 bg-blue-50/30 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFilterChange({ search: "", page: 1 })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer mt-1"
                title={t("dashboard.wallet.clearKeyword")}
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. MOBILE & ULTRA-COMPACT (< 640px) 1-LINE HORIZONTAL BAR     */}
      {/* ============================================================ */}
      <div className="block sm:hidden rounded-2xl border border-slate-200/90 bg-white/95 p-2 xs:p-2.5 backdrop-blur-md shadow-xs space-y-2">
        {/* 1-LINE HORIZONTAL TOOLBAR */}
        <div className="flex items-center justify-between gap-1 xs:gap-1.5">
          {/* 1. ASSET DROPDOWN (NO CHEVRON — MAXIMIZED COLUMN WIDTH) */}
          <div className="relative flex-1 min-w-0">
            <select
              value={filters.asset}
              onChange={(e) =>
                onFilterChange({
                  asset: e.target.value as "Semua" | "Saldo" | "Koin",
                  page: 1,
                })
              }
              aria-label={t("dashboard.wallet.filterAssetAria")}
              className={`h-8.5 xs:h-9 w-full appearance-none rounded-xl border px-1.5 xs:px-2 text-center text-[10.5px] xs:text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                filters.asset !== "Semua"
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
              }`}
            >
              <option value="Semua">{t("dashboard.wallet.tabAll")}</option>
              <option value="Saldo">{isSandboxMode ? t("dashboard.wallet.tabVirtualBalance") : t("dashboard.wallet.tabBalance")}</option>
              <option value="Koin">{isSandboxMode ? t("dashboard.wallet.tabSandboxCoin") : t("dashboard.wallet.tabCoin")}</option>
            </select>
          </div>

          {/* 2. JENIS DROPDOWN (NO CHEVRON — MAXIMIZED COLUMN WIDTH) */}
          <div className="relative flex-1 min-w-0">
            <select
              value={filters.type}
              onChange={(e) => onFilterChange({ type: e.target.value, page: 1 })}
              aria-label={t("dashboard.wallet.filterTypeAria")}
              className={`h-8.5 xs:h-9 w-full appearance-none rounded-xl border px-1.5 xs:px-2 text-center text-[10.5px] xs:text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                filters.type !== "Semua"
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
              }`}
            >
              <option value="Semua">{t("dashboard.wallet.typeShort")}</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* 3. ARUS DROPDOWN (NO CHEVRON — MAXIMIZED COLUMN WIDTH) */}
          <div className="relative flex-1 min-w-0">
            <select
              value={filters.flow}
              onChange={(e) =>
                onFilterChange({
                  flow: e.target.value as "Semua" | "Masuk" | "Keluar",
                  page: 1,
                })
              }
              aria-label={t("dashboard.wallet.filterFlowAria")}
              className={`h-8.5 xs:h-9 w-full appearance-none rounded-xl border px-1.5 xs:px-2 text-center text-[10.5px] xs:text-xs font-bold outline-none transition-all duration-200 cursor-pointer truncate shadow-2xs ${
                filters.flow !== "Semua"
                  ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
              }`}
            >
              <option value="Semua">{t("dashboard.wallet.flowShort")}</option>
              <option value="Masuk">{t("dashboard.wallet.flowIncome")}</option>
              <option value="Keluar">{t("dashboard.wallet.flowExpense")}</option>
            </select>
          </div>

          {/* ACTION ICONS: 4. PENCARIAN, 5. CALENDER, 6. RESET */}
          <div className="flex items-center gap-1 xs:gap-1.5 shrink-0 pl-1 border-l border-slate-100">
            {/* SEARCH ICON TOGGLE BUTTON */}
            <button
              type="button"
              onClick={handleToggleMobileSearch}
              aria-label={t("dashboard.wallet.searchAria")}
              title={isMobileSearchOpen ? t("dashboard.wallet.closeSearch") : t("dashboard.wallet.openSearch")}
              className={`relative inline-flex h-8.5 w-8.5 xs:h-9 xs:w-9 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs ${
                isMobileSearchOpen || Boolean(filters.search)
                  ? "border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 font-bold"
                  : "border-slate-200/90 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Search size={13} />
              {Boolean(filters.search) && !isMobileSearchOpen && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 border border-white"></span>
                </span>
              )}
            </button>

            {/* DATE PICKER ICON BUTTON (ANCHORED LEFT) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => handleDateIconClick("mobile")}
                aria-label={t("dashboard.wallet.filterDateAria")}
                title={filters.date ? t("dashboard.wallet.dateFilterActive", { date: filters.date }) : t("dashboard.wallet.dateFilterTitle")}
                className={`relative inline-flex h-8.5 w-8.5 xs:h-9 xs:w-9 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs ${
                  filters.date
                    ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 ring-2 ring-blue-500/20 font-bold"
                    : "border-slate-200/90 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <CalendarDays size={13} />
                {filters.date && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 border border-white"></span>
                  </span>
                )}
              </button>
              <input
                ref={mobileDateInputRef}
                type="date"
                value={filters.date}
                onChange={(e) => onFilterChange({ date: e.target.value, page: 1 })}
                className="absolute left-0 top-0 h-full w-full opacity-0 pointer-events-none"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            {/* RESET BUTTON */}
            {isFiltered && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex h-8.5 xs:h-9 shrink-0 items-center gap-1 rounded-xl border border-rose-200/90 bg-rose-50/90 px-2 text-[10.5px] xs:text-xs font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-100 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
                title={t("dashboard.wallet.resetTitle")}
              >
                <RotateCcw size={11} />
                <span>{t("dashboard.wallet.reset")}</span>
              </button>
            )}
          </div>
        </div>

        {/* EXPANDABLE SEARCH ROW IN MOBILE (SINGLE X) */}
        {isMobileSearchOpen && (
          <div className="relative pt-1.5 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 mt-0.5"
            />
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
              placeholder={t("dashboard.wallet.searchPlaceholderMobile")}
              className="h-8.5 xs:h-9 w-full rounded-xl border border-blue-400 bg-blue-50/30 pl-8 pr-7 text-[11px] xs:text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFilterChange({ search: "", page: 1 })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer mt-0.5"
                title={t("dashboard.wallet.clearKeyword")}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
