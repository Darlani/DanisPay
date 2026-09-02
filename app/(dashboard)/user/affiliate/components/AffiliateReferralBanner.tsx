"use client";

import React, { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

interface AffiliateReferralBannerProps {
  referralLink: string;
  referralCode?: string | null;
  onCopy: (text: string, label: string) => void;
}

export default function AffiliateReferralBanner({
  referralLink,
  onCopy,
}: AffiliateReferralBannerProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyLink = () => {
    if (!referralLink) return;
    onCopy(referralLink, "Link Referral");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    if (!referralLink) return;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "DaPay - Program Afiliasi",
          text: "Gabung DaPay melalui link referral saya untuk transaksi produk digital terpercaya.",
          url: referralLink,
        });
        return;
      } catch {
        // User dismissed native share sheet
      }
    }

    // Fallback to copy
    handleCopyLink();
  };

  return (
    <section className="relative mb-4 sm:mb-5 lg:mb-6 overflow-hidden rounded-2xl md:rounded-3xl border border-indigo-300/35 bg-linear-to-br from-[#2563eb] via-[#4f46e5] to-[#7c3aed] p-3.5 xs:p-4 sm:p-5 lg:p-6 text-white shadow-[0_12px_32px_rgba(79,70,229,0.25)] backdrop-blur-none sm:backdrop-blur-xl ring-1 ring-inset ring-white/25">
      {/* Specular glare rim */}
      <div
        className="hidden sm:block pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent"
        aria-hidden="true"
      />

      {/* Subtle ambient orbs */}
      <div
        className="hidden sm:block pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-400/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="hidden sm:block pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-purple-400/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-3.5 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* LEFT COLUMN: TITLE & DESCRIPTION */}
        <div className="max-w-xl">
          <h2 className="text-sm xs:text-base md:text-[clamp(16px,1.8vw,20px)] lg:text-2xl font-black tracking-tight text-white leading-tight drop-shadow-xs">
            Ajak Member & Dapatkan Komisi
          </h2>

          <p className="hidden sm:block mt-1 sm:mt-1.5 text-[9.5px] xs:text-[10.5px] md:text-[clamp(12px,1.35vw,14.5px)] lg:text-xs text-indigo-100/90 leading-relaxed font-medium">
            Bagikan link referral Anda kepada mitra atau pelanggan. Komisi referral otomatis masuk ke{" "}
            <strong className="text-emerald-300 font-bold">Saldo DaPay</strong> dan dapat langsung ditarik.
          </p>
        </div>

        {/* RIGHT COLUMN: REFERRAL LINK BOX & BUTTONS */}
        <div className="w-full lg:max-w-md xl:max-w-lg">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl sm:rounded-2xl border border-white/20 bg-black/15 sm:bg-white/15 p-1.5 sm:p-2 backdrop-blur-none sm:backdrop-blur-md shadow-none sm:shadow-inner">
            <div className="min-w-0 flex-1 px-2.5 py-1">
              <p className="truncate text-xs font-semibold text-indigo-50 font-mono">
                {referralLink || "Memuat link referral..."}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!referralLink}
                aria-label="Salin Link Referral"
                className="flex-1 sm:flex-initial inline-flex h-8.5 sm:h-9 items-center justify-center gap-1.5 rounded-xl bg-white px-3 sm:px-3.5 text-xs font-bold text-indigo-950 shadow-2xs transition sm:hover:bg-indigo-50 active:bg-indigo-100 sm:active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Salin</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareLink}
                disabled={!referralLink}
                aria-label="Bagikan Link Referral"
                className="flex-1 sm:flex-initial inline-flex h-8.5 sm:h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 sm:px-3.5 text-xs font-bold text-white shadow-2xs transition sm:hover:bg-blue-500 active:bg-blue-700 sm:active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Share2 size={14} />
                <span>Bagikan</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
