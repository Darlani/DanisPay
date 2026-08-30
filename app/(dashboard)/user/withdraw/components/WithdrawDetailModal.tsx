"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  Receipt,
  WalletCards,
  X,
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

interface WithdrawDetailModalProps {
  withdrawal: Withdrawal | null;
  onClose: () => void;
  onCopy: (text: string, label: string) => void;
}

export default function WithdrawDetailModal({
  withdrawal,
  onClose,
  onCopy,
}: WithdrawDetailModalProps) {
  // ESC key and body scroll lock
  useEffect(() => {
    if (!withdrawal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [withdrawal, onClose]);

  if (!withdrawal) return null;

  const status = normalizeWithdrawalStatus(withdrawal.status);
  const statusStyle = getStatusClasses(status);
  const bankName = normalizeBankName(withdrawal.bank_name);
  const logoUrl = getBankLogo(withdrawal.bank_name);
  const maskedAcc = maskAccountNumber(withdrawal.account_number);
  const amount = toNumber(withdrawal.amount);
  const fee = toNumber(withdrawal.admin_fee);
  const heldAmount =
    withdrawal.held_amount !== null && withdrawal.held_amount !== undefined
      ? toNumber(withdrawal.held_amount)
      : amount + fee;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-detail-title"
        className="relative flex flex-col w-full max-w-md max-h-[92vh] overflow-hidden rounded-2xl md:rounded-[28px] border border-slate-200/90 bg-white shadow-2xl ring-1 ring-inset ring-white/60 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs">
              <Receipt size={18} />
            </div>
            <div className="min-w-0">
              <h2
                id="withdraw-detail-title"
                className="text-base sm:text-lg font-black tracking-tight text-slate-950 truncate"
              >
                Rincian Penarikan
              </h2>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
                Informasi status dan mutasi penarikan saldo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Rincian Penarikan"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition active:scale-95 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TOTAL & STATUS CARD */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${statusStyle.badge}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
              />
              {statusStyle.label}
            </span>

            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              {formatRupiah(amount)}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Dana Ditahan:{" "}
              <strong className="font-bold text-indigo-700">
                {formatRupiah(heldAmount)}
              </strong>
            </p>
          </div>

          {/* DETAIL ROWS */}
          <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-white p-3.5 text-xs">
            {/* 1. ID PENARIKAN */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">ID Penarikan</span>
              <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                <span className="truncate max-w-40">{withdrawal.id}</span>
                <button
                  type="button"
                  onClick={() => onCopy(withdrawal.id, "ID Penarikan")}
                  title="Salin ID Penarikan"
                  aria-label="Salin ID Penarikan"
                  className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <Copy size={11} />
                </button>
              </div>
            </div>

            {/* 2. TUJUAN BANK / E-WALLET */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Tujuan</span>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-white p-0.5 shadow-2xs overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={bankName}
                      className="h-full w-full object-contain"
                    />
                  ) : bankName.toLowerCase().includes("bank") ? (
                    <Building2 size={13} className="text-blue-600" />
                  ) : (
                    <WalletCards size={13} className="text-emerald-600" />
                  )}
                </div>
                <span>{bankName}</span>
              </div>
            </div>

            {/* 3. NOMOR REKENING */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Nomor Rekening</span>
              <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                <span>{maskedAcc}</span>
                {withdrawal.account_number && (
                  <button
                    type="button"
                    onClick={() =>
                      onCopy(withdrawal.account_number || "", "Nomor Rekening")
                    }
                    title="Salin Nomor Rekening"
                    aria-label="Salin Nomor Rekening"
                    className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  >
                    <Copy size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* 4. ATAS NAMA */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Atas Nama</span>
              <span className="font-bold text-slate-900">
                {withdrawal.account_name || "-"}
              </span>
            </div>

            {/* 5. NOMINAL PENARIKAN */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Nominal Penarikan</span>
              <span className="font-bold text-slate-900">
                {formatRupiah(amount)}
              </span>
            </div>

            {/* 6. BIAYA ADMIN */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Biaya Admin</span>
              <span className="font-semibold text-slate-700">
                {formatRupiah(fee)}
              </span>
            </div>

            {/* 7. DANA DITAHAN */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Total Dana Ditahan</span>
              <span className="font-bold text-indigo-700">
                {formatRupiah(heldAmount)}
              </span>
            </div>

            {/* 8. WAKTU PENGAJUAN */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-medium">Waktu Pengajuan</span>
              <span className="font-semibold text-slate-700">
                {formatDate(withdrawal.created_at)}
              </span>
            </div>
          </div>

          {/* STATUS NOTICES */}
          {status === "Pending" && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
              <Clock3 size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Pengajuan sedang dalam antrean proses transfer oleh tim finance. Saldo sejumlah nominal + biaya admin ditahan sementara.
              </p>
            </div>
          )}

          {status === "Berhasil" && (
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Penarikan telah berhasil ditransfer ke rekening tujuan Anda. Saldo ditahan telah didebit secara permanen.
              </p>
            </div>
          )}

          {status === "Gagal" && (
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Pengajuan penarikan tidak dapat diproses. Dana yang ditahan telah dikembalikan sepenuhnya ke Saldo DaPay Anda.
              </p>
            </div>
          )}

          {/* CLOSE BUTTON */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

