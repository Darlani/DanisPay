"use client";

import React, { useRef, useState } from "react";
import { CalendarDays, ChevronDown, RotateCcw, Search, X } from "lucide-react";
import {
  AffiliateFilters,
  MEMBER_FILTER_OPTIONS,
  MemberSortOption,
  formatDateOnly,
} from "../types";

interface AffiliateFilterBarProps {
  filters: AffiliateFilters;
  isFiltered: boolean;
  totalItems: number;
  onSearchChange: (value: string) => void;
  onSortChange: (value: MemberSortOption) => void;
  onDateChange: (value: string) => void;
  onResetFilters: () => void;
}

export default function AffiliateFilterBar({
  filters,
  isFiltered,
  onSearchChange,
  onSortChange,
  onDateChange,
  onResetFilters,
}: AffiliateFilterBarProps) {
  const desktopDateInputRef = useRef<HTMLInputElement>(null);
  const mobileDateInputRef = useRef<HTMLInputElement>(null);

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

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
    const input =
      target === "desktop" ? desktopDateInputRef.current : mobileDateInputRef.current;
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
          {/* A. MEMBER FILTER DROPDOWN */}
          <div className="relative flex-1 min-w-0">
            <select
              value={filters.sortBy}
              onChange={(e) => onSortChange(e.target.value as MemberSortOption)}
              aria-label="Filter pengurutan member downline"
              className="h-8.5 w-full appearance-none rounded-xl border border-slate-200/90 bg-slate-50/90 px-2.5 pr-7 text-[11px] font-bold text-slate-700 outline-none transition hover:bg-slate-100/80 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 cursor-pointer truncate"
            >
              {MEMBER_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
            aria-label="Buka Pencarian Member"
            className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border transition active:scale-95 cursor-pointer ${
              filters.search || isMobileSearchOpen
                ? "border-amber-400 bg-amber-50 text-amber-600 shadow-2xs"
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
              aria-label="Filter Tanggal Bergabung"
              className="sr-only"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => handleDateIconClick("mobile")}
              title={
                filters.date
                  ? `Tanggal: ${formatDateOnly(filters.date)} (Klik untuk ubah)`
                  : "Filter Tanggal Bergabung"
              }
              aria-label="Filter Tanggal Bergabung"
              className={`relative flex h-8.5 w-8.5 items-center justify-center rounded-xl border transition active:scale-95 cursor-pointer shadow-2xs ${
                filters.date
                  ? "border-amber-400 bg-amber-50 text-amber-600 font-bold ring-2 ring-amber-500/20"
                  : "border-slate-200/90 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-slate-100/80 hover:text-slate-900"
              }`}
            >
              <CalendarDays size={14} />
              {filters.date && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-600 ring-2 ring-white" />
              )}
            </button>
          </div>

          {/* D. RESET BUTTON */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Reset Filter"
              aria-label="Reset Filter"
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
              placeholder="Cari nama atau email member..."
              aria-label="Cari member downline"
              className="h-8.5 w-full rounded-xl border border-amber-200 bg-amber-50/40 pl-8.5 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                setIsMobileSearchOpen(false);
              }}
              aria-label="Tutup pencarian"
              className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. TABLET & DESKTOP TOOLBAR (>= 640px)                       */}
      {/* ============================================================ */}
      <div className="hidden sm:flex items-center gap-2.5 sm:gap-3">
        {/* A. MEMBER FILTER DROPDOWN */}
        <div className="relative shrink-0 w-44 lg:w-48">
          <select
            value={filters.sortBy}
            onChange={(e) => onSortChange(e.target.value as MemberSortOption)}
            aria-label="Filter pengurutan member downline"
            className="h-9.5 w-full appearance-none rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 pr-8 text-xs font-bold text-slate-700 outline-none transition hover:bg-slate-100/80 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 cursor-pointer truncate"
          >
            {MEMBER_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        {/* B. SEARCH INPUT */}
        <div className="relative min-w-0 flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama atau email member downline..."
            aria-label="Cari member downline"
            className="h-9.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-8.5 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* C. CALENDAR DATE FILTER ICON BUTTON */}
        <div className="relative shrink-0">
          <input
            ref={desktopDateInputRef}
            type="date"
            value={filters.date}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label="Filter Tanggal Bergabung"
            className="sr-only"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => handleDateIconClick("desktop")}
            title={
              filters.date
                ? `Tanggal: ${formatDateOnly(filters.date)} (Klik untuk ubah)`
                : "Filter Tanggal Bergabung"
            }
            aria-label="Filter Tanggal Bergabung"
            className={`relative flex h-9.5 w-9.5 items-center justify-center rounded-xl border transition active:scale-95 cursor-pointer shadow-2xs ${
              filters.date
                ? "border-amber-400 bg-amber-50 text-amber-700 font-bold ring-2 ring-amber-500/20"
                : "border-slate-200/90 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <CalendarDays size={15} />
            {filters.date && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-600 ring-2 ring-white" />
            )}
          </button>
        </div>

        {/* D. RESET BUTTON */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            title="Reset Filter"
            aria-label="Reset Filter"
            className="flex h-9.5 shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 text-xs font-bold text-red-600 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-red-100"
          >
            <RotateCcw size={12} />
            <span className="hidden xs:inline">Reset</span>
          </button>
        )}
      </div>
    </section>
  );
}

