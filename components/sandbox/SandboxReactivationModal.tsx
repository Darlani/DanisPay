"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";

interface SandboxReactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  lockType?: "conversion" | "inactivity" | "other" | "revoked";
}

export default function SandboxReactivationModal({
  isOpen,
  onClose,
  onSuccess,
  lockType = "other",
}: SandboxReactivationModalProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmitRequest = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/tester/reactivation-request", {
        method: "POST",
        headers,
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        let msg = "Gagal mengirimkan pengajuan reaktivasi Sandbox.";
        if (body.error) {
          if (body.error.includes("MANAGEMENT_PERSONA")) {
            msg = "Akun Admin/Manager tidak dapat mengajukan reaktivasi Sandbox Pelanggan.";
          } else if (body.error.includes("SANDBOX_REACTIVATION_NOT_ALLOWED")) {
            msg = "Status akun Anda saat ini tidak memenuhi syarat untuk reaktivasi Sandbox.";
          } else if (body.error.includes("REACTIVATION_USER_NOT_FOUND")) {
            msg = "Data akun tidak ditemukan. Silakan masuk kembali.";
          } else {
            msg = body.error;
          }
        }
        throw new Error(msg);
      }

      // Notify components that session/reactivation state changed
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sandboxSessionChanged"));
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses permohonan. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reactivation-modal-title"
      aria-describedby="reactivation-modal-description"
    >
      <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white p-4.5 sm:p-6 shadow-2xl border border-slate-100 text-slate-900 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Tutup modal permohonan reaktivasi"
          className="absolute right-3.5 top-3.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header Section */}
        <div className="flex items-start gap-3 mb-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20">
            <RotateCcw size={20} />
          </div>
          <div className="min-w-0 pr-6">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-900 border border-amber-300 mb-1">
              Reaktivasi Sandbox
            </span>
            <h2
              id="reactivation-modal-title"
              className="text-sm sm:text-base font-black text-slate-950 leading-tight"
            >
              Ajukan Pembukaan Akses Sandbox
            </h2>
            <p
              id="reactivation-modal-description"
              className="text-[11px] text-slate-500 mt-0.5 leading-snug"
            >
              {lockType === "conversion"
                ? "Permintaan akses tambahan ke lingkungan simulasi untuk akun Member LIVE."
                : lockType === "inactivity"
                ? "Permintaan pembukaan kembali akses Sandbox yang terkunci karena tidak aktif."
                : "Pengajuan permohonan peninjauan kembali akses simulasi Sandbox kepada manajemen."}
            </p>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 sm:p-3 text-xs text-rose-800 border border-rose-200 mb-3 animate-in fade-in duration-150">
            <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* 7 Transparency Disclosures */}
        <div className="space-y-2 rounded-2xl bg-slate-50 p-3 sm:p-3.5 border border-slate-200/80 mb-4 text-xs text-slate-700">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            Ketentuan & Penjelasan Pengajuan (Transparansi Penuh):
          </p>

          <div className="flex items-start gap-2">
            <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">Persetujuan Manajemen:</strong> Pengajuan wajib diverifikasi dan disetujui terlebih dahulu oleh Admin/Manager.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">Tidak Langsung Aktif:</strong> Mengirim pengajuan tidak serta-merta membuka akses Sandbox seketika.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">Status Akun Utuh:</strong> Keanggotaan Member LIVE dan data profil Anda tetap aktif dan tidak berubah.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">Bebas Risiko Finansial:</strong> Saldo kas riil DaPay Anda 100% aman dan tidak tersentuh proses ini.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">Saldo Tetap Virtual:</strong> Saldo virtual dan Koin Sandbox tetap terisolasi di Sandbox dan tidak dapat diuangkan.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">Riwayat Tersimpan:</strong> Riwayat simulasi pesanan Sandbox sebelumnya tetap aman tersimpan.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong className="text-slate-900">Satu Pengajuan:</strong> Sistem hanya memproses 1 permohonan aktif per akun untuk mencegah duplikasi.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col xs:flex-row items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full xs:flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50 text-center"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmitRequest}
            disabled={isLoading}
            className="w-full xs:flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin text-slate-950" />
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <span>Kirim Pengajuan</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}