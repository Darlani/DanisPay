"use client";

import React, { useRef, useState } from "react";
import { CalendarDays, ChevronDown, RotateCcw, Search, X } from "lucide-react";
import { STATUS_OPTIONS, WithdrawalFilters, WithdrawalStatusCounts } from "../types";
import { useI18n } from "@/lib/i18n/context";

interface WithdrawFilterBarProps {
  filters: WithdrawalFilters;
  statusCounts: WithdrawalStatusCounts;
  isFiltered: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onResetFilters: () => void;
}

export default function WithdrawFilterBar({
  filters,
  statusCounts,
  isFiltered,
  onSearchChange,
  onStatusChange,
  onDateChange,
  onResetFilters,
}: WithdrawFilterBarProps) {
  const { t } = useI18n();
  const desktopDateInputRef = useRef<HTMLInputElement>(null);
  const mobileDateInputRef = useRef<HTMLInputElement>(null);

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const getStatusOptionLabel = (value: string, defaultLabel: string) => {
    switch (value) {
      case "Semua":
        return t("dashboard.withdraw.statusAll");
      case "Pending":
        return t("dashboard.withdraw.statusPending");
      case "Berhasil":
        return t("dashboard.withdraw.statusSuccess");
      case "Gagal":
        return t("dashboard.withdraw.statusFailed");
      case "Dibatalkan":
        return t("dashboard.withdraw.statusCancelled");
      default:
        return defaultLabel;
    }
  };

  const handleToggleMobileSearch = () => {
    const nextState = !isMobileSearchOpen;
    setIsMobileSearchOpen(nextState);
    if (nextState) {
      setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleDateIconClick = (target: "desktop" | "mobile") => {
    const input = target === "desktop" ? desktopDateInputRef.current : mobileDateInputRef.current;
    if (input) {
      if (typeof input.showPicker === "function") {
        input.showPicker();
      } else {
        input.focus();
      }
    }
  };

  return (
    <section className="mb-4 sm:mb-5 rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 p-2 xs:p-2.5 sm:p-3 md:p-3.5 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
      {/* ============================================================ */}
      {/* 1. MOBILE & ULTRA-COMPACT TOOLBAR (< 640px)                  */}
      {/* ============================================================ */}
      <div className="block sm:hidden">
        <div className="flex items-center justify-between gap-1.5 xs:gap-2">
          {/* A. STATUS FILTER DROPDOWN */}
          <div className="relative flex-1 min-w-0">
            <select
              value={filters.status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label={t("dashboard.withdraw.statusAria")}
              className="h-8.5 w-full appearance-none rounded-xl border border-slate-200/90 bg-slate-50/90 px-2.5 pr-7 text-[11px] font-bold text-slate-700 outline-none transition hover:bg-slate-100/80 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 cursor-pointer truncate"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {getStatusOptionLabel(opt.value, opt.label)} ({statusCounts[opt.countKey]})
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          {/* B. SEARCH TOGGLE ICON BUTTON */}
          <button
            type="button"
            onClick={handleToggleMobileSearch}
            aria-label={t("dashboard.withdraw.searchToggleAria")}
            className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border transition active:scale-95 cursor-pointer ${
              filters.search || isMobileSearchOpen
                ? "border-rose-400 bg-rose-50 text-rose-600 shadow-2xs"
                : "border-slate-200/90 bg-slate-50/90 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Search size={14} />
          </button>

          {/* C. CALENDAR DATE FILTER ICON BUTTON */}
          <div className="relative shrink-0">
            <input
              ref={mobileDateInputRef}
              type="date"
              value={filters.date}
              onChange={(e) => onDateChange(e.target.value)}
              aria-label={t("dashboard.withdraw.dateSelectAria")}
              className="sr-only"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => handleDateIconClick("mobile")}
              title={filters.date ? t("dashboard.withdraw.dateActiveTitle", { date: filters.date }) : t("dashboard.withdraw.dateAria")}
              aria-label={filters.date ? t("dashboard.withdraw.dateSelectedAria", { date: filters.date }) : t("dashboard.withdraw.dateAria")}
              className={`relative flex h-8.5 w-8.5 items-center justify-center rounded-xl border transition active:scale-95 cursor-pointer shadow-2xs ${
                filters.date
                  ? "border-rose-400 bg-rose-50 text-rose-600 font-bold ring-2 ring-rose-500/20"
                  : "border-slate-200/90 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-slate-100/80 hover:text-slate-900"
              }`}
            >
              <CalendarDays size={14} />
              {filters.date && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-600 ring-2 ring-white" />
              )}
            </button>
          </div>

          {/* D. RESET BUTTON */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              title={t("dashboard.withdraw.resetAria")}
              aria-label={t("dashboard.withdraw.resetAria")}
              className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-red-100"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>

        {/* EXPANDABLE MOBILE SEARCH POPUP ROW */}
        {isMobileSearchOpen && (
          <div className="relative mt-2 flex items-center animate-in fade-in slide-in-from-top-1 duration-150">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 text-slate-400"
            />
            <input
              ref={mobileSearchInputRef}
              type="search"
              value={filters.search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("dashboard.withdraw.searchPlaceholder")}
              aria-label={t("dashboard.withdraw.searchAria")}
              className="h-8.5 w-full rounded-xl border border-rose-200 bg-rose-50/40 pl-8.5 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                setIsMobileSearchOpen(false);
              }}
              aria-label={t("dashboard.withdraw.closeSearchAria")}
              className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. TABLET & DESKTOP TOOLBAR (>= 640px) [LOCKED]              */}
      {/* ============================================================ */}
      <div className="hidden sm:flex items-center gap-2 sm:gap-2.5">
        {/* A. SEMUA STATUS DROPDOWN */}
        <div className="relative shrink-0 min-w-36 sm:min-w-40">
          <select
            value={filters.status}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label={t("dashboard.withdraw.statusAria")}
            className="h-9.5 w-full appearance-none rounded-xl border border-slate-200/90 bg-slate-50/90 pl-3 pr-8 text-xs font-bold text-slate-700 outline-none transition hover:bg-slate-100/80 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 cursor-pointer truncate"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {getStatusOptionLabel(opt.value, opt.label)} ({statusCounts[opt.countKey]})
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        {/* B. PENCARIAN (SEARCH INPUT) */}
        <div className="relative min-w-0 flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("dashboard.withdraw.searchPlaceholder")}
            aria-label={t("dashboard.withdraw.searchAria")}
            className="h-9.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-8.5 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label={t("dashboard.withdraw.clearSearchAria")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* C. CALENDER (ICON BUTTON WITH ACTIVE INDICATOR) */}
        <div className="relative shrink-0">
          <input
            ref={desktopDateInputRef}
            type="date"
            value={filters.date}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label={t("dashboard.withdraw.dateSelectAria")}
            className="sr-only"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => handleDateIconClick("desktop")}
            title={filters.date ? t("dashboard.withdraw.dateActiveTitle", { date: filters.date }) : t("dashboard.withdraw.dateAria")}
            aria-label={filters.date ? t("dashboard.withdraw.dateSelectedAria", { date: filters.date }) : t("dashboard.withdraw.dateAria")}
            className={`relative flex h-9.5 w-9.5 items-center justify-center rounded-xl border transition active:scale-95 cursor-pointer shadow-2xs ${
              filters.date
                ? "border-rose-400 bg-rose-50 text-rose-600 font-bold ring-2 ring-rose-500/20"
                : "border-slate-200/90 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <CalendarDays size={15} />
            {filters.date && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
            )}
          </button>
        </div>

        {/* D. RESET BUTTON */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            title={t("dashboard.withdraw.resetAria")}
            aria-label={t("dashboard.withdraw.resetAria")}
            className="flex h-9.5 shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 text-xs font-bold text-red-600 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-red-100"
          >
            <RotateCcw size={12} />
            <span className="hidden xs:inline">{t("dashboard.withdraw.resetBtn")}</span>
          </button>
        )}
      </div>
    </section>
  );
}
