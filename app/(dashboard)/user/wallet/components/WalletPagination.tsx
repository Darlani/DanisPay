"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WalletPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
}

export default function WalletPagination({
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
}: WalletPaginationProps) {
  const start = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const end = totalItems === 0 ? 0 : Math.min(page * limit, totalItems);

  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      {/* Items Summary & Limit Selector */}
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500 sm:justify-start">
        <span>
          Menampilkan <strong className="font-bold text-slate-900">{start}</strong>–
          <strong className="font-bold text-slate-900">{end}</strong> dari{" "}
          <strong className="font-bold text-slate-900">{totalItems}</strong> mutasi
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="hidden xs:inline text-slate-400">Baris:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label="Jumlah baris per halaman"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:bg-white cursor-pointer shadow-2xs"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center justify-center gap-1 self-center sm:self-auto">
        {/* Prev Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs font-bold text-slate-400 select-none"
                >
                  …
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === page;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs ${
                  isActive
                    ? "bg-blue-600 text-white shadow-blue-500/20"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
          title="Halaman Berikutnya"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function buildPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: (number | "ellipsis")[] = [];

  // Always show first page
  items.push(1);

  if (currentPage > 3) {
    items.push("ellipsis");
  }

  // Middle window
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    items.push(i);
  }

  if (currentPage < totalPages - 2) {
    items.push("ellipsis");
  }

  // Always show last page
  items.push(totalPages);

  return items;
}

