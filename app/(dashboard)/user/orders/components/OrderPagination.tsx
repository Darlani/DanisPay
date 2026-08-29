"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OrderPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
}

export default function OrderPagination({
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
}: OrderPaginationProps) {
  const start = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const end = totalItems === 0 ? 0 : Math.min(page * limit, totalItems);

  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      {/* Items Summary & Limit Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>
          Menampilkan <strong className="font-bold text-slate-800">{start}</strong> -{" "}
          <strong className="font-bold text-slate-800">{end}</strong> dari{" "}
          <strong className="font-bold text-slate-800">{totalItems}</strong> transaksi
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-[11px] text-slate-400">Baris:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label="Jumlah baris per halaman"
              className="h-7 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {/* Pagination Page Jumpers */}
      <div className="flex items-center justify-end gap-1">
        {/* Prev Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 transition active:scale-95 cursor-pointer shadow-2xs"
          aria-label="Halaman Sebelumnya"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Page Numbers */}
        {pages.map((item, index) =>
          item === "..." ? (
            <span
              key={`dots-${index}`}
              className="flex h-8.5 min-w-7 items-center justify-center text-xs text-slate-400"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item as number)}
              className={`inline-flex h-8.5 min-w-8.5 items-center justify-center rounded-lg border text-xs font-bold transition active:scale-95 cursor-pointer ${
                item === page
                  ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 shadow-2xs"
              }`}
            >
              {item}
            </button>
          ),
        )}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 transition active:scale-95 cursor-pointer shadow-2xs"
          aria-label="Halaman Berikutnya"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function buildPageNumbers(
  current: number,
  total: number,
): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, "...", total];
  }

  if (current >= total - 2) {
    return [1, "...", total - 3, total - 2, total - 1, total];
  }

  return [1, "...", current - 1, current, current + 1, "...", total];
}

