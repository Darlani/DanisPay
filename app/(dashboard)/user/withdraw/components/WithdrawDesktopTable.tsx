"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import {
  Building2,
  Copy,
  Eye,
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

interface WithdrawDesktopTableProps {
  withdrawals: Withdrawal[];
  onSelectWithdrawal: (withdrawal: Withdrawal) => void;
  onCopy: (text: string, label: string) => void;
  isSidebarExpanded?: boolean;
}

export default function WithdrawDesktopTable({
  withdrawals,
  onSelectWithdrawal,
  onCopy,
  isSidebarExpanded = false,
}: WithdrawDesktopTableProps) {
  // TABLET EXPANDED SIDEBAR: 3-COLUMN COMPACT TABLE
  if (isSidebarExpanded) {
    return (
      <div className="overflow-hidden rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full border-collapse text-left text-xs">
            {/* THEAD (3 KOLOM) */}
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                {/* 1. TUJUAN & REKENING */}
                <th className="py-3.5 pl-3.5 pr-2 whitespace-nowrap">
                  Tujuan & Rekening
                </th>

                {/* 2. NOMINAL & DANA DITAHAN */}
                <th className="px-2.5 py-3.5 text-right whitespace-nowrap">
                  Nominal & Dana Ditahan
                </th>

                {/* 3. STATUS & AKSI */}
                <th className="py-3.5 pl-2 pr-3.5 text-center whitespace-nowrap">
                  Status & Aksi
                </th>
              </tr>
            </thead>

            {/* TBODY (3 KOLOM) */}
            <tbody className="divide-y divide-slate-100/90 text-slate-700">
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
                  <tr
                    key={w.id}
                    className="group transition-colors duration-150 hover:bg-rose-50/30"
                  >
                    {/* 1. TUJUAN & REKENING */}
                    <td className="py-3 pl-3.5 pr-2 align-middle">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white p-0.5 shadow-2xs overflow-hidden"
                          title={bankName}
                        >
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={bankName}
                              className="h-full w-full object-contain"
                            />
                          ) : bankName.toLowerCase().includes("bank") ? (
                            <Building2 size={16} className="text-blue-600" />
                          ) : (
                            <WalletCards size={16} className="text-emerald-600" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-32 sm:max-w-40">
                            {bankName}
                          </p>
                          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 mt-0.5">
                            <span className="truncate max-w-24">
                              {maskedAcc}
                            </span>
                            {w.account_number && (
                              <button
                                type="button"
                                onClick={() => onCopy(w.account_number || "", "Nomor Rekening")}
                                title="Salin Nomor Rekening"
                                aria-label="Salin Nomor Rekening"
                                className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 opacity-70 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 cursor-pointer"
                              >
                                <Copy size={9} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. NOMINAL & DANA DITAHAN */}
                    <td className="px-2.5 py-3 text-right whitespace-nowrap align-middle">
                      <p className="font-black text-slate-950">
                        {formatRupiah(amount)}
                      </p>
                      <p className="text-[10px] font-bold text-indigo-700 mt-0.5">
                        Ditahan: {formatRupiah(heldAmount)}
                      </p>
                      <p className="text-[9.5px] font-medium text-slate-400 mt-0.5">
                        {formatDate(w.created_at)}
                      </p>
                    </td>

                    {/* 3. STATUS & AKSI */}
                    <td className="py-3 pl-2 pr-3.5 text-center align-middle">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${statusStyle.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                          />
                          {statusStyle.label}
                        </span>

                        <button
                          type="button"
                          onClick={() => onSelectWithdrawal(w)}
                          title="Lihat Detail Penarikan"
                          aria-label="Lihat Detail Penarikan"
                          className="inline-flex h-6.5 items-center justify-center gap-1 rounded-md border border-slate-200/90 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Eye size={11} />
                          <span>Detail</span>
                        </button>
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

  // STANDARD TABLE: TABLET NAVIGATION RAIL (5 COLUMNS) & DESKTOP ≥1024px (7 COLUMNS)
  return (
    <div className="overflow-hidden rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
      <div className="overflow-x-auto">
        <table className="w-full min-w-full lg:min-w-230 border-collapse text-left text-xs">
          {/* THEAD */}
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              {/* 1. TUJUAN PENARIKAN */}
              <th className="py-3.5 pl-3.5 pr-2 sm:pl-4 lg:pr-3 whitespace-nowrap">
                <span className="lg:hidden">Tujuan & Rekening</span>
                <span className="hidden lg:inline">Tujuan Penarikan</span>
              </th>

              {/* 2. WAKTU PENGAJUAN */}
              <th className="px-2.5 sm:px-3 py-3.5 whitespace-nowrap">
                Waktu
              </th>

              {/* 3. NOMINAL */}
              <th className="px-2.5 sm:px-3 py-3.5 text-right whitespace-nowrap">
                <span className="lg:hidden">Nominal & Fee</span>
                <span className="hidden lg:inline">Nominal</span>
              </th>

              {/* 4. BIAYA ADMIN (DESKTOP ONLY ≥1024px) */}
              <th className="hidden lg:table-cell px-2.5 sm:px-3 py-3.5 text-right whitespace-nowrap">
                Biaya Admin
              </th>

              {/* 5. DANA DITAHAN */}
              <th className="px-2.5 sm:px-3 py-3.5 text-right whitespace-nowrap">
                Dana Ditahan
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
                <tr
                  key={w.id}
                  className="group transition-colors duration-150 hover:bg-rose-50/30"
                >
                  {/* 1. TUJUAN PENARIKAN (LOGO + BANK + REKENING + PEMILIK) */}
                  <td className="py-3 pl-3.5 pr-2 sm:pl-4 lg:pr-3 align-middle">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white p-0.5 shadow-2xs overflow-hidden"
                        title={bankName}
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={bankName}
                            className="h-full w-full object-contain"
                          />
                        ) : bankName.toLowerCase().includes("bank") ? (
                          <Building2 size={16} className="text-blue-600" />
                        ) : (
                          <WalletCards size={16} className="text-emerald-600" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate max-w-32 sm:max-w-40 lg:max-w-48">
                          {bankName}
                        </p>
                        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 mt-0.5">
                          <span className="truncate max-w-24 sm:max-w-30">
                            {maskedAcc}
                          </span>
                          {w.account_number && (
                            <button
                              type="button"
                              onClick={() => onCopy(w.account_number || "", "Nomor Rekening")}
                              title="Salin Nomor Rekening"
                              aria-label="Salin Nomor Rekening"
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 opacity-70 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 cursor-pointer"
                            >
                              <Copy size={9} />
                            </button>
                          )}
                          <span className="truncate hidden sm:inline text-slate-500 font-sans">
                            · {w.account_name || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. WAKTU PENGAJUAN */}
                  <td className="px-2.5 sm:px-3 py-3 text-slate-500 font-medium whitespace-nowrap align-middle">
                    {formatDate(w.created_at)}
                  </td>

                  {/* 3. NOMINAL */}
                  <td className="px-2.5 sm:px-3 py-3 text-right whitespace-nowrap align-middle">
                    <p className="font-black text-slate-950">
                      {formatRupiah(amount)}
                    </p>
                    <span className="lg:hidden text-[9.5px] font-semibold text-slate-400">
                      Fee: {formatRupiah(fee)}
                    </span>
                  </td>

                  {/* 4. BIAYA ADMIN (DESKTOP ONLY ≥1024px) */}
                  <td className="hidden lg:table-cell px-2.5 sm:px-3 py-3 text-right font-semibold text-slate-500 whitespace-nowrap align-middle">
                    {formatRupiah(fee)}
                  </td>

                  {/* 5. DANA DITAHAN */}
                  <td className="px-2.5 sm:px-3 py-3 text-right font-black text-indigo-700 whitespace-nowrap align-middle">
                    {formatRupiah(heldAmount)}
                  </td>

                  {/* 6. STATUS & TABLET ACTION */}
                  <td className="px-2.5 sm:px-3 py-3 text-center align-middle">
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${statusStyle.badge}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                        />
                        {statusStyle.label}
                      </span>

                      {/* Detail button on Tablet (<1024px) */}
                      <button
                        type="button"
                        onClick={() => onSelectWithdrawal(w)}
                        title="Lihat Detail Penarikan"
                        aria-label="Lihat Detail Penarikan"
                        className="inline-flex lg:hidden h-6 items-center justify-center rounded-md border border-slate-200/90 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:border-slate-300 hover:bg-slate-50"
                      >
                        Detail
                      </button>
                    </div>
                  </td>

                  {/* 7. AKSI (DESKTOP ONLY ≥1024px) */}
                  <td className="hidden lg:table-cell py-3 pl-3 pr-4 text-center sm:pr-5 align-middle">
                    <button
                      type="button"
                      onClick={() => onSelectWithdrawal(w)}
                      title="Lihat Detail Penarikan"
                      aria-label="Lihat Detail Penarikan"
                      className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 text-[11px] font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Eye size={12} />
                      <span>Detail</span>
                    </button>
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
