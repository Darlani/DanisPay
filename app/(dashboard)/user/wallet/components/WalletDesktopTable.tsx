"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  Eye,
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

interface WalletDesktopTableProps {
  entries: WalletEntry[];
  onSelectEntry: (entry: WalletEntry) => void;
  onCopy: (text: string, label: string) => void;
}

export default function WalletDesktopTable({
  entries,
  onSelectEntry,
  onCopy,
}: WalletDesktopTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string) => {
    await onCopy(id, "ID Mutasi");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="overflow-x-auto scrollbar-none sm:overflow-visible">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            {/* 1. WAKTU & ID */}
            <th className="py-2.5 sm:py-3.5 pl-3 sm:pl-4 pr-1 sm:pr-2 lg:pr-3 font-bold">
              Waktu & ID
            </th>

            {/* 2. TABLET: GABUNGAN JENIS & KETERANGAN */}
            <th className="table-cell lg:hidden px-2 py-2.5 sm:py-3.5 font-bold">
              Jenis & Keterangan
            </th>

            {/* 2. DESKTOP: SEPARATE JENIS */}
            <th className="hidden lg:table-cell px-3 py-3.5 font-bold">
              Jenis
            </th>

            {/* 3. DESKTOP: SEPARATE KETERANGAN */}
            <th className="hidden lg:table-cell px-3 py-3.5 font-bold">
              Keterangan
            </th>

            {/* 4. TABLET: GABUNGAN MASUK & KELUAR */}
            <th className="table-cell lg:hidden px-2 py-2.5 sm:py-3.5 font-bold text-right">
              Arus Mutasi
            </th>

            {/* 4. DESKTOP: SEPARATE MASUK */}
            <th className="hidden lg:table-cell px-3 py-3.5 font-bold text-right text-emerald-700">
              Masuk
            </th>

            {/* 5. DESKTOP: SEPARATE KELUAR */}
            <th className="hidden lg:table-cell px-3 py-3.5 font-bold text-right text-rose-700">
              Keluar
            </th>

            {/* 6. DESKTOP: SEPARATE SALDO AWAL */}
            <th className="hidden lg:table-cell px-3 py-3.5 font-bold text-right">
              Saldo Awal
            </th>

            {/* 7. SALDO AKHIR (DESKTOP) / SALDO AWAL & AKHIR (TABLET GABUNGAN) */}
            <th className="px-2 lg:px-3 py-2.5 sm:py-3.5 font-bold text-right">
              <span className="lg:hidden">Saldo Awal & Akhir</span>
              <span className="hidden lg:inline">Saldo Akhir</span>
            </th>

            {/* 8. AKSI (DESKTOP & TABLET TETAP DITAMPILKAN) */}
            <th className="py-2.5 sm:py-3.5 pl-1 sm:pl-2 pr-3 sm:pr-4 font-bold text-center">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {entries.map((entry) => {
            const meta = getEntryMeta(entry);
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
              <tr
                key={log.id}
                className="group transition hover:bg-slate-50/80 cursor-pointer active:bg-slate-100"
                onClick={() => onSelectEntry(entry)}
              >
                {/* 1. WAKTU & ID */}
                <td
                  className="whitespace-nowrap py-2.5 sm:py-3 pl-3 sm:pl-4 pr-1 sm:pr-2 lg:pr-3 align-middle"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col items-start justify-center">
                    <p className="text-[11.5px] sm:text-xs font-bold text-slate-900 leading-tight">
                      {formatDate(log.created_at)}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="font-mono text-[9.5px] sm:text-[10px] text-slate-400 truncate max-w-20 sm:max-w-25 lg:max-w-27.5">
                        #{log.id.slice(0, 8)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(log.id)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        title="Salin ID Mutasi"
                      >
                        {copiedId === log.id ? (
                          <Check size={11} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} className="text-slate-400 hover:text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </td>

                {/* 2. TABLET: GABUNGAN JENIS & KETERANGAN */}
                <td className="table-cell lg:hidden px-2 py-2.5 sm:py-3 align-middle min-w-35 max-w-55">
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8.5px] font-bold ${meta.badgeClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                        <span>{meta.label}</span>
                      </span>
                      {isCoin && (
                        <span className="rounded-md bg-violet-100 px-1 py-0.2 text-[8px] font-extrabold text-violet-700">
                          KOIN
                        </span>
                      )}
                    </div>
                    <p
                      className="truncate text-[11px] sm:text-[11.5px] font-semibold text-slate-800 max-w-40 sm:max-w-50"
                      title={entry.description}
                    >
                      {entry.description || "-"}
                    </p>
                  </div>
                </td>

                {/* 2. DESKTOP: SEPARATE JENIS */}
                <td className="hidden lg:table-cell whitespace-nowrap px-3 py-3 align-middle">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold ${meta.badgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                      <span>{meta.label}</span>
                    </span>
                    {isCoin && (
                      <span className="inline-flex rounded-md bg-violet-100 px-1 py-0.2 text-[8px] font-extrabold text-violet-700">
                        KOIN
                      </span>
                    )}
                  </div>
                </td>

                {/* 3. DESKTOP: SEPARATE KETERANGAN */}
                <td className="hidden lg:table-cell px-3 py-3 align-middle">
                  <p
                    className="truncate text-xs font-semibold text-slate-800 max-w-60"
                    title={entry.description}
                  >
                    {entry.description || "-"}
                  </p>
                </td>

                {/* 4. TABLET: GABUNGAN MASUK & KELUAR */}
                <td className="table-cell lg:hidden whitespace-nowrap px-2 py-2.5 sm:py-3 text-right align-middle font-bold">
                  {isIncome ? (
                    <span className="text-[11.5px] sm:text-xs font-black text-emerald-600">
                      {isCoin
                        ? formatSignedCoins(entry.amount)
                        : formatSignedRupiah(entry.amount)}
                    </span>
                  ) : isExpense ? (
                    <span className="text-[11.5px] sm:text-xs font-black text-rose-600">
                      {isCoin
                        ? formatSignedCoins(entry.amount)
                        : formatSignedRupiah(entry.amount)}
                    </span>
                  ) : (
                    <span className="text-[11.5px] sm:text-xs font-black text-slate-700">
                      {isCoin ? formatCoins(entry.amount) : formatRupiah(entry.amount)}
                    </span>
                  )}
                </td>

                {/* 4. DESKTOP: SEPARATE MASUK */}
                <td className="hidden lg:table-cell whitespace-nowrap px-3 py-3 text-right align-middle font-bold">
                  {isIncome ? (
                    <span className="text-[11.5px] sm:text-xs font-black text-emerald-600">
                      {isCoin
                        ? formatSignedCoins(entry.amount)
                        : formatSignedRupiah(entry.amount)}
                    </span>
                  ) : (
                    <span className="text-slate-300 font-normal">-</span>
                  )}
                </td>

                {/* 5. DESKTOP: SEPARATE KELUAR */}
                <td className="hidden lg:table-cell whitespace-nowrap px-3 py-3 text-right align-middle font-bold">
                  {isExpense ? (
                    <span className="text-[11.5px] sm:text-xs font-black text-rose-600">
                      {isCoin
                        ? formatSignedCoins(entry.amount)
                        : formatSignedRupiah(entry.amount)}
                    </span>
                  ) : (
                    <span className="text-slate-300 font-normal">-</span>
                  )}
                </td>

                {/* 6. DESKTOP: SEPARATE SALDO AWAL */}
                <td className="hidden lg:table-cell whitespace-nowrap px-3 py-3 text-right text-xs font-medium text-slate-500 align-middle">
                  {beforeAmount !== null && beforeAmount !== undefined
                    ? isCoin
                      ? formatCoins(beforeAmount)
                      : formatRupiah(beforeAmount)
                    : "-"}
                </td>

                {/* 7. SALDO AKHIR & AWAL (TABLET: COMBINED, DESKTOP: SEPARATE) */}
                <td className="whitespace-nowrap px-2 lg:px-3 py-2.5 sm:py-3 text-right align-middle">
                  <div className="flex flex-col items-end justify-center">
                    <span className="text-[11.5px] sm:text-xs font-black text-slate-900">
                      {afterAmount !== null && afterAmount !== undefined
                        ? isCoin
                          ? formatCoins(afterAmount)
                          : formatRupiah(afterAmount)
                        : "-"}
                    </span>
                    {/* Tablet: Show Saldo Awal below Saldo Akhir */}
                    {beforeAmount !== null && beforeAmount !== undefined && (
                      <span className="mt-0.5 text-[9.5px] font-medium text-slate-400 lg:hidden">
                        Awal: {isCoin ? formatCoins(beforeAmount) : formatRupiah(beforeAmount)}
                      </span>
                    )}
                  </div>
                </td>

                {/* 8. AKSI (TAMPIL DI DESKTOP DAN TABLET) */}
                <td className="whitespace-nowrap py-2.5 sm:py-3 pl-1 sm:pl-2 pr-3 sm:pr-4 text-center align-middle">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEntry(entry);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition active:scale-95 cursor-pointer shadow-2xs"
                    title="Lihat Detail Mutasi"
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
