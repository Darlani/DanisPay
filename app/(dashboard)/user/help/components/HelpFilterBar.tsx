"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  Coins,
  Layers,
  Search,
  User,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { CATEGORY_DEFINITIONS, CategoryCounts, HelpCategory } from "../types";

interface HelpFilterBarProps {
  category: HelpCategory;
  onSelectCategory: (category: HelpCategory) => void;
  search: string;
  onSearchChange: (keyword: string) => void;
  categoryCounts: CategoryCounts;
  liveAnnouncement: string;
}

export default function HelpFilterBar({
  category,
  onSelectCategory,
  search,
  onSearchChange,
  categoryCounts,
  liveAnnouncement,
}: HelpFilterBarProps) {
  const getCategoryIcon = (iconName: string, active: boolean) => {
    const size = 14;
    const iconClass = active ? "text-blue-600" : "text-slate-400";

    switch (iconName) {
      case "layers":
        return <Layers size={size} className={iconClass} />;
      case "user":
        return <User size={size} className={iconClass} />;
      case "arrow-left-right":
        return <ArrowLeftRight size={size} className={iconClass} />;
      case "wallet":
        return <Wallet size={size} className={iconClass} />;
      case "coins":
        return <Coins size={size} className={iconClass} />;
      case "users":
        return <UsersRound size={size} className={iconClass} />;
      default:
        return <Layers size={size} className={iconClass} />;
    }
  };

  return (
    <section className="mb-4 sm:mb-5 rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 p-2 sm:p-2.5 md:p-3 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 relative z-30">
      {/* Screen Reader Live Region */}
      <div className="sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </div>

      <div className="flex flex-row items-center gap-2 sm:gap-2.5 md:gap-3">
        {/* 1. SEARCH INPUT */}
        <div className="relative flex-1 min-w-0">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 xs:left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari pertanyaan bantuan..."
            aria-label="Cari pertanyaan atau topik bantuan"
            className="h-10 sm:h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-8.5 xs:pl-10 pr-8 xs:pr-9 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Hapus kata kunci pencarian"
              className="absolute right-2 xs:right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* 2. MOBILE & TABLET VIEWPORT (<1024px): CATEGORY DROPDOWN (1 LINE HORIZONTAL WITH SEARCH) */}
        <div className="block lg:hidden shrink-0">
          <CategoryDropdown
            category={category}
            onSelectCategory={onSelectCategory}
            categoryCounts={categoryCounts}
            getCategoryIcon={getCategoryIcon}
          />
        </div>

        {/* 3. DESKTOP VIEWPORT (≥1024px): FULL HORIZONTAL CATEGORY PILLS */}
        <div
          role="tablist"
          aria-label="Kategori Bantuan"
          className="hidden lg:flex items-center gap-1.5 shrink-0"
        >
          {CATEGORY_DEFINITIONS.map((cat) => {
            const isActive = category === cat.id;
            const count = categoryCounts[cat.id] ?? 0;

            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectCategory(cat.id)}
                className={`group flex shrink-0 items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 whitespace-nowrap ${
                  isActive
                    ? "border border-blue-400/80 bg-blue-50/90 text-blue-900 shadow-2xs ring-1 ring-blue-400/30"
                    : "border border-slate-200/80 bg-slate-50/80 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                {getCategoryIcon(cat.iconName, isActive)}
                <span>{cat.label}</span>
                <span
                  className={`inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200/80 text-slate-600 group-hover:bg-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Tablet Dropdown Component (640px-1023px)
 */
function CategoryDropdown({
  category,
  onSelectCategory,
  categoryCounts,
  getCategoryIcon,
}: {
  category: HelpCategory;
  onSelectCategory: (cat: HelpCategory) => void;
  categoryCounts: CategoryCounts;
  getCategoryIcon: (iconName: string, active: boolean) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeDef =
    CATEGORY_DEFINITIONS.find((c) => c.id === category) || CATEGORY_DEFINITIONS[0];
  const activeCount = categoryCounts[activeDef.id] ?? 0;

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative shrink-0 z-40">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="inline-flex h-10 sm:h-11 items-center justify-between gap-1.5 xs:gap-2 sm:gap-2.5 rounded-xl border border-blue-300/80 bg-blue-50/90 px-2.5 xs:px-3 sm:px-3.5 text-xs sm:text-[13px] font-bold text-blue-950 shadow-2xs transition active:scale-95 hover:bg-blue-100/90 cursor-pointer whitespace-nowrap ring-1 ring-blue-400/20"
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          {getCategoryIcon(activeDef.iconName, true)}
          <span>{activeDef.label}</span>
          <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-black text-white">
            {activeCount}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-blue-700 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-48 xs:w-52 rounded-2xl border border-slate-200/90 bg-white/98 p-1.5 shadow-xl backdrop-blur-md ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-0.5" role="listbox">
            {CATEGORY_DEFINITIONS.map((cat) => {
              const isSelected = category === cat.id;
              const count = categoryCounts[cat.id] ?? 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold transition active:scale-98 cursor-pointer ${
                    isSelected
                      ? "bg-blue-50 text-blue-900 ring-1 ring-blue-200"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(cat.iconName, isSelected)}
                    <span>{cat.label}</span>
                  </div>
                  <span
                    className={`inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

