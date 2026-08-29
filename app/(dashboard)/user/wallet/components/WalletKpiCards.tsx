"use client";

import React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Coins,
  Wallet,
} from "lucide-react";
import { WalletSummary, formatCoins, formatRupiah } from "../types";

interface WalletKpiCardsProps {
  summary: WalletSummary;
  loading?: boolean;
}

export default function WalletKpiCards({
  summary,
}: WalletKpiCardsProps) {
  return (
    <section className="mb-4 sm:mb-5 grid grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-2.5 sm:gap-3.5 md:gap-4 xl:gap-5">
      {/* ============================================================ */}
      {/* 1. SALDO DAPAY (PREMIUM ROYAL GLASS CARD)                     */}
      {/* ============================================================ */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl border border-blue-400/30 bg-linear-to-br from-[#1e3a8a]/95 via-[#1d4ed8]/90 to-[#312e81]/95 p-2.5 xs:p-3 sm:p-4.5 md:p-5 text-white shadow-[0_12px_32px_rgba(30,58,138,0.22)] backdrop-blur-2xl ring-1 ring-inset ring-white/20 transition-all duration-300 hover:shadow-[0_16px_40px_rgba(30,58,138,0.32)] min-h-24 xs:min-h-28 sm:min-h-32">
        {/* Specular Glare Rim */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />

        {/* Ambient Multi-Color Glass Glow Orbs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-linear-to-br from-cyan-400/30 via-blue-400/20 to-transparent blur-2xl" />
        <div className="pointer-events-none absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-indigo-500/30 blur-2xl" />

        <div className="relative z-10 flex items-start justify-between gap-1.5 xs:gap-2">
          <div className="min-w-0 flex-1 flex justify-start">
            <span className="inline-flex items-center gap-1 max-w-full truncate rounded-full bg-white/15 px-1.5 xs:px-2 py-0.5 text-[8px] xs:text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider text-blue-100 backdrop-blur-xs ring-1 ring-white/20">
              <CircleDollarSign size={9} className="shrink-0 text-cyan-300" />
              <span className="truncate">Saldo DaPay</span>
            </span>
          </div>

          <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-white/30 bg-white/15 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-md">
            <Wallet className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4.5 sm:w-4.5" />
          </div>
        </div>

        <div className="relative z-10 mt-1.5 xs:mt-2.5">
          <p className="truncate text-sm xs:text-base sm:text-xl md:text-2xl font-black tracking-tight text-white leading-tight">
            {formatRupiah(summary.balance)}
          </p>
          <p className="mt-0.5 xs:mt-1 truncate text-[8px] xs:text-[9px] sm:text-[10px] font-medium text-blue-100/80">
            Dapat ditarik / ditransaksikan
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. TOTAL SALDO MASUK (LUMINOUS EMERALD CARD)                 */}
      {/* ============================================================ */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl border border-emerald-200/90 bg-emerald-50/40 p-2.5 xs:p-3 sm:p-4.5 md:p-5 shadow-2xs transition-all duration-300 hover:shadow-xs hover:border-emerald-300 min-h-24 xs:min-h-28 sm:min-h-32">
        <div className="relative z-10 flex items-start justify-between gap-1.5 xs:gap-2">
          <div className="min-w-0 flex-1 flex justify-start">
            <span className="inline-flex items-center gap-1 max-w-full truncate rounded-full bg-emerald-100/80 px-1.5 xs:px-2 py-0.5 text-[8px] xs:text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider text-emerald-800">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate">Saldo Masuk</span>
            </span>
          </div>

          <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-emerald-200 bg-emerald-100 text-emerald-700 shadow-2xs">
            <ArrowDownLeft className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4.5 sm:w-4.5" />
          </div>
        </div>

        <div className="relative z-10 mt-1.5 xs:mt-2.5">
          <p className="truncate text-sm xs:text-base sm:text-xl md:text-2xl font-black tracking-tight text-emerald-950 leading-tight">
            {formatRupiah(summary.totalIncome)}
          </p>
          <p className="mt-0.5 xs:mt-1 truncate text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-emerald-700">
            Akumulasi deposit & top up
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. TOTAL SALDO KELUAR (REFINED ROSE CARD)                    */}
      {/* ============================================================ */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl border border-rose-200/90 bg-rose-50/40 p-2.5 xs:p-3 sm:p-4.5 md:p-5 shadow-2xs transition-all duration-300 hover:shadow-xs hover:border-rose-300 min-h-24 xs:min-h-28 sm:min-h-32">
        <div className="relative z-10 flex items-start justify-between gap-1.5 xs:gap-2">
          <div className="min-w-0 flex-1 flex justify-start">
            <span className="inline-flex items-center gap-1 max-w-full truncate rounded-full bg-rose-100/80 px-1.5 xs:px-2 py-0.5 text-[8px] xs:text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider text-rose-800">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
              <span className="truncate">Saldo Keluar</span>
            </span>
          </div>

          <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-rose-200 bg-rose-100 text-rose-700 shadow-2xs">
            <ArrowUpRight className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4.5 sm:w-4.5" />
          </div>
        </div>

        <div className="relative z-10 mt-1.5 xs:mt-2.5">
          <p className="truncate text-sm xs:text-base sm:text-xl md:text-2xl font-black tracking-tight text-rose-950 leading-tight">
            {formatRupiah(summary.totalExpense)}
          </p>
          <p className="mt-0.5 xs:mt-1 truncate text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-rose-700">
            Pembelian & penarikan saldo
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. KOIN DAPAY (LUMINOUS VIOLET CARD)                         */}
      {/* ============================================================ */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-3xl border border-violet-200/90 bg-linear-to-br from-violet-50/70 via-white/90 to-purple-50/70 p-2.5 xs:p-3 sm:p-4.5 md:p-5 shadow-2xs transition-all duration-300 hover:shadow-xs hover:border-violet-300 min-h-24 xs:min-h-28 sm:min-h-32">
        <div className="relative z-10 flex items-start justify-between gap-1.5 xs:gap-2">
          <div className="min-w-0 flex-1 flex justify-start">
            <span className="inline-flex items-center gap-1 max-w-full truncate rounded-full bg-violet-100/90 px-1.5 xs:px-2 py-0.5 text-[8px] xs:text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider text-violet-800">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
              <span className="truncate">Koin DaPay</span>
            </span>
          </div>

          <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-violet-200 bg-violet-100 text-violet-700 shadow-2xs">
            <Coins className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-4.5 sm:w-4.5" />
          </div>
        </div>

        <div className="relative z-10 mt-1.5 xs:mt-2.5">
          <p className="truncate text-sm xs:text-base sm:text-xl md:text-2xl font-black tracking-tight text-violet-950 leading-tight">
            {formatCoins(summary.coinBalance)}
          </p>
          <p className="mt-0.5 xs:mt-1 truncate text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-violet-700">
            Reward & cashback belanja
          </p>
        </div>
      </div>
    </section>
  );
}
