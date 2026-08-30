"use client";

import React, { useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  DepositFilters,
  DepositStatusCounts,
  formatDateOnly,
  STATUS_OPTIONS,
} from "../types";

interface DepositFilterBarProps {
  filters: DepositFilters;
  statusCounts: DepositStatusCounts;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
  onPaymentMethodChange: (paymentMethod: string) => void;
  onDateChange: (date: string) => void;
  onReset: () => void;
  isFiltered: boolean;
  paymentOptions: string[];
  isSidebarExpanded?: boolean;
}

export default function DepositFilterBar({
  filters,
  statusCounts,
  onSearchChange,
  onStatusChange,
  onPaymentMethodChange,
  onDateChange,
  onReset,
  isFiltered,
  paymentOptions,
  isSidebarExpanded = false,
}: DepositFilterBarProps) {
  const desktopDateInputRef = useRef<HTMLInputElement>(null);
  const tabletDateInputRef = useRef<HTMLInputElement>(null);
  const mobileDateInputRef = useRef<HTMLInputElement>(null);

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const [isTabletSearchOpen, setIsTabletSearchOpen] = useState(false);
  const tabletSearchInputRef = useRef<HTMLInputElement>(null);

  const handleToggleMobileSearch = () => {
    const nextState = !isMobileSearchOpen;
    setIsMobileSearchOpen(nextState);
    if (nextState) {
      setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleToggleTabletSearch = () => {
    const nextState = !isTabletSearchOpen;
    setIsTabletSearchOpen(nextState);
    if (nextState) {
      setTimeout(() => {
        tabletSearchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleDateIconClick = (target: "desktop" | "tablet" | "mobile") => {
    let input: HTMLInputElement | null = null;
    if (target === "desktop") input = desktopDateInputRef.current;
    else if (target === "tablet") input = tabletDateInputRef.current;
    else input = mobileDateInputRef.current;

    if (!input) return;

    if (
      typeof (input as HTMLInputElement & { showPicker?: () => void })
        .showPicker === "function"
    ) {
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
    <section className="mb-4 sm:mb-5 rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 p-2 xs:p-2.5 sm:p-3 md:p-3.5 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
      {/* ============================================================ */}
      {/* 1. MOBILE TOOLBAR (< 640px)                                  */}
      {/* ============================================================ */}
      <div className="block sm:hidden">
        <div className="flex items-center justify-between gap-1 xs:gap-1.5">
          {/* A. STATUS FILTER DROPDOWN */}
          <div className="relative flex-[1.15] min-w-0">
            <select
              value={filters.status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter Status Deposit"
              className="h-8 xs:h-8.5 w-full appearance-none rounded-lg xs:rounded-xl border border-slate-200/90 bg-slate-50/90 px-1.5 xs:px-2 text-center text-[10.5px] xs:text-xs font-bold text-slate-700 outline-hidden transition hover:bg-slate-100/80 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 cursor-pointer truncate"
            >
              {STATUS_OPTIONS.map((opt) => {
                const count = statusCounts[opt.countKey] ?? 0;
                return (
                  <option key={opt.key} value={opt.key}>
                    {opt.key === "Semua"
                      ? `Semua Status (${count})`
                      : `${opt.label} (${count})`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* B. METODE PEMBAYARAN DROPDOWN */}
          <div className="relative flex-1 min-w-0">
            <select
              value={filters.paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              aria-label="Filter Metode Pembayaran"
              className="h-8 xs:h-8.5 w-full appearance-none rounded-lg xs:rounded-xl border border-slate-200/90 bg-slate-50/90 px-1.5 xs:px-2 text-center text-[10.5px] xs:text-xs font-bold text-slate-700 outline-hidden transition hover:bg-slate-100/80 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 cursor-pointer truncate"
            >
              <option value="Semua">Semua Metode</option>
              {paymentOptions.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {/* C. SEARCH TOGGLE BUTTON */}
          <button
            type="button"
            onClick={handleToggleMobileSearch}
            aria-label="Buka Pencarian Deposit"
            className={`flex h-8 w-8 xs:h-8.5 xs:w-8.5 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border transition active:scale-95 cursor-pointer ${
              filters.search || isMobileSearchOpen
                ? "border-blue-300 bg-blue-50 text-blue-600 shadow-2xs"
                : "border-slate-200/90 bg-slate-50/90 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Search size={14} />
          </button>

          {/* D. CALENDAR DATE FILTER ICON BUTTON */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => handleDateIconClick("mobile")}
              className={`relative flex h-8 w-8 xs:h-8.5 xs:w-8.5 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border transition active:scale-95 cursor-pointer ${
                filters.date
                  ? "border-blue-400 bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/90 text-slate-600 hover:bg-slate-100"
              }`}
              title={
                filters.date
                  ? `Tanggal: ${formatDateOnly(filters.date)} (Klik untuk ubah)`
                  : "Filter Tanggal Deposit"
              }
              aria-label="Filter Tanggal Deposit"
            >
              <CalendarDays size={14} />
              {filters.date && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
              )}
            </button>
            <input
              ref={mobileDateInputRef}
              type="date"
              value={filters.date}
              onChange={(e) => onDateChange(e.target.value)}
              className="absolute left-0 top-0 h-full w-full opacity-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          {/* E. RESET BUTTON */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              title="Reset Semua Filter"
              aria-label="Reset Semua Filter"
              className="flex h-8 w-8 xs:h-8.5 xs:w-8.5 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-red-200 bg-red-50 text-red-600 transition active:scale-95 cursor-pointer hover:bg-red-100"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>

        {/* EXPANDABLE MOBILE SEARCH ROW */}
        {isMobileSearchOpen && (
          <div className="relative mt-2 flex items-center">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 text-slate-400"
            />
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={filters.search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari ID, metode, atau nominal..."
              className="h-8.5 w-full rounded-xl border border-blue-200 bg-blue-50/40 pl-8.5 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-hidden transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                setIsMobileSearchOpen(false);
              }}
              className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. TABLET TOOLBAR (640px - 1023px)                           */}
      {/* ============================================================ */}
      <div className="hidden sm:block lg:hidden">
        <div className="flex items-center justify-between gap-1.5 md:gap-2">
          {/* A. STATUS FILTER DROPDOWN */}
          <div
            className={`relative min-w-0 ${
              !isSidebarExpanded ? "flex-[1.2]" : "flex-[1.25]"
            }`}
          >
            <select
              value={filters.status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter Status Deposit"
              className={`h-9 w-full appearance-none rounded-xl border border-slate-200/90 bg-slate-50/90 text-xs font-bold text-slate-700 outline-hidden transition hover:bg-slate-100/80 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 cursor-pointer truncate ${
                !isSidebarExpanded ? "px-2.5 pr-7 text-left" : "px-2 text-center"
              }`}
            >
              {STATUS_OPTIONS.map((opt) => {
                const count = statusCounts[opt.countKey] ?? 0;
                return (
                  <option key={opt.key} value={opt.key}>
                    {!isSidebarExpanded
                      ? opt.key === "Semua"
                        ? `Semua Status (${count})`
                        : `${opt.label} (${count})`
                      : opt.key === "Semua"
                        ? `Status (${count})`
                        : `${opt.label} (${count})`}
                  </option>
                );
              })}
            </select>
            {!isSidebarExpanded && (
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            )}
          </div>

          {/* B. METODE PEMBAYARAN DROPDOWN */}
          <div
            className={`relative min-w-0 ${
              !isSidebarExpanded ? "flex-[1.15]" : "flex-[1.2]"
            }`}
          >
            <select
              value={filters.paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              aria-label="Filter Metode Pembayaran"
              className={`h-9 w-full appearance-none rounded-xl border border-slate-200/90 bg-slate-50/90 text-xs font-bold text-slate-700 outline-hidden transition hover:bg-slate-100/80 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 cursor-pointer truncate ${
                !isSidebarExpanded ? "px-2.5 pr-7 text-left" : "px-2 text-center"
              }`}
            >
              <option value="Semua">
                {!isSidebarExpanded ? "Semua Metode" : "Metode"}
              </option>
              {paymentOptions.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            {!isSidebarExpanded && (
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            )}
          </div>

          {/* C. SEARCH TOGGLE BUTTON */}
          <button
            type="button"
            onClick={handleToggleTabletSearch}
            aria-label="Buka Pencarian Deposit"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition active:scale-95 cursor-pointer ${
              filters.search || isTabletSearchOpen
                ? "border-blue-300 bg-blue-50 text-blue-600 shadow-2xs"
                : "border-slate-200/90 bg-slate-50/90 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Search size={15} />
          </button>

          {/* D. CALENDAR DATE FILTER ICON BUTTON */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => handleDateIconClick("tablet")}
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition active:scale-95 cursor-pointer ${
                filters.date
                  ? "border-blue-400 bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/90 text-slate-600 hover:bg-slate-100"
              }`}
              title={
                filters.date
                  ? `Tanggal: ${formatDateOnly(filters.date)} (Klik untuk ubah)`
                  : "Filter Tanggal Deposit"
              }
              aria-label="Filter Tanggal Deposit"
            >
              <CalendarDays size={15} />
              {filters.date && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
              )}
            </button>
            <input
              ref={tabletDateInputRef}
              type="date"
              value={filters.date}
              onChange={(e) => onDateChange(e.target.value)}
              className="absolute left-0 top-0 h-full w-full opacity-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          {/* E. RESET BUTTON */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              title="Reset Filter"
              aria-label="Reset Filter"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition active:scale-95 cursor-pointer hover:bg-red-100"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {/* EXPANDABLE TABLET SEARCH ROW */}
        {isTabletSearchOpen && (
          <div className="relative mt-2 flex items-center">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 text-slate-400"
            />
            <input
              ref={tabletSearchInputRef}
              type="text"
              value={filters.search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari deposit ID, metode pembayaran, atau nominal transfer..."
              className="h-9 w-full rounded-xl border border-blue-200 bg-blue-50/40 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-hidden transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                setIsTabletSearchOpen(false);
              }}
              className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. DESKTOP TOOLBAR (>= 1024px)                               */}
      {/* ============================================================ */}
      <div className="hidden lg:flex items-center justify-between gap-3">
        {/* A. SEARCH INPUT */}
        <div className="relative flex-1 max-w-sm min-w-0">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari deposit ID, metode, nominal..."
            className="h-9.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-9.5 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-hidden transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-4.5 w-4.5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* RIGHT DROPDOWNS & ACTIONS */}
        <div className="flex items-center gap-2 shrink-0">
          {/* B. STATUS DROPDOWN */}
          <div className="relative min-w-36">
            <select
              value={filters.status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter Status Deposit"
              className="h-9.5 w-full appearance-none rounded-xl border border-slate-200/90 bg-slate-50/80 pl-3 pr-7 text-xs font-bold text-slate-700 outline-hidden transition hover:bg-slate-100/80 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => {
                const count = statusCounts[opt.countKey] ?? 0;
                return (
                  <option key={opt.key} value={opt.key}>
                    {opt.key === "Semua"
                      ? `Semua Status (${count})`
                      : `${opt.label} (${count})`}
                  </option>
                );
              })}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          {/* C. METODE DROPDOWN */}
          <div className="relative min-w-36">
            <select
              value={filters.paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              aria-label="Filter Metode Pembayaran"
              className="h-9.5 w-full appearance-none rounded-xl border border-slate-200/90 bg-slate-50/80 pl-3 pr-7 text-xs font-bold text-slate-700 outline-hidden transition hover:bg-slate-100/80 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="Semua">Semua Metode</option>
              {paymentOptions.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          {/* D. CALENDAR DATE FILTER ICON BUTTON */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => handleDateIconClick("desktop")}
              className={`relative inline-flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs ${
                filters.date
                  ? "border-blue-400 bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-500/20"
                  : "border-slate-200/90 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-slate-100/80 hover:text-slate-900"
              }`}
              title={
                filters.date
                  ? `Tanggal: ${formatDateOnly(filters.date)} (Klik untuk ubah)`
                  : "Filter Tanggal Deposit"
              }
              aria-label="Filter Tanggal Deposit"
            >
              <CalendarDays size={15} />
              {filters.date && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
              )}
            </button>

            {/* Hidden Date Input Trigger (Anchored Left) */}
            <input
              ref={desktopDateInputRef}
              type="date"
              value={filters.date}
              onChange={(e) => onDateChange(e.target.value)}
              className="absolute left-0 top-0 h-full w-full opacity-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          {/* E. RESET BUTTON */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              title="Reset Semua Filter"
              aria-label="Reset Semua Filter"
              className="flex h-9.5 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 text-xs font-bold text-red-600 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-red-100"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
