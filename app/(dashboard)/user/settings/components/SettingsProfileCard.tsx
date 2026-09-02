"use client";

import React, { useState } from "react";
import { Check, Loader2, Lock, Mail, QrCode, Shield, User } from "lucide-react";
import { formatMemberType, UserProfile } from "../types";

interface SettingsProfileCardProps {
  profile: UserProfile;
  onSaveProfile: (fullName: string) => Promise<boolean>;
}

export default function SettingsProfileCard({
  profile,
  onSaveProfile,
}: SettingsProfileCardProps) {
  const [prevFullName, setPrevFullName] = useState(profile.full_name);
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  // Sync state when profile loads/updates without useEffect
  if (profile.full_name !== prevFullName) {
    setPrevFullName(profile.full_name);
    setFullName(profile.full_name || "");
    setHasChanged(false);
  }

  const handleNameChange = (val: string) => {
    setFullName(val);
    setHasChanged(val.trim() !== (profile.full_name || "").trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanged || isSaving) return;

    setIsSaving(true);
    const success = await onSaveProfile(fullName);
    setIsSaving(false);
    if (success) {
      setHasChanged(false);
    }
  };

  return (
    <div className="rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 p-3.5 xs:p-4 sm:p-5 md:p-6 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
      <form onSubmit={handleSubmit} className="space-y-3.5 xs:space-y-4 sm:space-y-4.5">
        {/* 1. NAMA LENGKAP (EDITABLE) */}
        <div>
          <label
            htmlFor="profile-full-name"
            className="mb-1.5 block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600"
          >
            Nama Lengkap
          </label>
          <div className="relative">
            <User
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="profile-full-name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={fullName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Masukkan nama lengkap Anda"
              aria-label="Nama Lengkap"
              className="h-10 sm:h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-4 text-xs sm:text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-slate-400">
            Nama ini akan digunakan pada struk transaksi dan mutasi akun.
          </p>
        </div>

        {/* 2. EMAIL (READ-ONLY) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="profile-email"
              className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600"
            >
              Email Akun
            </label>
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-400">
              <Lock size={10} />
              <span>Permanen</span>
            </span>
          </div>
          <div className="relative">
            <Mail
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="profile-email"
              type="email"
              readOnly
              value={profile.email || "-"}
              aria-label="Email Akun"
              tabIndex={-1}
              className="h-10 sm:h-11 w-full rounded-xl border border-slate-200/70 bg-slate-100/80 pl-10 pr-4 text-xs sm:text-sm font-medium text-slate-600 cursor-not-allowed select-all"
            />
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-slate-400">
            Email digunakan sebagai identitas login utama dan tidak dapat diubah secara bebas demi keamanan akun.
          </p>
        </div>

        {/* 3. KODE REFERRAL & TIPE MEMBER (READ-ONLY GRID) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
          {/* Kode Referral */}
          <div>
            <label
              htmlFor="profile-ref-code"
              className="mb-1.5 block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600"
            >
              Kode Referral Saya
            </label>
            <div className="relative">
              <QrCode
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="profile-ref-code"
                type="text"
                readOnly
                value={profile.referral_code || "-"}
                aria-label="Kode Referral Saya"
                tabIndex={-1}
                className="h-10 sm:h-11 w-full rounded-xl border border-slate-200/70 bg-slate-100/80 pl-10 pr-4 font-mono text-xs sm:text-sm font-bold text-slate-700 uppercase cursor-not-allowed select-all"
              />
            </div>
          </div>

          {/* Status Keanggotaan */}
          <div>
            <label
              htmlFor="profile-membership"
              className="mb-1.5 block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600"
            >
              Status Keanggotaan
            </label>
            <div className="relative">
              <Shield
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="profile-membership"
                type="text"
                readOnly
                value={formatMemberType(profile.member_type)}
                aria-label="Status Keanggotaan"
                tabIndex={-1}
                className="h-10 sm:h-11 w-full rounded-xl border border-slate-200/70 bg-slate-100/80 pl-10 pr-4 text-xs sm:text-sm font-bold text-slate-700 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* 4. SAVE BUTTON */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={!hasChanged || isSaving}
            className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 sm:px-6 text-xs sm:text-sm font-bold text-white shadow-2xs transition active:scale-95 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
