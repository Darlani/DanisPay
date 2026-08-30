"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import {
  Copy,
  CreditCard,
  ExternalLink,
  QrCode,
} from "lucide-react";
import {
  Deposit,
  displayDepositId,
  formatDate,
  formatRupiah,
  getDepositId,
  getPaymentMethodLogo,
  getStatusClasses,
  normalizeDepositStatus,
  normalizePaymentName,
  toNumber,
} from "../types";

interface DepositMobileCardListProps {
  deposits: Deposit[];
  onSelectDeposit: (deposit: Deposit) => void;
  onOpenInstruction?: (deposit: Deposit) => void;
  onCopy: (text: string, label: string) => void;
}

export default function DepositMobileCardList({
  deposits,
  onSelectDeposit,
  onOpenInstruction,
  onCopy,
}: DepositMobileCardListProps) {
  return (
    <div className="space-y-2 xs:space-y-2.5">
      {deposits.map((deposit) => {
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
          <div
            key={deposit.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl xs:rounded-2xl border border-slate-200/80 bg-white/95 p-3 xs:p-3.5 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 transition-all duration-200 hover:shadow-xs hover:border-slate-300"
          >
            {/* 1. TOP HEADER: METODE (LOGO IMAGE) & STATUS BADGE */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100/90 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-2xs overflow-hidden">
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
                <span className="text-xs font-bold text-slate-900 truncate">
                  {paymentName}
                </span>
              </div>

              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[9.5px] xs:text-[10px] font-bold ${statusStyle.badge}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                />
                {statusStyle.label}
              </span>
            </div>

            {/* 2. MIDDLE CONTENT: NOMINAL TRANSFER & BIAYA LAYANAN */}
            <div className="my-2.5 flex items-end justify-between gap-2">
              <div>
                <p className="text-[9px] xs:text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                  Total Transfer
                </p>
                <p className="mt-0.5 text-base xs:text-lg font-black tracking-tight text-slate-950 leading-tight">
                  {formatRupiah(totalAmount)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[9px] xs:text-[9.5px] font-medium text-slate-400">
                  Nominal Saldo:{" "}
                  <strong className="font-bold text-slate-700">
                    {formatRupiah(amount)}
                  </strong>
                </p>
                {/* Catatan: Di database/backend nilai ini adalah `unique_code` (kode unik verifikasi), ditampilkan di UI sebagai "Biaya Layanan" */}
                {deposit.unique_code && Number(deposit.unique_code) > 0 && (
                  <span className="mt-0.5 inline-block rounded-md bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 font-mono text-[9px] font-bold text-amber-700">
                    Biaya Layanan: +{deposit.unique_code}
                  </span>
                )}
              </div>
            </div>

            {/* 3. BOTTOM ROW: ID, DATE & ACTION BUTTONS */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100/90 pt-2 text-[10px] xs:text-[10.5px]">
              <div className="min-w-0">
                <div className="flex items-center gap-1 font-mono text-slate-500">
                  <span className="font-semibold truncate">
                    {displayDepositId(depositId)}
                  </span>
                  {depositId !== "-" && (
                    <button
                      type="button"
                      onClick={() => onCopy(depositId, "ID Deposit")}
                      title="Salin ID Deposit"
                      aria-label="Salin ID Deposit"
                      className="flex h-4.5 w-4.5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                    >
                      <Copy size={10} />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-[9px] xs:text-[9.5px] text-slate-400 font-medium truncate">
                  {formatDate(deposit.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectDeposit(deposit)}
                  title="Lihat Detail Deposit"
                  aria-label="Lihat Detail Deposit"
                  className="inline-flex h-7 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 text-[10.5px] xs:text-[11px] font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-white"
                >
                  Detail
                </button>

                {isPending && onOpenInstruction && (
                  <button
                    type="button"
                    onClick={() => onOpenInstruction(deposit)}
                    title="Lanjutkan Pembayaran"
                    aria-label="Lanjutkan Pembayaran"
                    className="inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-[10.5px] xs:text-[11px] font-bold text-white shadow-2xs transition active:scale-95 cursor-pointer hover:bg-emerald-700"
                  >
                    <span>Bayar</span>
                    <ExternalLink size={10} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
