"use client";

import React, { useEffect } from "react";
import { Check, Copy, UsersRound, X } from "lucide-react";
import { Referral, formatDateTime, getInitial, maskEmail } from "../types";

interface AffiliateDetailModalProps {
  referral: Referral | null;
  onClose: () => void;
  onCopy: (text: string, label: string) => void;
}

export default function AffiliateDetailModal({
  referral,
  onClose,
  onCopy,
}: AffiliateDetailModalProps) {
  // ESC key and body scroll lock
  useEffect(() => {
    if (!referral) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [referral, onClose]);

  if (!referral) return null;

  const name = referral.full_name || "Member Baru";
  const initial = getInitial(name);
  const masked = maskEmail(referral.email);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="referral-detail-title"
        className="relative flex flex-col w-full max-w-md max-h-[92vh] overflow-hidden rounded-2xl md:rounded-[28px] border border-slate-200/90 bg-white shadow-2xl ring-1 ring-inset ring-white/60 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
              <UsersRound size={18} />
            </div>
            <div className="min-w-0">
              <h2
                id="referral-detail-title"
                className="text-base sm:text-lg font-black tracking-tight text-slate-950 truncate"
              >
                Detail Member Referral
              </h2>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
                Informasi member yang terdaftar di jaringan Anda.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Rincian Member"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition active:scale-95 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* PROFILE SUMMARY CARD */}
          <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 text-base font-black text-white shadow-sm">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-black text-base text-slate-950 truncate">
                {name}
              </h3>
              <p className="text-xs font-mono text-slate-500 truncate">
                {masked}
              </p>
            </div>

            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Terdaftar
            </span>
          </div>

          {/* DETAIL ROWS */}
          <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-white p-3.5 text-xs">
            {/* 1. NAMA LENGKAP */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Nama Member</span>
              <span className="font-bold text-slate-900">{name}</span>
            </div>

            {/* 2. EMAIL (MASKED & COPY OPTION) */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Email Member</span>
              <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                <span>{masked}</span>
                {referral.email && (
                  <button
                    type="button"
                    onClick={() => onCopy(referral.email || "", "Email Member")}
                    title="Salin Email Member"
                    aria-label="Salin Email Member"
                    className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  >
                    <Copy size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* 3. TANGGAL BERGABUNG */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Tanggal Bergabung</span>
              <span className="font-semibold text-slate-700">
                {formatDateTime(referral.created_at)}
              </span>
            </div>

            {/* 4. STATUS HUBUNGAN */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-medium">Status Hubungan</span>
              <span className="font-bold text-emerald-700">Direct Referral</span>
            </div>
          </div>

          {/* STATUS NOTICE */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 text-xs text-emerald-800 flex items-start gap-2.5">
            <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Member ini terdaftar secara resmi menggunakan link/kode referral Anda. Transaksi yang memenuhi syarat dari member ini akan menghasilkan komisi langsung ke Saldo DaPay Anda.
            </p>
          </div>

          {/* CLOSE BUTTON */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

