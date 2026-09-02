"use client";

import React from "react";
import { Coins, Crown, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { formatMemberType, formatRupiah, getInitial, UserProfile } from "../types";

interface SettingsHeroCardProps {
  profile: UserProfile;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function SettingsHeroCard({
  profile,
  isRefreshing,
  onRefresh,
}: SettingsHeroCardProps) {
  const memberLabel = formatMemberType(profile.member_type);
  const initialLetter = getInitial(profile.full_name, profile.email);
  const isSpecialOrGold =
    (profile.member_type || "").trim().toLowerCase() === "special" ||
    (profile.member_type || "").trim().toLowerCase() === "gold";

  return (
    <section className="relative mb-4 sm:mb-5 lg:mb-6 overflow-hidden rounded-2xl md:rounded-[24px] border border-indigo-300/35 bg-linear-to-br from-[#2563eb] via-[#4f46e5] to-[#7c3aed] p-3.5 xs:p-4 sm:p-5 lg:p-6 text-white shadow-[0_12px_32px_rgba(79,70,229,0.25)] backdrop-blur-xl ring-1 ring-inset ring-white/25">
      {/* Specular glare rim */}
      <div
        className="hidden sm:block pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent"
        aria-hidden="true"
      />

      {/* Ambient glass glow orbs */}
      <div
        className="hidden sm:block pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-400/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="hidden sm:block pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-purple-400/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-3.5 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* LEFT: AVATAR & USER IDENTITY */}
        <div className="flex items-center gap-3 xs:gap-3.5 sm:gap-4 min-w-0">
          {/* Avatar Ring */}
          <div className="relative flex h-13 w-13 xs:h-14 xs:w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-white/30 via-white/15 to-white/5 text-xl sm:text-2xl font-black text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_8px_20px_rgba(0,0,0,0.2)] ring-2 ring-white/40 backdrop-blur-md">
            {profile.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "Avatar"}
                className="h-full w-full object-cover rounded-2xl"
              />
            ) : (
              <span>{initialLetter}</span>
            )}
            {isSpecialOrGold && (
              <span
                title={memberLabel}
                className="absolute -bottom-1 -right-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-xs ring-2 ring-white"
              >
                <Crown size={11} className="sm:h-3.5 sm:w-3.5 fill-amber-950" />
              </span>
            )}
          </div>

          {/* Text Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="truncate text-base xs:text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white leading-tight">
                {profile.full_name || "Member DaPay"}
              </h1>

              {/* Authoritative Membership Badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] xs:text-[10px] font-bold tracking-wider uppercase backdrop-blur-md shadow-2xs ${
                  isSpecialOrGold
                    ? "border border-amber-300/40 bg-amber-400/25 text-amber-200 ring-1 ring-amber-300/30"
                    : "border border-white/30 bg-white/15 text-blue-100 ring-1 ring-white/20"
                }`}
              >
                <ShieldCheck size={10} className="shrink-0" />
                <span>{memberLabel}</span>
              </span>
            </div>

            <p className="mt-0.5 truncate text-xs sm:text-sm font-medium text-indigo-100/80">
              {profile.email || "Email akun terverifikasi"}
            </p>
          </div>
        </div>

        {/* RIGHT: ASSET PILLS & REFRESH BUTTON */}
        <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 flex-wrap lg:flex-nowrap">
          {/* Saldo DaPay Pill */}
          <div className="flex-1 sm:flex-initial flex items-center gap-2 rounded-xl sm:rounded-2xl border border-white/20 bg-black/15 sm:bg-white/15 px-3 py-1.5 sm:px-3.5 sm:py-2 backdrop-blur-md shadow-inner min-w-0">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <Wallet size={14} className="sm:h-4 sm:w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[8.5px] xs:text-[9px] font-bold uppercase tracking-wider text-indigo-100/75">
                Saldo DaPay
              </p>
              <p className="truncate text-xs xs:text-sm font-black text-white font-mono">
                {formatRupiah(profile.balance)}
              </p>
            </div>
          </div>

          {/* Koin DaPay Pill */}
          {profile.coin_balance !== undefined && profile.coin_balance !== null && (
            <div className="hidden xs:flex flex-1 sm:flex-initial items-center gap-2 rounded-xl sm:rounded-2xl border border-white/20 bg-black/15 sm:bg-white/15 px-3 py-1.5 sm:px-3.5 sm:py-2 backdrop-blur-md shadow-inner min-w-0">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300 border border-amber-300/30">
                <Coins size={14} className="sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[8.5px] xs:text-[9px] font-bold uppercase tracking-wider text-indigo-100/75">
                  Koin DaPay
                </p>
                <p className="truncate text-xs xs:text-sm font-black text-white font-mono">
                  {Number(profile.coin_balance || 0).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          )}

          {/* Silent Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Sinkronkan data pengaturan"
            aria-label="Sinkronkan data pengaturan"
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-white/25 bg-white/15 text-white shadow-2xs transition hover:bg-white/25 active:scale-95 disabled:opacity-50 cursor-pointer backdrop-blur-md"
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </section>
  );
}
