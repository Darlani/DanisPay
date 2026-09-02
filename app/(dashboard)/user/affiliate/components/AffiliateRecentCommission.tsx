"use client";

import React from "react";
import { CircleDollarSign, Clock3 } from "lucide-react";
import { CommissionEntry, formatDateTime, formatRupiah } from "../types";

interface AffiliateRecentCommissionProps {
  commissions: CommissionEntry[];
}

export default function AffiliateRecentCommission({
  commissions,
}: AffiliateRecentCommissionProps) {
  return (
    <section className="mb-4 sm:mb-5 lg:mb-6 overflow-hidden rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
      {/* HEADER */}
      <div className="border-b border-slate-100 p-3.5 sm:p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
            <CircleDollarSign size={16} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black tracking-tight text-slate-900">
              Komisi Referral Terbaru
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
              Semua komisi referral langsung dikreditkan ke Saldo DaPay.
            </p>
          </div>
        </div>
      </div>

      {/* BODY */}
      {commissions.length === 0 ? (
        <div className="p-8 sm:p-10 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 shadow-2xs">
            <CircleDollarSign size={20} />
          </div>
          <h3 className="mt-3.5 text-sm font-bold text-slate-800">
            Belum ada komisi referral
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Bagikan link referral Anda untuk mulai membangun jaringan dan mendapatkan komisi.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100/90 text-xs">
          {commissions.map((entry, idx) => (
            <div
              key={entry.log.id || `${entry.log.created_at}-${idx}`}
              className="flex items-center justify-between gap-3 p-3 sm:px-4 transition-colors hover:bg-slate-50/70"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/80">
                  <CircleDollarSign size={15} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">
                    {entry.log.description || "Komisi referral"}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                    <Clock3 size={10} />
                    <span>{formatDateTime(entry.log.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-black text-emerald-600 sm:text-sm">
                  +{formatRupiah(entry.amount)}
                </p>
                <span className="inline-block rounded-md bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 text-[8.5px] font-black uppercase tracking-wider text-emerald-700">
                  Saldo
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

