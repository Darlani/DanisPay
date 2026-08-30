"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WithdrawPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function WithdrawPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: WithdrawPaginationProps) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  // Generate pagination pills
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 3) {
      return [1, 2, 3, 4, "...", totalPages];
    }
    if (page >= totalPages - 2) {
      return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
      <p className="text-slate-500 font-medium text-[11px] sm:text-xs text-center sm:text-left">
        Menampilkan <strong className="font-bold text-slate-800">{start}</strong> -{" "}
        <strong className="font-bold text-slate-800">{end}</strong> dari{" "}
        <strong className="font-bold text-slate-800">{totalItems}</strong> pengajuan
      </p>

      <div className="flex items-center gap-1.5">
        {/* PREV BUTTON */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
        >
          <ChevronLeft size={14} />
        </button>

        {/* PAGE NUMBERS */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span
                key={`dots-${idx}`}
                className="flex h-8 w-6 items-center justify-center text-slate-400 font-bold"
              >
                ...
              </span>
            ) : (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(Number(p))}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Ke halaman ${p}`}
                className={`flex h-8 min-w-8 items-center justify-center rounded-xl px-2 text-xs font-bold transition active:scale-95 cursor-pointer ${
                  p === page
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ),
          )}
        </div>

        {/* NEXT BUTTON */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

