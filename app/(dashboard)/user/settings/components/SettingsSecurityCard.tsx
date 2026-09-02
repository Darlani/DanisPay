"use client";

import React, { useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

interface SettingsSecurityCardProps {
  onUpdatePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<boolean>;
}

export default function SettingsSecurityCard({
  onUpdatePassword,
}: SettingsSecurityCardProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation rules
  const isMinLength = newPassword.length >= 8;
  const isDifferent = Boolean(newPassword && currentPassword && newPassword !== currentPassword);
  const isMatching = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const canSubmit = isMinLength && isMatching && Boolean(currentPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onUpdatePassword(currentPassword, newPassword, confirmPassword);
    setIsSubmitting(false);

    if (success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 p-3.5 xs:p-4 sm:p-5 md:p-6 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
      <form onSubmit={handleSubmit} className="space-y-3.5 xs:space-y-4 sm:space-y-4.5">
        {/* 1. PASSWORD SAAT INI */}
        <div>
          <label
            htmlFor="security-current-password"
            className="mb-1.5 block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600"
          >
            Password Saat Ini <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <KeyRound
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="security-current-password"
              type={showCurrent ? "text" : "password"}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Masukkan password akun Anda saat ini"
              autoComplete="current-password"
              aria-label="Password Saat Ini"
              className="h-10 sm:h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              aria-label={showCurrent ? "Sembunyikan password" : "Lihat password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-slate-400">
            Dibutuhkan untuk memvalidasi kepemilikan akun sebelum password baru disimpan.
          </p>
        </div>

        {/* 2. PASSWORD BARU & KONFIRMASI (GRID) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Password Baru */}
          <div>
            <label
              htmlFor="security-new-password"
              className="mb-1.5 block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600"
            >
              Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="security-new-password"
                type={showNew ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                aria-label="Password Baru"
                className="h-10 sm:h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? "Sembunyikan password baru" : "Lihat password baru"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label
              htmlFor="security-confirm-password"
              className="mb-1.5 block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600"
            >
              Konfirmasi Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="security-confirm-password"
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                aria-label="Konfirmasi Password Baru"
                className="h-10 sm:h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Sembunyikan konfirmasi password" : "Lihat konfirmasi password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* 3. CHECKLIST SYARAT PASSWORD */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:p-3.5 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Ketentuan Keamanan Password:
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isMinLength ? "bg-emerald-100 text-emerald-600 font-bold" : "bg-slate-200 text-slate-400"
                }`}
              >
                <Check size={11} />
              </span>
              <span className={isMinLength ? "text-slate-700 font-medium" : "text-slate-400"}>
                Panjang minimal 8 karakter
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isDifferent ? "bg-emerald-100 text-emerald-600 font-bold" : "bg-slate-200 text-slate-400"
                }`}
              >
                <Check size={11} />
              </span>
              <span className={isDifferent ? "text-slate-700 font-medium" : "text-slate-400"}>
                Berbeda dari password saat ini
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isMatching ? "bg-emerald-100 text-emerald-600 font-bold" : "bg-slate-200 text-slate-400"
                }`}
              >
                <Check size={11} />
              </span>
              <span className={isMatching ? "text-slate-700 font-medium" : "text-slate-400"}>
                Konfirmasi password cocok
              </span>
            </div>
          </div>
        </div>

        {/* 4. SECURITY NOTICE BOX */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-800">
          <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] sm:text-xs">
            Jangan pernah membagikan password, kode OTP, atau PIN transaksi Anda kepada siapapun, termasuk pihak yang mengatasnamakan admin DaPay.
          </p>
        </div>

        {/* 5. SUBMIT BUTTON */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 sm:px-6 text-xs sm:text-sm font-bold text-white shadow-2xs transition active:scale-95 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Memvalidasi...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={15} />
                <span>Perbarui Password</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

