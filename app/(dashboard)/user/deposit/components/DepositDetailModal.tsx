"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect } from "react";
import {
  Copy,
  CreditCard,
  ExternalLink,
  QrCode,
  Receipt,
  X,
} from "lucide-react";
import {
  Deposit,
  formatDate,
  formatRupiah,
  getDepositId,
  getPaymentMethodLogo,
  getStatusClasses,
  normalizeDepositStatus,
  normalizePaymentName,
  toNumber,
} from "../types";

interface DepositDetailModalProps {
  deposit: Deposit | null;
  onClose: () => void;
  onOpenInstruction?: (deposit: Deposit) => void;
  onCopy: (text: string, label: string) => void;
}

export default function DepositDetailModal({
  deposit,
  onClose,
  onOpenInstruction,
  onCopy,
}: DepositDetailModalProps) {
  // ESC key and body scroll lock
  useEffect(() => {
    if (!deposit) return;

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
  }, [deposit, onClose]);

  if (!deposit) return null;

  const depositId = getDepositId(deposit);
  const status = normalizeDepositStatus(deposit.status);
  const statusStyle = getStatusClasses(status);
  const paymentName = normalizePaymentName(deposit.payment_method);
  const logoUrl = getPaymentMethodLogo(deposit.payment_method);
  const amount = toNumber(deposit.amount);
  const totalAmount = toNumber(deposit.total_amount || deposit.amount);
  const isPending = status === "Pending";
  const isQr =
    deposit.payment_channel === "qris" ||
    deposit.payment_method?.toLowerCase().includes("qris");

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposit-detail-title"
        className="relative flex flex-col w-full max-w-md max-h-[92vh] overflow-hidden rounded-2xl md:rounded-[28px] border border-slate-200/90 bg-white shadow-2xl ring-1 ring-inset ring-white/60 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <Receipt size={18} />
            </div>
            <div className="min-w-0">
              <h2
                id="deposit-detail-title"
                className="text-base sm:text-lg font-black tracking-tight text-slate-950 truncate"
              >
                Rincian Deposit
              </h2>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
                Informasi lengkap transaksi deposit.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Rincian Deposit"
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
              {formatRupiah(totalAmount)}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Nominal Saldo:{" "}
              <strong className="font-bold text-slate-700">
                {formatRupiah(amount)}
              </strong>
            </p>
          </div>

          {/* DETAIL ROWS */}
          <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-white p-3.5 text-xs">
            {/* 1. DEPOSIT ID */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">ID Deposit</span>
              <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                <span className="truncate max-w-40">{depositId}</span>
                {depositId !== "-" && (
                  <button
                    type="button"
                    onClick={() => onCopy(depositId, "ID Deposit")}
                    title="Salin ID Deposit"
                    aria-label="Salin ID Deposit"
                    className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  >
                    <Copy size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* 2. METODE PEMBAYARAN (IMAGE LOGO FROM PUBLIC) */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Metode</span>
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-white p-0.5 shadow-2xs overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={paymentName}
                      className="h-full w-full object-contain"
                    />
                  ) : isQr ? (
                    <QrCode size={13} className="text-emerald-600" />
                  ) : (
                    <CreditCard size={13} className="text-blue-600" />
                  )}
                </div>
                <span>{paymentName}</span>
              </div>
            </div>

            {/* 3. BIAYA LAYANAN (Catatan: Di database/backend kolom ini adalah `unique_code` / kode unik verifikasi) */}
            {deposit.unique_code && Number(deposit.unique_code) > 0 && (
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Biaya Layanan</span>
                <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200/80">
                  +{deposit.unique_code}
                </span>
              </div>
            )}

            {/* 4. WAKTU TRANSAKSI */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-medium">Waktu</span>
              <span className="font-semibold text-slate-700">
                {formatDate(deposit.created_at)}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="space-y-2 pt-1">
            {isPending && onOpenInstruction && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInstruction(deposit);
                }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition active:scale-95 cursor-pointer"
              >
                <span>Lanjutkan Pembayaran</span>
                <ExternalLink size={13} />
              </button>
            )}

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
