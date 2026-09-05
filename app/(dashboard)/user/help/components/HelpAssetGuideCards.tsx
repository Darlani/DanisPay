"use client";

import React from "react";
import { CheckCircle2, Coins, Sparkles, Wallet } from "lucide-react";
import { HelpCategory } from "../types";

interface HelpAssetGuideCardsProps {
  onSelectCategory: (category: HelpCategory, shouldScroll?: boolean) => void;
}

export default function HelpAssetGuideCards({
  onSelectCategory,
}: HelpAssetGuideCardsProps) {
  return (
    <section className="mb-4 sm:mb-5 rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white/95 p-3 xs:p-4 sm:p-5 md:p-6 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
      {/* Section Header Inside Container */}
      <div className="mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-slate-100">
        <h2 className="text-sm xs:text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
          Kenali Aset DaPay Anda
        </h2>
        <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">
          Pahami perbedaan Saldo DaPay dan Koin DaPay
        </p>
      </div>

      {/* 2-Column Asset Guide Cards (Side-by-Side Kiri & Kanan di Semua Viewport) */}
      <div className="grid grid-cols-2 gap-2 xs:gap-3 sm:gap-4">
        {/* 1. SALDO DAPAY CARD (ASET LIKUID) */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-[22px] border border-emerald-200/80 bg-linear-to-br from-white via-emerald-50/50 to-teal-100/30 p-2.5 xs:p-3.5 sm:p-5 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/70 transition-all duration-200 hover:shadow-xs">
          {/* Badge Aset Likuid di Pojok Kanan Atas Container (Hidden on <640px Mobile, Visible on >=640px Tablet & Desktop) */}
          <span className="hidden sm:inline-flex absolute sm:top-4 sm:right-4 items-center rounded-full border border-emerald-300 bg-emerald-100/90 px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold text-emerald-800 shadow-2xs">
            Aset Likuid
          </span>

          <div>
            {/* Header: Icon + Title sejajar di dasar masing-masing icon */}
            <div className="flex items-end gap-1.5 xs:gap-2.5 sm:gap-3 pr-0 sm:pr-20">
              {/* Glowing Ambient Avatar */}
              <div className="relative flex h-7.5 w-7.5 xs:h-9 xs:w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg xs:rounded-xl sm:rounded-2xl border border-emerald-300/60 bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-[0_6px_16px_rgba(16,185,129,0.25)] ring-2 xs:ring-3 sm:ring-4 ring-emerald-100/80">
                <Wallet size={15} strokeWidth={2.2} className="xs:hidden" />
                <Wallet size={18} strokeWidth={2.2} className="hidden xs:block sm:hidden" />
                <Wallet size={21} strokeWidth={2.2} className="hidden sm:block" />
              </div>

              <h3 className="pb-0.5 text-[11.5px] xs:text-sm sm:text-base font-black tracking-tight text-slate-900 leading-tight">
                Saldo DaPay
              </h3>
            </div>

            {/* Description Text */}
            <p className="mt-2 xs:mt-2.5 text-[10px] xs:text-[11.5px] sm:text-xs text-slate-600 leading-relaxed">
              Saldo utama yang dapat digunakan belanja dan dapat ditarik ke rekening / e-wallet.
            </p>

            {/* Checklist */}
            <div className="mt-2.5 xs:mt-3.5 space-y-1 xs:space-y-1.5 border-t border-emerald-100/80 pt-2 xs:pt-3">
              <CheckItem text="Dapat digunakan untuk semua produk digital" tone="emerald" />
              <CheckItem text="Dapat ditarik ke rekening bank / e-wallet" tone="emerald" />
              <CheckItem text="Bersumber dari deposit, refund, komisi" tone="emerald" />
            </div>
          </div>

          <div className="mt-2.5 xs:mt-4 pt-1">
            <button
              type="button"
              onClick={() => onSelectCategory("balance", true)}
              className="inline-flex items-center gap-1 text-[10.5px] xs:text-xs font-bold text-emerald-700 transition hover:text-emerald-800 hover:underline cursor-pointer"
            >
              <span>Pelajari lebih lanjut</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* 2. KOIN DAPAY CARD (ASET REWARD) */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-[22px] border border-purple-200/80 bg-linear-to-br from-white via-purple-50/50 to-violet-100/30 p-2.5 xs:p-3.5 sm:p-5 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/70 transition-all duration-200 hover:shadow-xs">
          {/* Badge Aset Reward di Pojok Kanan Atas Container (Hidden on <640px Mobile, Visible on >=640px Tablet & Desktop) */}
          <span className="hidden sm:inline-flex absolute sm:top-4 sm:right-4 items-center rounded-full border border-purple-300 bg-purple-100/90 px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold text-purple-800 shadow-2xs">
            Aset Reward
          </span>

          <div>
            {/* Header: Icon + Title sejajar di dasar masing-masing icon */}
            <div className="flex items-end gap-1.5 xs:gap-2.5 sm:gap-3 pr-0 sm:pr-20">
              {/* Glowing Ambient Avatar */}
              <div className="relative flex h-7.5 w-7.5 xs:h-9 xs:w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg xs:rounded-xl sm:rounded-2xl border border-purple-300/60 bg-linear-to-br from-purple-500 to-indigo-600 text-white shadow-[0_6px_16px_rgba(168,85,247,0.25)] ring-2 xs:ring-3 sm:ring-4 ring-purple-100/80">
                <Coins size={15} strokeWidth={2.2} className="xs:hidden" />
                <Coins size={18} strokeWidth={2.2} className="hidden xs:block sm:hidden" />
                <Coins size={21} strokeWidth={2.2} className="hidden sm:block" />
                <span className="absolute -top-1 -right-1 text-amber-300 animate-pulse">
                  <Sparkles size={9} className="xs:hidden" />
                  <Sparkles size={11} className="hidden xs:block" />
                </span>
              </div>

              <h3 className="pb-0.5 text-[11.5px] xs:text-sm sm:text-base font-black tracking-tight text-slate-900 leading-tight">
                Koin DaPay
              </h3>
            </div>

            {/* Description Text */}
            <p className="mt-2 xs:mt-2.5 text-[10px] xs:text-[11.5px] sm:text-xs text-slate-600 leading-relaxed">
              Koin reward/cashback dari transaksi untuk potongan belanja hemat di DaPay.
            </p>

            {/* Checklist */}
            <div className="mt-2.5 xs:mt-3.5 space-y-1 xs:space-y-1.5 border-t border-purple-100/80 pt-2 xs:pt-3">
              <CheckItem text="Hanya untuk produk pendukung koin" tone="purple" />
              <CheckItem text="Tidak dapat dicairkan / ditarik ke bank" tone="purple" />
              <CheckItem text="Bersumber dari cashback & promo loyalitas" tone="purple" />
            </div>
          </div>

          <div className="mt-2.5 xs:mt-4 pt-1">
            <button
              type="button"
              onClick={() => onSelectCategory("coin", true)}
              className="inline-flex items-center gap-1 text-[10.5px] xs:text-xs font-bold text-purple-700 transition hover:text-purple-800 hover:underline cursor-pointer"
            >
              <span>Pelajari lebih lanjut</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckItem({ text, tone }: { text: string; tone: "emerald" | "purple" }) {
  const iconClass = tone === "emerald" ? "text-emerald-600" : "text-purple-600";
  return (
    <div className="flex items-start gap-1.5 xs:gap-2 text-[9.5px] xs:text-[11px] sm:text-xs text-slate-700">
      <CheckCircle2 size={12} className={`${iconClass} shrink-0 mt-0.5 xs:hidden`} />
      <CheckCircle2 size={13} className={`${iconClass} shrink-0 mt-0.5 hidden xs:block`} />
      <span className="leading-snug">{text}</span>
    </div>
  );
}
