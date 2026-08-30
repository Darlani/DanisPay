"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  Copy,
  X,
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

interface WalletDetailModalProps {
  entry: WalletEntry | null;
  onClose: () => void;
  onCopy: (text: string, label: string) => void;
}

export default function WalletDetailModal({
  entry,
  onClose,
  onCopy,
}: WalletDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!entry) return null;

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

  const handleCopyField = async (text: string, label: string) => {
    await onCopy(text, label);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.iconClass}`}
            >
              <Icon size={16} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                Detail Mutasi Keuangan
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                Catatan mutasi buku besar resmi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X size={17} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="max-h-[75vh] overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* AMOUNT HERO CARD */}
          <div
            className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 text-center ${
              isIncome
                ? "border-emerald-200 bg-linear-to-br from-emerald-50/80 to-teal-50/50"
                : isExpense
                ? "border-rose-200 bg-linear-to-br from-rose-50/80 to-red-50/50"
                : "border-slate-200 bg-linear-to-br from-slate-50/80 to-slate-100/50"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold ${meta.badgeClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                <span>{meta.label}</span>
              </span>
              <span className="rounded-md bg-white/80 px-2 py-0.5 text-[9px] font-extrabold text-slate-700 border border-slate-200/80">
                {isCoin ? "KOIN DAPAY" : "SALDO DAPAY"}
              </span>
            </div>

            <p
              className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${
                isIncome
                  ? "text-emerald-700"
                  : isExpense
                  ? "text-rose-700"
                  : "text-slate-900"
              }`}
            >
              {isIncome
                ? isCoin
                  ? formatSignedCoins(entry.amount)
                  : formatSignedRupiah(entry.amount)
                : isExpense
                ? isCoin
                  ? formatSignedCoins(entry.amount)
                  : formatSignedRupiah(entry.amount)
                : isCoin
                ? formatCoins(entry.amount)
                : formatRupiah(entry.amount)}
            </p>

            <p className="mt-1 text-xs text-slate-600 font-semibold truncate max-w-full px-2">
              {entry.description || "Aktivitas Keuangan"}
            </p>
          </div>

          {/* BALANCE PROGRESSION CARD */}
          {(beforeAmount !== null && beforeAmount !== undefined) ||
          (afterAmount !== null && afterAmount !== undefined) ? (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Perubahan Saldo Akun
              </p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
                  <p className="text-[9px] font-semibold text-slate-400">Saldo Awal</p>
                  <p className="mt-0.5 text-xs sm:text-sm font-black text-slate-800">
                    {beforeAmount !== null && beforeAmount !== undefined
                      ? isCoin
                        ? formatCoins(beforeAmount)
                        : formatRupiah(beforeAmount)
                      : "Rp 0"}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-2.5 shadow-2xs">
                  <p className="text-[9px] font-semibold text-blue-600">Saldo Akhir</p>
                  <p className="mt-0.5 text-xs sm:text-sm font-black text-blue-900">
                    {afterAmount !== null && afterAmount !== undefined
                      ? isCoin
                        ? formatCoins(afterAmount)
                        : formatRupiah(afterAmount)
                      : "Rp 0"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* KEY DETAILS GRID */}
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white p-1">
            {/* ID MUTASI */}
            <div className="flex items-center justify-between p-2.5 text-xs">
              <span className="text-slate-400 font-medium">ID Mutasi</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-slate-900">
                  {log.id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyField(log.id, "ID Mutasi")}
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title="Salin ID Mutasi"
                >
                  {copiedField === "ID Mutasi" ? (
                    <Check size={12} className="text-emerald-600" />
                  ) : (
                    <Copy size={12} className="text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            {/* WAKTU */}
            <div className="flex items-center justify-between p-2.5 text-xs">
              <span className="text-slate-400 font-medium">Waktu Transaksi</span>
              <span className="font-semibold text-slate-900">
                {formatDate(log.created_at)}
              </span>
            </div>

            {/* JENIS */}
            <div className="flex items-center justify-between p-2.5 text-xs">
              <span className="text-slate-400 font-medium">Jenis Mutasi</span>
              <span className="font-bold text-slate-900">{meta.label}</span>
            </div>

            {/* ARUS */}
            <div className="flex items-center justify-between p-2.5 text-xs">
              <span className="text-slate-400 font-medium">Arah Arus</span>
              <span
                className={`font-bold ${
                  isIncome
                    ? "text-emerald-600"
                    : isExpense
                    ? "text-rose-600"
                    : "text-slate-600"
                }`}
              >
                {isIncome ? "Masuk (+)" : isExpense ? "Keluar (-)" : "Netral"}
              </span>
            </div>

            {/* KETERANGAN */}
            <div className="p-2.5 text-xs">
              <span className="text-slate-400 font-medium block mb-1">
                Keterangan Lengkap
              </span>
              <p className="rounded-xl bg-slate-50 p-2.5 text-slate-700 font-medium text-xs border border-slate-100">
                {entry.description || "Tidak ada keterangan tambahan."}
              </p>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-end border-t border-slate-100 px-4 py-3 sm:px-6 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer shadow-2xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
