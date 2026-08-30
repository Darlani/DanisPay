"use client";

import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  WalletCards,
} from "lucide-react";
import { WithdrawalSummary, formatRupiah } from "../types";

interface WithdrawKpiCardsProps {
  summary: WithdrawalSummary;
}

export default function WithdrawKpiCards({
  summary,
}: WithdrawKpiCardsProps) {
  return (
    <section className="mb-4 sm:mb-5 lg:mb-6">
      <div className="grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-3.5 xl:gap-4 items-stretch">
        {/* ========================================================== */}
        {/* 1. SALDO DAPAY (ASET UTAMA - BISA DITARIK)                 */}
        {/* ========================================================== */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-2xl border border-rose-400/30 bg-linear-to-br from-rose-500 via-rose-600 to-orange-500 p-2.5 xs:p-3 sm:p-4 text-white shadow-[0_12px_32px_rgba(225,29,72,0.2)] backdrop-blur-xl ring-1 ring-inset ring-white/20 transition-all duration-300 hover:shadow-[0_16px_40px_rgba(225,29,72,0.3)] min-h-24 xs:min-h-[108px] sm:min-h-32">
          {/* Specular glare rim */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent"
            aria-hidden="true"
          />
          {/* Subtle ambient orb */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/20 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="truncate text-[8.5px] xs:text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-rose-100">
                Saldo DaPay
              </p>
              <p className="hidden xs:block text-[8px] sm:text-[9.5px] font-medium text-rose-100/75 leading-tight">
                Saldo Siap Ditarik
              </p>
            </div>

            <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-white/25 bg-white/15 text-white shadow-2xs backdrop-blur-md">
              <WalletCards size={15} strokeWidth={2.2} />
            </div>
          </div>

          <div className="relative z-10 mt-2 sm:mt-3">
            <p className="truncate text-[13px] xs:text-[15px] sm:text-lg md:text-xl xl:text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] leading-none">
              {formatRupiah(summary.balance)}
            </p>
            <div className="mt-1 flex items-center gap-1 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-rose-100">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span className="truncate">Withdrawable</span>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* 2. PENARIKAN BERHASIL                                      */}
        {/* ========================================================== */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-2xl border border-emerald-200/80 bg-white/95 p-2.5 xs:p-3 sm:p-4 shadow-xs backdrop-blur-md ring-1 ring-inset ring-white/60 transition-all duration-300 hover:shadow-sm min-h-24 xs:min-h-[108px] sm:min-h-32">
          <div
            className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-emerald-100/50 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="truncate text-[8.5px] xs:text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Tarik Berhasil
              </p>
              <p className="hidden xs:block text-[8px] sm:text-[9.5px] font-medium text-emerald-600/80 leading-tight">
                Total Dana Keluar
              </p>
            </div>

            <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-600 shadow-2xs">
              <CheckCircle2 size={15} strokeWidth={2.2} />
            </div>
          </div>

          <div className="relative z-10 mt-2 sm:mt-3">
            <p className="truncate text-[13px] xs:text-[15px] sm:text-lg md:text-xl xl:text-2xl font-black tracking-tight text-slate-900 leading-none">
              {formatRupiah(summary.successfulAmount)}
            </p>
            <div className="mt-1 flex items-center gap-1 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-emerald-700">
              <span className="rounded-md bg-emerald-100/80 px-1 py-0.2 font-mono text-[8px] xs:text-[9px] font-bold text-emerald-800">
                {summary.successfulCount} Transaksi
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* 3. SEDANG DIPROSES                                         */}
        {/* ========================================================== */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-2xl border border-amber-200/80 bg-white/95 p-2.5 xs:p-3 sm:p-4 shadow-xs backdrop-blur-md ring-1 ring-inset ring-white/60 transition-all duration-300 hover:shadow-sm min-h-24 xs:min-h-[108px] sm:min-h-32">
          <div
            className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-amber-100/50 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="truncate text-[8.5px] xs:text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Sedang Diproses
              </p>
              <p className="hidden xs:block text-[8px] sm:text-[9.5px] font-medium text-amber-600/80 leading-tight">
                Permintaan Pending
              </p>
            </div>

            <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-amber-200/80 bg-amber-50 text-amber-600 shadow-2xs">
              <Clock size={15} strokeWidth={2.2} />
            </div>
          </div>

          <div className="relative z-10 mt-2 sm:mt-3">
            <p className="truncate text-[13px] xs:text-[15px] sm:text-lg md:text-xl xl:text-2xl font-black tracking-tight text-slate-900 leading-none">
              {formatRupiah(summary.pendingAmount)}
            </p>
            <div className="mt-1 flex items-center gap-1 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-amber-700">
              <span className="rounded-md bg-amber-100/80 px-1 py-0.2 font-mono text-[8px] xs:text-[9px] font-bold text-amber-800">
                {summary.pendingCount} Pending
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* 4. DANA DITAHAN                                            */}
        {/* ========================================================== */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-2xl border border-indigo-200/80 bg-white/95 p-2.5 xs:p-3 sm:p-4 shadow-xs backdrop-blur-md ring-1 ring-inset ring-white/60 transition-all duration-300 hover:shadow-sm min-h-24 xs:min-h-[108px] sm:min-h-32">
          <div
            className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-indigo-100/50 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="truncate text-[8.5px] xs:text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Dana Ditahan
              </p>
              <p className="hidden xs:block text-[8px] sm:text-[9.5px] font-medium text-indigo-600/80 leading-tight">
                Nominal & Biaya Admin
              </p>
            </div>

            <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-indigo-200/80 bg-indigo-50 text-indigo-600 shadow-2xs">
              <AlertCircle size={15} strokeWidth={2.2} />
            </div>
          </div>

          <div className="relative z-10 mt-2 sm:mt-3">
            <p className="truncate text-[13px] xs:text-[15px] sm:text-lg md:text-xl xl:text-2xl font-black tracking-tight text-slate-900 leading-none">
              {formatRupiah(summary.pendingHeldAmount)}
            </p>
            <div className="mt-1 flex items-center gap-1 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-indigo-700">
              <span className="rounded-md bg-indigo-100/80 px-1 py-0.2 font-mono text-[8px] xs:text-[9px] font-bold text-indigo-800">
                Ditahan Sementara
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
