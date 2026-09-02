"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";

interface HelpContactSupportCardProps {
  onOpenWhatsApp: () => void;
  onCopyTemplate: (customText?: string) => Promise<void>;
  copied: boolean;
  isWhatsappAvailable: boolean;
}

const HelpContactSupportCard = React.forwardRef<HTMLDivElement, HelpContactSupportCardProps>(
  function HelpContactSupportCard(
    { onOpenWhatsApp, onCopyTemplate, copied, isWhatsappAvailable },
    ref
  ) {
    const [templateText, setTemplateText] = useState(
      "Halo Admin DaPay, saya ingin meminta bantuan terkait [jelaskan masalah Anda]. Terima kasih."
    );

    return (
      <div
        ref={ref}
        className="flex flex-col justify-between rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white/95 p-3.5 xs:p-4 sm:p-5 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 min-w-0 self-start"
      >
        <div>
          {/* Header */}
          <div className="mb-3.5 pb-3 border-b border-slate-100">
            <h2 className="text-sm xs:text-base font-black tracking-tight text-slate-900 leading-tight">
              Masih butuh bantuan?
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Tim support kami siap membantu Anda
            </p>
          </div>

          {/* 1. SECURITY NOTICE CALLOUT */}
          <div className="mb-3.5 flex items-start gap-2.5 rounded-xl sm:rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3 sm:p-3.5 text-xs text-emerald-900 shadow-2xs">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-700">
              <ShieldCheck size={16} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="font-bold leading-tight">
                Jaga Keamanan Akun Anda
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-800/90">
                Jangan pernah membagikan OTP, PIN, Password, atau kode verifikasi kepada siapapun termasuk pihak yang mengaku dari DaPay.
              </p>
            </div>
          </div>

          {/* 2. TEMPLATE PESAN BOX */}
          <div className="mb-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="support-template-textarea"
                className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600"
              >
                Template Pesan (Opsional)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Bisa diedit</span>
            </div>

            <textarea
              id="support-template-textarea"
              rows={2}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              placeholder="Tulis pesan bantuan..."
              className="w-full resize-none rounded-xl border border-slate-200/90 bg-slate-50/80 p-2 sm:p-2.5 text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 min-h-14 sm:min-h-18"
            />
          </div>

          {/* 3. BUTTONS ROW (Equal Height & Dynamic Flex Proportions) */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 w-full items-stretch">
            {/* Salin Template (Compact & Proportional) */}
            <button
              type="button"
              onClick={() => void onCopyTemplate(templateText)}
              className="inline-flex h-9 sm:h-10 w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200/90 bg-white px-3 sm:px-3.5 text-xs font-bold text-slate-700 shadow-2xs transition active:scale-95 hover:bg-slate-50 hover:border-slate-300 cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-600">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="text-slate-500" />
                  <span>Salin Template</span>
                </>
              )}
            </button>

            {/* Hubungi Admin (Equal Height h-9 on mobile, flex-1 on sm+) */}
            <button
              type="button"
              onClick={onOpenWhatsApp}
              className={`inline-flex h-9 sm:h-10 w-full sm:flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 text-xs font-bold text-white shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap min-w-0 ${
                isWhatsappAvailable
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-slate-400 cursor-not-allowed"
              }`}
            >
              <Image
                src="/Bantuan/whatsapp.png"
                alt="WhatsApp"
                width={18}
                height={18}
                className="h-4 sm:h-4.5 w-4 sm:w-4.5 shrink-0 object-contain"
              />
              <span className="truncate">Hubungi Admin</span>
              <ExternalLink size={12} className="opacity-75 shrink-0" />
            </button>
          </div>
        </div>

        {/* 4. FOOTER OPERATIONAL HOURS */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 text-center">
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
            Jam operasional: Senin - Minggu, 08.00 - 22.00 WIB
          </p>
        </div>
      </div>
    );
  }
);

export default HelpContactSupportCard;
