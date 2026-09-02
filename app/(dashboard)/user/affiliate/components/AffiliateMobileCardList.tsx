"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { Referral, formatDate, getInitial, maskEmail } from "../types";

interface AffiliateMobileCardListProps {
  referrals: Referral[];
  onSelectReferral: (referral: Referral) => void;
}

export default function AffiliateMobileCardList({
  referrals,
  onSelectReferral,
}: AffiliateMobileCardListProps) {
  return (
    <div className="space-y-2.5 sm:space-y-3">
      {referrals.map((referral, idx) => {
        const name = referral.full_name || "Member Baru";
        const initial = getInitial(name);
        const masked = maskEmail(referral.email);

        return (
          <div
            key={referral.id || `${referral.email}-${idx}`}
            onClick={() => onSelectReferral(referral)}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 sm:p-4 shadow-2xs backdrop-blur-md transition-all duration-150 active:scale-[0.99] hover:border-amber-300 hover:shadow-xs cursor-pointer ring-1 ring-inset ring-white/60"
          >
            {/* TOP ROW: AVATAR, NAME, MASKED EMAIL & STATUS */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 xs:h-10 xs:w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500 text-xs xs:text-sm font-black text-white shadow-2xs">
                  {initial}
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-xs xs:text-sm text-slate-950 truncate">
                    {name}
                  </p>
                  <p className="text-[10px] xs:text-[11px] font-mono text-slate-400 truncate mt-0.5">
                    {masked}
                  </p>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] xs:text-[10px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Terdaftar
              </span>
            </div>

            {/* BOTTOM ROW: JOIN DATE & DETAIL LINK */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100/90 pt-2 text-[10px] xs:text-[11px] text-slate-400">
              <span>Bergabung: <strong className="font-semibold text-slate-600">{formatDate(referral.created_at)}</strong></span>

              <div className="flex items-center gap-1 font-bold text-amber-600 group-hover:text-amber-700">
                <span>Detail</span>
                <ChevronRight size={13} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

