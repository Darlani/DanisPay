"use client";

import React from "react";
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  WalletCards,
} from "lucide-react";
import { DepositSummary, formatRupiah } from "../types";

interface DepositKpiCardsProps {
  summary: DepositSummary;
}

export default function DepositKpiCards({
  summary,
}: DepositKpiCardsProps) {
  return (
    <section className="mb-4 sm:mb-5 lg:mb-6">
      <div className="grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-3.5 xl:gap-4 items-stretch">
        {/* ========================================================== */}
        {/* 1. SALDO DAPAY (ASET UTAMA)                                */}
        {/* ========================================================== */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-2xl border border-blue-400/30 bg-linear-to-br from-[#1e3a8a]/90 via-[#1d4ed8]/85 to-[#312e81]/90 p-2.5 xs:p-3 sm:p-4 text-white shadow-[0_12px_32px_rgba(30,58,138,0.2)] backdrop-blur-xl ring-1 ring-inset ring-white/20 transition-all duration-300 hover:shadow-[0_16px_40px_rgba(30,58,138,0.3)] min-h-24 xs:min-h-[108px] sm:min-h-32">
          {/* Specular glare rim */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent"
            aria-hidden="true"
          />
          {/* Subtle ambient orb */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="truncate text-[8.5px] xs:text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-blue-200/80">
                Saldo DaPay
              </p>
              <p className="hidden xs:block text-[8px] sm:text-[9.5px] font-medium text-blue-200/60 leading-tight">
                Aset Likuid Akun
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
            <div className="mt-1 flex items-center gap-1 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate">Saldo Siap Pakai</span>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* 2. DEPOSIT BERHASIL                                        */}
        {/* ========================================================== */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-2xl border border-emerald-200/80 bg-white/95 p-2.5 xs:p-3 sm:p-4 shadow-xs backdrop-blur-md ring-1 ring-inset ring-white/60 transition-all duration-300 hover:shadow-sm min-h-24 xs:min-h-[108px] sm:min-h-32">
          <div
            className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-emerald-100/50 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="truncate text-[8.5px] xs:text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Deposit Berhasil
              </p>
              <p className="hidden xs:block text-[8px] sm:text-[9.5px] font-medium text-emerald-600/80 leading-tight">
                Total Dana Masuk
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
        {/* 3. DEPOSIT PENDING                                         */}
        {/* ========================================================== */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-2xl border border-amber-200/80 bg-white/95 p-2.5 xs:p-3 sm:p-4 shadow-xs backdrop-blur-md ring-1 ring-inset ring-white/60 transition-all duration-300 hover:shadow-sm min-h-24 xs:min-h-[108px] sm:min-h-32">
          <div
            className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-amber-100/50 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="truncate text-[8.5px] xs:text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Menunggu Bayar
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
        {/* 4. TOTAL PENGAJUAN DEPOSIT                                 */}
        {/* ========================================================== */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl md:rounded-2xl border border-violet-200/80 bg-white/95 p-2.5 xs:p-3 sm:p-4 shadow-xs backdrop-blur-md ring-1 ring-inset ring-white/60 transition-all duration-300 hover:shadow-sm min-h-24 xs:min-h-[108px] sm:min-h-32">
          <div
            className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-violet-100/50 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="truncate text-[8.5px] xs:text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Total Deposit
              </p>
              <p className="hidden xs:block text-[8px] sm:text-[9.5px] font-medium text-violet-600/80 leading-tight">
                Akumulasi Pengajuan
              </p>
            </div>

            <div className="flex h-6.5 w-6.5 xs:h-7.5 xs:w-7.5 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-lg xs:rounded-xl border border-violet-200/80 bg-violet-50 text-violet-600 shadow-2xs">
              <ArrowDownToLine size={15} strokeWidth={2.2} />
            </div>
          </div>

          <div className="relative z-10 mt-2 sm:mt-3">
            <p className="truncate text-[13px] xs:text-[15px] sm:text-lg md:text-xl xl:text-2xl font-black tracking-tight text-slate-900 leading-none">
              {formatRupiah(summary.totalAmount)}
            </p>
            <div className="mt-1 flex items-center gap-1 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-violet-700">
              <span className="rounded-md bg-violet-100/80 px-1 py-0.2 font-mono text-[8px] xs:text-[9px] font-bold text-violet-800">
                {summary.totalCount} Total Pengajuan
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
