"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";
import { SelectedError, formatDateTime } from "../types";

interface ProviderErrorModalProps {
  error: SelectedError | null;
  onClose: () => void;
}

export default function ProviderErrorModal({
  error,
  onClose,
}: ProviderErrorModalProps) {
  if (!error) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 text-rose-600">
            <AlertCircle size={20} />
            <h3 className="font-bold text-slate-900 text-base">
              Detail Telemetri Error
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal error"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
          <div>
            <span className="font-semibold text-slate-700">Provider:</span>{" "}
            {error.name} ({error.code})
          </div>
          <div>
            <span className="font-semibold text-slate-700">Waktu:</span>{" "}
            {formatDateTime(error.time)}
          </div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
            Pesan Kesalahan:
          </p>
          <p className="mt-1 font-mono text-xs text-rose-900 break-words leading-relaxed whitespace-pre-wrap">
            {error.error}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

