"use client";

import React, { useMemo } from "react";
import { ChevronDown, CircleHelp, FileQuestion } from "lucide-react";
import { FAQItem, getCategoryBadgeClasses, HelpCategory } from "../types";

interface HelpFaqAccordionProps {
  faqItems: FAQItem[];
  openFaqId: string | null;
  onToggleFaq: (id: string) => void;
  onShowAll: () => void;
  category: HelpCategory;
  search: string;
  showAllInOverview: boolean;
  onToggleShowAllInOverview: (show: boolean) => void;
  minHeight?: number;
}

export default function HelpFaqAccordion({
  faqItems,
  openFaqId,
  onToggleFaq,
  onShowAll,
  category,
  search,
  showAllInOverview,
  onToggleShowAllInOverview,
  minHeight,
}: HelpFaqAccordionProps) {
  const isAllCategoryNoSearch = category === "all" && !search.trim();

  // If in "all" category without search and not yet expanded, show 1 representative per category
  const displayedItems = useMemo(() => {
    if (isAllCategoryNoSearch && !showAllInOverview) {
      const representatives: FAQItem[] = [];
      const categories: Exclude<HelpCategory, "all">[] = [
        "account",
        "transaction",
        "balance",
        "coin",
        "referral",
      ];
      for (const cat of categories) {
        const found = faqItems.find((item) => item.category === cat);
        if (found) {
          representatives.push(found);
        }
      }
      return representatives;
    }
    return faqItems;
  }, [faqItems, isAllCategoryNoSearch, showAllInOverview]);

  return (
    <div
      id="faq-accordion-section"
      style={minHeight ? { minHeight: `${minHeight}px` } : undefined}
      className="flex flex-col justify-between rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white/95 p-3.5 xs:p-4 sm:p-5 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 min-w-0 self-start"
    >
      <div>
        {/* Header with count badge */}
        <div className="mb-3.5 pb-3 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CircleHelp size={15} />
            </div>
            <h2 className="text-sm xs:text-base font-black tracking-tight text-slate-900">
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>

          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
            {isAllCategoryNoSearch && !showAllInOverview
              ? `${displayedItems.length} dari ${faqItems.length} pertanyaan`
              : `${displayedItems.length} pertanyaan`}
          </span>
        </div>

        {/* FAQ LIST OR EMPTY STATE */}
        {displayedItems.length === 0 ? (
          <div className="py-10 text-center px-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-2.5">
              <FileQuestion size={22} />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              Tidak menemukan jawaban yang sesuai
            </h3>
            <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
              Tidak ada FAQ yang cocok dengan pencarian &quot;{search}&quot;. Coba gunakan kata kunci lain atau tampilkan semua.
            </p>
            <button
              type="button"
              onClick={onShowAll}
              className="mt-3.5 inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-2xs transition active:scale-95 hover:bg-blue-500 cursor-pointer"
            >
              Tampilkan Semua FAQ
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedItems.map((item) => {
              const isOpen = openFaqId === item.id;
              const badge = getCategoryBadgeClasses(item.category);

              return (
                <div key={item.id} className="py-1 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => onToggleFaq(item.id)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${item.id}`}
                    className="flex w-full items-center justify-between gap-2.5 py-2.5 text-left transition hover:bg-slate-50/80 rounded-xl px-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Category Pill Badge */}
                      <span
                        className={`inline-flex shrink-0 items-center rounded-md border ${badge.badgeBorder} ${badge.badgeBg} ${badge.badgeText} px-2 py-0.5 text-[9.5px] font-bold`}
                      >
                        {badge.label}
                      </span>

                      {/* Question Text */}
                      <span className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug line-clamp-2">
                        {item.question}
                      </span>
                    </div>

                    <ChevronDown
                      size={15}
                      className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-blue-600" : ""
                      }`}
                    />
                  </button>

                  {/* Accordion Panel */}
                  {isOpen && (
                    <div
                      id={`faq-answer-${item.id}`}
                      role="region"
                      className="mt-1 mb-2 rounded-xl border border-blue-100/90 bg-blue-50/50 p-3 sm:p-3.5 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer "Lihat semua FAQ" Action (Hanya untuk Kategori "Semua") */}
      {isAllCategoryNoSearch && !showAllInOverview && faqItems.length > displayedItems.length && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => onToggleShowAllInOverview(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2 text-xs font-bold text-blue-700 shadow-2xs transition active:scale-95 hover:bg-blue-100 cursor-pointer"
          >
            <span>Lihat semua FAQ ({faqItems.length})</span>
            <span>↓</span>
          </button>
        </div>
      )}

      {isAllCategoryNoSearch && showAllInOverview && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => onToggleShowAllInOverview(false)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition hover:underline cursor-pointer"
          >
            <span>Tampilkan FAQ ringkas</span>
            <span>↑</span>
          </button>
        </div>
      )}
    </div>
  );
}
