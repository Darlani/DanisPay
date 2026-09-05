"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { ActionNotice } from "../types";

interface ProviderActionToastProps {
  notice: ActionNotice | null;
  onDismiss: () => void;
  duration?: number;
}

export default function ProviderActionToast({
  notice,
  onDismiss,
  duration = 3500,
}: ProviderActionToastProps) {
  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [notice, onDismiss, duration]);

  if (!notice) return null;

  const isSuccess = notice.type === "success";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="pointer-events-auto fixed top-16 sm:top-20 right-4 sm:right-6 z-50 flex max-w-md w-[calc(100vw-2rem)] sm:w-auto items-start gap-3 rounded-2xl border bg-slate-950/92 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 overflow-hidden ring-1 ring-white/10"
      style={{
        borderColor: isSuccess ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)",
      }}
    >
      {/* Ambient Glow */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-xl opacity-30"
        style={{
          backgroundColor: isSuccess ? "#10b981" : "#f43f5e",
        }}
      />

      {/* Status Icon with soft background container */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: isSuccess ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
          color: isSuccess ? "#34d399" : "#fb7185",
        }}
      >
        {isSuccess ? (
          <CheckCircle2 size={18} className="text-emerald-400" />
        ) : (
          <AlertCircle size={18} className="text-rose-400" />
        )}
      </div>

      {/* Content Area */}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {isSuccess ? "Aksi Berhasil" : "Aksi Gagal"}
        </p>
        <p className="mt-0.5 text-xs sm:text-[13px] font-medium leading-relaxed text-slate-100 wrap-break-word">
          {notice.message}
        </p>
      </div>

      {/* Manual Dismiss Button */}
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        aria-label="Tutup pemberitahuan"
      >
        <X size={15} />
      </button>

      {/* Countdown Progress Indicator */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10 overflow-hidden">
        <div
          key={`${notice.type}-${notice.message}`}
          className="h-full origin-left transition-all ease-linear"
          style={{
            backgroundColor: isSuccess ? "#10b981" : "#f43f5e",
            animation: `toastCountdown ${duration}ms linear forwards`,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes toastCountdown {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
