"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import HelpAssetGuideCards from "./components/HelpAssetGuideCards";
import HelpContactSupportCard from "./components/HelpContactSupportCard";
import HelpFaqAccordion from "./components/HelpFaqAccordion";
import HelpFilterBar from "./components/HelpFilterBar";
import HelpQuickCards from "./components/HelpQuickCards";
import { useHelpSearch } from "./hooks/useHelpSearch";

interface HelpViewUserProps {
  isSidebarExpanded?: boolean;
}

export default function HelpViewUser({
  isSidebarExpanded,
}: HelpViewUserProps) {
  void isSidebarExpanded;

  const supportCardRef = useRef<HTMLDivElement>(null);
  const [supportCardHeight, setSupportCardHeight] = useState<number | undefined>(undefined);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      setIsDesktop(window.innerWidth >= 1024);
      if (supportCardRef.current) {
        setSupportCardHeight(supportCardRef.current.offsetHeight);
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && supportCardRef.current) {
      observer = new ResizeObserver(() => {
        if (supportCardRef.current) {
          setSupportCardHeight(supportCardRef.current.offsetHeight);
        }
      });
      observer.observe(supportCardRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateDimensions);
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  const {
    category,
    search,
    setSearch,
    openFaqId,
    toggleFaq,
    showAllInOverview,
    setShowAllInOverview,
    categoryCounts,
    filteredFaq,
    liveAnnouncement,
    isWhatsappAvailable,
    copied,
    toastMessage,
    dismissToast,
    resetFilters,
    selectCategory,
    copyTemplateMessage,
    openWhatsApp,
  } = useHelpSearch();

  const isRingkas = category === "all" && !search.trim() && !showAllInOverview;

  return (
    <section className="w-full relative">
      {/* 1. FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed bottom-6 right-4 sm:right-6 z-100 flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-md border animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === "success"
              ? "bg-slate-950/90 text-white border-emerald-500/40 ring-1 ring-emerald-400/30"
              : "bg-rose-950/90 text-white border-rose-500/40 ring-1 ring-rose-400/30"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-semibold leading-snug max-w-xs">
            {toastMessage.text}
          </span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Tutup notifikasi"
            className="ml-2 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. SEARCH & DYNAMIC CATEGORY FILTER BAR */}
      <HelpFilterBar
        category={category}
        onSelectCategory={(cat) => selectCategory(cat, true)}
        search={search}
        onSearchChange={setSearch}
        categoryCounts={categoryCounts}
        liveAnnouncement={liveAnnouncement}
      />

      {/* 3. 4 QUICK HELP CARDS */}
      <HelpQuickCards
        onOpenWhatsApp={openWhatsApp}
        onSelectCategory={selectCategory}
      />

      {/* 4. ASSET EDUCATION SECTION (SALDO VS KOIN) */}
      <HelpAssetGuideCards
        onSelectCategory={selectCategory}
      />

      {/* 5. TWO-COLUMN SPLIT: FAQ ACCORDION + CONTACT SUPPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] xl:grid-cols-[1.2fr_0.8fr] gap-4 sm:gap-5 items-start">
        {/* LEFT: FAQ ACCORDION */}
        <HelpFaqAccordion
          faqItems={filteredFaq}
          openFaqId={openFaqId}
          onToggleFaq={toggleFaq}
          onShowAll={resetFilters}
          category={category}
          search={search}
          showAllInOverview={showAllInOverview}
          onToggleShowAllInOverview={setShowAllInOverview}
          minHeight={isRingkas && isDesktop ? supportCardHeight : undefined}
        />

        {/* RIGHT: CONTACT SUPPORT CARD */}
        <HelpContactSupportCard
          ref={supportCardRef}
          onOpenWhatsApp={openWhatsApp}
          onCopyTemplate={copyTemplateMessage}
          copied={copied}
          isWhatsappAvailable={isWhatsappAvailable}
        />
      </div>

      {/* 6. SUBTLE FOOTER TEXT */}
      <div className="mt-8 pb-4 text-center">
        <p className="text-[11px] font-medium text-slate-400">
          Konten bantuan diperbarui secara berkala untuk memberikan informasi terbaik bagi Anda.
        </p>
      </div>
    </section>
  );
}