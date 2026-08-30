"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DepositPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
  onPage: (page: number) => void;
}

export default function DepositPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPrevious,
  onNext,
  onPage,
}: DepositPaginationProps) {
  if (totalPages <= 1 && totalItems <= pageSize) {
    return null;
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(page - 1);
        pages.push(page);
        pages.push(page + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-2 text-xs text-slate-500">
      {/* Information string */}
      <p className="text-[11px] xs:text-xs font-medium">
        Menampilkan{" "}
        <strong className="font-bold text-slate-800">
          {totalItems > 0 ? `${startItem}-${endItem}` : 0}
        </strong>{" "}
        dari{" "}
        <strong className="font-bold text-slate-800">{totalItems}</strong>{" "}
        data deposit
      </p>

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page <= 1}
          aria-label="Halaman Sebelumnya"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>

        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-8 w-6 items-center justify-center text-xs font-bold text-slate-400"
              >
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === page;

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPage(pageNum)}
              aria-label={`Halaman ${pageNum}`}
              className={`flex h-8 min-w-8 px-2 items-center justify-center rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                isActive
                  ? "border border-blue-500 bg-blue-600 text-white shadow-2xs"
                  : "border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          aria-label="Halaman Selanjutnya"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition active:scale-95 cursor-pointer hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

