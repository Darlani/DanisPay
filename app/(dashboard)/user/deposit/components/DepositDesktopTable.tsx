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

interface DepositDesktopTableProps {
  deposits: Deposit[];
  onSelectDeposit: (deposit: Deposit) => void;
  onOpenInstruction?: (deposit: Deposit) => void;
  onCopy: (text: string, label: string) => void;
}

export default function DepositDesktopTable({
  deposits,
  onSelectDeposit,
  onOpenInstruction,
  onCopy,
}: DepositDesktopTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
      <div className="overflow-x-auto">
        <table className="w-full min-w-full lg:min-w-230 border-collapse text-left text-xs">
          {/* THEAD */}
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              {/* 1. METODE & ID DEPOSIT (TABLET <1024px) / ID DEPOSIT (DESKTOP ≥1024px) */}
              <th className="py-3.5 pl-3.5 pr-2 sm:pl-4 lg:pr-3 whitespace-nowrap">
                <span className="lg:hidden">Metode & ID Deposit</span>
                <span className="hidden lg:inline">ID Deposit</span>
              </th>

              {/* 2. METODE (DESKTOP ONLY ≥1024px) */}
              <th className="hidden lg:table-cell px-3 py-3.5 whitespace-nowrap">
                Metode
              </th>

              {/* 3. WAKTU TRANSAKSI */}
              <th className="px-2.5 sm:px-3 py-3.5 whitespace-nowrap">
                Waktu Transaksi
              </th>

              {/* 4. NOMINAL SALDO */}
              <th className="px-2.5 sm:px-3 py-3.5 text-right whitespace-nowrap">
                Nominal Saldo
              </th>

              {/* 5. TOTAL TRANSFER */}
              <th className="px-2.5 sm:px-3 py-3.5 text-right whitespace-nowrap">
                Total Transfer
              </th>

              {/* 6. STATUS */}
              <th className="px-2.5 sm:px-3 py-3.5 text-center whitespace-nowrap">
                Status
              </th>

              {/* 7. AKSI (DESKTOP ONLY ≥1024px) */}
              <th className="hidden lg:table-cell py-3.5 pl-3 pr-4 text-center sm:pr-5 whitespace-nowrap">
                Aksi
              </th>
            </tr>
          </thead>

          {/* TBODY */}
          <tbody className="divide-y divide-slate-100/90 text-slate-700">
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
                <tr
                  key={deposit.id}
                  className="group transition-colors duration-150 hover:bg-blue-50/40"
                >
                  {/* 1. METODE & ID DEPOSIT (COMBINED ON TABLET <1024px, ID ONLY ON DESKTOP ≥1024px) */}
                  <td className="py-3 pl-3.5 pr-2 sm:pl-4 lg:pr-3 font-mono align-middle">
                    {/* TABLET VIEW (<1024px): Metode (IMAGE ONLY, no text) + ID Deposit */}
                    <div className="flex lg:hidden items-center gap-2">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-2xs overflow-hidden"
                        title={paymentName}
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={paymentName}
                            className="h-full w-full object-contain"
                          />
                        ) : isQr ? (
                          <QrCode size={14} className="text-emerald-600" />
                        ) : (
                          <CreditCard size={14} className="text-blue-600" />
                        )}
                      </div>

                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-bold text-slate-900 truncate max-w-24 sm:max-w-32">
                          {displayDepositId(depositId)}
                        </span>
                        {depositId !== "-" && (
                          <button
                            type="button"
                            onClick={() => onCopy(depositId, "ID Deposit")}
                            title="Salin ID Deposit"
                            aria-label="Salin ID Deposit"
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-70 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 cursor-pointer"
                          >
                            <Copy size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* DESKTOP VIEW (≥1024px): ID Deposit only (with copy button) */}
                    <div className="hidden lg:flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 truncate max-w-32.5">
                        {displayDepositId(depositId)}
                      </span>
                      {depositId !== "-" && (
                        <button
                          type="button"
                          onClick={() => onCopy(depositId, "ID Deposit")}
                          title="Salin ID Deposit"
                          aria-label="Salin ID Deposit"
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-70 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 cursor-pointer"
                        >
                          <Copy size={11} />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* 2. METODE PEMBAYARAN (DESKTOP ONLY ≥1024px: Image + Text) */}
                  <td className="hidden lg:table-cell px-3 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-2xs overflow-hidden">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={paymentName}
                            className="h-full w-full object-contain"
                          />
                        ) : isQr ? (
                          <QrCode size={14} className="text-emerald-600" />
                        ) : (
                          <CreditCard size={14} className="text-blue-600" />
                        )}
                      </div>
                      <span className="font-bold text-slate-900 truncate max-w-30">
                        {paymentName}
                      </span>
                    </div>
                  </td>

                  {/* 3. WAKTU TRANSAKSI */}
                  <td className="px-2.5 sm:px-3 py-3 text-slate-500 font-medium whitespace-nowrap align-middle">
                    {formatDate(deposit.created_at)}
                  </td>

                  {/* 4. NOMINAL SALDO */}
                  <td className="px-2.5 sm:px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap align-middle">
                    {formatRupiah(amount)}
                  </td>

                  {/* 5. TOTAL TRANSFER */}
                  <td className="px-2.5 sm:px-3 py-3 text-right whitespace-nowrap align-middle">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-slate-950">
                        {formatRupiah(totalAmount)}
                      </span>
                      {/* Catatan: Di database/backend kolom ini adalah `unique_code` (kode unik verifikasi), ditampilkan di UI dengan istilah "Biaya Layanan" */}
                      {deposit.unique_code && Number(deposit.unique_code) > 0 && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          Biaya Layanan: +{deposit.unique_code}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 6. STATUS & AKSI (COMBINED ON TABLET <1024px, STATUS ONLY ON DESKTOP ≥1024px) */}
                  <td className="px-2.5 sm:px-3 py-3 text-center align-middle">
                    {/* TABLET VIEW (<1024px): Status Badge + Action Buttons combined */}
                    <div className="flex lg:hidden flex-col items-center justify-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[9.5px] font-bold ${statusStyle.badge}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                        />
                        {statusStyle.label}
                      </span>

                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectDeposit(deposit)}
                          title="Lihat Detail Deposit"
                          aria-label="Lihat Detail Deposit"
                          className="inline-flex h-6 items-center justify-center rounded-md border border-slate-200/90 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:border-slate-300 hover:bg-slate-50"
                        >
                          <span>Detail</span>
                        </button>

                        {isPending && onOpenInstruction && (
                          <button
                            type="button"
                            onClick={() => onOpenInstruction(deposit)}
                            title="Lanjutkan Pembayaran"
                            aria-label="Lanjutkan Pembayaran"
                            className="inline-flex h-6 items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 text-[10px] font-bold text-white shadow-2xs transition active:scale-95 cursor-pointer hover:bg-emerald-700"
                          >
                            <span>Bayar</span>
                            <ExternalLink size={9} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* DESKTOP VIEW (≥1024px): Status Badge only */}
                    <div className="hidden lg:block">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${statusStyle.badge}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                        />
                        {statusStyle.label}
                      </span>
                    </div>
                  </td>

                  {/* 7. AKSI (DESKTOP ONLY ≥1024px) */}
                  <td className="hidden lg:table-cell py-3 pl-3 pr-4 text-center sm:pr-5 align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectDeposit(deposit)}
                        title="Lihat Detail Deposit"
                        aria-label="Lihat Detail Deposit"
                        className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 text-[11px] font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:border-slate-300 hover:bg-slate-50"
                      >
                        <span>Detail</span>
                      </button>

                      {isPending && onOpenInstruction && (
                        <button
                          type="button"
                          onClick={() => onOpenInstruction(deposit)}
                          title="Lanjutkan Pembayaran"
                          aria-label="Lanjutkan Pembayaran"
                          className="inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-[11px] font-bold text-white shadow-2xs transition active:scale-95 cursor-pointer hover:bg-emerald-700"
                        >
                          <span>Bayar</span>
                          <ExternalLink size={10} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
