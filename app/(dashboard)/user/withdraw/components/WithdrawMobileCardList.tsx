"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import {
  Building2,
  ChevronRight,
  WalletCards,
} from "lucide-react";
import {
  Withdrawal,
  formatDate,
  formatRupiah,
  getBankLogo,
  getStatusClasses,
  maskAccountNumber,
  normalizeBankName,
  normalizeWithdrawalStatus,
  toNumber,
} from "../types";

interface WithdrawMobileCardListProps {
  withdrawals: Withdrawal[];
  onSelectWithdrawal: (withdrawal: Withdrawal) => void;
}

export default function WithdrawMobileCardList({
  withdrawals,
  onSelectWithdrawal,
}: WithdrawMobileCardListProps) {
  return (
    <div className="space-y-2.5 sm:space-y-3">
      {withdrawals.map((w) => {
        const status = normalizeWithdrawalStatus(w.status);
        const statusStyle = getStatusClasses(status);
        const bankName = normalizeBankName(w.bank_name);
        const logoUrl = getBankLogo(w.bank_name);
        const maskedAcc = maskAccountNumber(w.account_number);
        const amount = toNumber(w.amount);
        const fee = toNumber(w.admin_fee);
        const heldAmount =
          w.held_amount !== null && w.held_amount !== undefined
            ? toNumber(w.held_amount)
            : amount + fee;

        return (
          <div
            key={w.id}
            onClick={() => onSelectWithdrawal(w)}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 sm:p-4 shadow-2xs backdrop-blur-md transition-all duration-150 active:scale-[0.99] hover:border-rose-300 hover:shadow-xs cursor-pointer ring-1 ring-inset ring-white/60"
          >
            {/* 1. TOP ROW: LOGO, BANK, ACCOUNT & STATUS */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 xs:h-10 xs:w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white p-0.5 shadow-2xs overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={bankName}
                      className="h-full w-full object-contain"
                    />
                  ) : bankName.toLowerCase().includes("bank") ? (
                    <Building2 size={18} className="text-blue-600" />
                  ) : (
                    <WalletCards size={18} className="text-emerald-600" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-xs xs:text-sm text-slate-950 truncate">
                    {bankName}
                  </p>
                  <p className="text-[10px] xs:text-[11px] font-mono text-slate-400 truncate mt-0.5">
                    {maskedAcc} {w.account_name && `· ${w.account_name}`}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] xs:text-[10px] font-bold ${statusStyle.badge}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                />
                {statusStyle.label}
              </span>
            </div>

            {/* 2. MIDDLE ROW: NOMINAL & DANA DITAHAN */}
            <div className="my-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
              <div>
                <p className="text-[9px] xs:text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                  Nominal Penarikan
                </p>
                <p className="mt-0.5 text-xs xs:text-sm font-black text-slate-950 truncate">
                  {formatRupiah(amount)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[9px] xs:text-[9.5px] font-bold uppercase tracking-wider text-indigo-600">
                  Dana Ditahan
                </p>
                <p className="mt-0.5 text-xs xs:text-sm font-black text-indigo-700 truncate">
                  {formatRupiah(heldAmount)}
                </p>
              </div>
            </div>

            {/* 3. BOTTOM ROW: WAKTU, FEE & DETAIL ARROW */}
            <div className="flex items-center justify-between text-[10px] xs:text-[11px] text-slate-400 pt-0.5">
              <span>{formatDate(w.created_at)}</span>

              <div className="flex items-center gap-1.5 font-bold text-slate-600">
                <span>Fee: {formatRupiah(fee)}</span>
                <ChevronRight size={13} className="text-slate-400 group-hover:text-rose-600 transition" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

