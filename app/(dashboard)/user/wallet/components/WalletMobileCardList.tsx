"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
} from "lucide-react";
import {
  WalletEntry,
  formatCoins,
  formatDate,
  formatRupiah,
  formatSignedCoins,
  formatSignedRupiah,
  getEntryMeta,
  toNumber,
} from "../types";

interface WalletMobileCardListProps {
  entries: WalletEntry[];
  onSelectEntry: (entry: WalletEntry) => void;
  onCopy: (text: string, label: string) => void;
}

export default function WalletMobileCardList({
  entries,
  onSelectEntry,
  onCopy,
}: WalletMobileCardListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string) => {
    await onCopy(id, "ID Mutasi");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="divide-y divide-slate-100">
      {entries.map((entry) => {
        const meta = getEntryMeta(entry);
        const Icon = meta.icon;
        const log = entry.log;
        const isCoin = entry.asset === "coin";

        const rawBefore = isCoin
          ? log.initial_coin_balance ?? log.initial_balance
          : log.initial_balance;
        const rawAfter = isCoin
          ? log.final_coin_balance ?? log.final_balance
          : log.final_balance;

        let beforeAmount =
          rawBefore !== null && rawBefore !== undefined ? toNumber(rawBefore) : null;
        let afterAmount =
          rawAfter !== null && rawAfter !== undefined ? toNumber(rawAfter) : null;

        // Smart fallback if one of before/after is available
        if (beforeAmount === null && afterAmount !== null) {
          beforeAmount = afterAmount - entry.amount;
        } else if (afterAmount === null && beforeAmount !== null) {
          afterAmount = beforeAmount + entry.amount;
        }

        const isIncome = entry.flow === "income";
        const isExpense = entry.flow === "expense";

        return (
          <div
            key={log.id}
            onClick={() => onSelectEntry(entry)}
            className="group relative p-3.5 sm:p-4 hover:bg-slate-50/80 transition cursor-pointer active:bg-slate-100"
          >
            {/* ROW 1: HEADER (TYPE BADGE + ASSET PILL + AMOUNT) */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${meta.iconClass}`}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8.5px] font-bold ${meta.badgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                      <span>{meta.label}</span>
                    </span>
                    {isCoin ? (
                      <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[8px] font-extrabold text-violet-700">
                        KOIN
                      </span>
                    ) : (
                      <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[8px] font-extrabold text-blue-700">
                        SALDO
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* AMOUNT (TOP-RIGHT) */}
              <div className="text-right shrink-0">
                {isIncome ? (
                  <p className="text-xs xs:text-[13px] font-black text-emerald-600 leading-tight">
                    {isCoin
                      ? formatSignedCoins(entry.amount)
                      : formatSignedRupiah(entry.amount)}
                  </p>
                ) : isExpense ? (
                  <p className="text-xs xs:text-[13px] font-black text-rose-600 leading-tight">
                    {isCoin
                      ? formatSignedCoins(entry.amount)
                      : formatSignedRupiah(entry.amount)}
                  </p>
                ) : (
                  <p className="text-xs xs:text-[13px] font-black text-slate-700 leading-tight">
                    {isCoin ? formatCoins(entry.amount) : formatRupiah(entry.amount)}
                  </p>
                )}
              </div>
            </div>

            {/* ROW 2: DESCRIPTION */}
            <div className="mt-2 pl-10">
              <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                {entry.description || "Aktivitas Keuangan"}
              </p>
            </div>

            {/* ROW 3: FOOTER (SALDO AWAL -> SALDO AKHIR & WAKTU / ID) */}
            <div className="mt-2.5 pl-10 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-slate-100/70">
              {/* BALANCE PROGRESSION */}
              {(beforeAmount !== null && beforeAmount !== undefined) ||
              (afterAmount !== null && afterAmount !== undefined) ? (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                  <span>
                    {beforeAmount !== null && beforeAmount !== undefined
                      ? isCoin
                        ? formatCoins(beforeAmount)
                        : formatRupiah(beforeAmount)
                      : "Rp 0"}
                  </span>
                  <ArrowRight size={10} className="text-slate-300 shrink-0" />
                  <span className="font-bold text-slate-900">
                    {afterAmount !== null && afterAmount !== undefined
                      ? isCoin
                        ? formatCoins(afterAmount)
                        : formatRupiah(afterAmount)
                      : "Rp 0"}
                  </span>
                </div>
              ) : null}

              {/* DATE & COPY ID */}
              <div className="flex items-center justify-between sm:justify-end gap-2 text-[10px] text-slate-400">
                <span>{formatDate(log.created_at)}</span>
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-mono text-[9px] text-slate-400">
                    #{log.id.slice(0, 8)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(log.id)}
                    className="inline-flex h-4 w-4 items-center justify-center rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title="Salin ID Mutasi"
                  >
                    {copiedId === log.id ? (
                      <Check size={10} className="text-emerald-600" />
                    ) : (
                      <Copy size={10} className="text-slate-400 hover:text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
