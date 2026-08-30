"use client";

import React, { useRef } from "react";
import { CalendarDays, ChevronDown, RotateCcw, Search, X } from "lucide-react";
import { STATUS_OPTIONS, WithdrawalFilters, WithdrawalStatusCounts } from "../types";

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
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDateIconClick = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === "function") {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <div className="rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/90 p-3 sm:p-4 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
      {/* 1-LINE HORIZONTAL FILTER BAR */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* 1. SEARCH INPUT */}
        <div className="relative min-w-40 flex-1 sm:min-w-48 sm:max-w-xs md:max-w-sm">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari bank, rekening, atau nominal..."
            aria-label="Cari transaksi penarikan saldo"
            className="h-9 sm:h-9.5 w-full rounded-xl border border-slate-200/90 bg-white/95 pl-8.5 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
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

        {/* 2. STATUS DROPDOWN */}
        <div className="relative shrink-0">
          <select
            value={filters.status}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter status penarikan"
            className="h-9 sm:h-9.5 appearance-none rounded-xl border border-slate-200/90 bg-white/95 pl-3 pr-8 text-xs font-bold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({statusCounts[opt.countKey]})
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        {/* 3. DATE PICKER (ICON ONLY WITH ACTIVE INDICATOR) */}
        <div className="relative shrink-0">
          <input
            ref={dateInputRef}
            type="date"
            value={filters.date}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label="Pilih tanggal transaksi"
            className="sr-only"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={handleDateIconClick}
            title={filters.date ? `Tanggal: ${filters.date}` : "Filter Tanggal"}
            aria-label={filters.date ? `Tanggal terpilih ${filters.date}` : "Filter Tanggal"}
            className={`relative flex h-9 w-9 sm:h-9.5 sm:w-9.5 items-center justify-center rounded-xl border transition active:scale-95 cursor-pointer ${
              filters.date
                ? "border-rose-400 bg-rose-50/80 text-rose-600 shadow-2xs"
                : "border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <CalendarDays size={15} />
            {filters.date && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-600 ring-2 ring-white" />
            )}
          </button>
        </div>

        {/* 4. RESET BUTTON */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            title="Reset Filter"
            aria-label="Reset Filter"
            className="inline-flex h-9 sm:h-9.5 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 text-xs font-bold text-slate-600 shadow-2xs transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span className="hidden xs:inline">Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}

