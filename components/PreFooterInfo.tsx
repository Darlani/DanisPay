"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Zap, Store, TestTube2 } from "lucide-react";

export default function PreFooterInfo() {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const guestSteps = [
    t("preFooter.guestStep1"),
    t("preFooter.guestStep2"),
    t("preFooter.guestStep3"),
    t("preFooter.guestStep4"),
    t("preFooter.guestStep5"),
  ];

  const memberSteps = [
    t("preFooter.memberStep1"),
    t("preFooter.memberStep2"),
    t("preFooter.memberStep3"),
    t("preFooter.memberStep4"),
    t("preFooter.memberStep5"),
  ];

  const sandboxSteps = [
    t("preFooter.sandboxStep1"),
    t("preFooter.sandboxStep2"),
    t("preFooter.sandboxStep3"),
    t("preFooter.sandboxStep4"),
    t("preFooter.sandboxStep5"),
  ];

  return (
    <section className="bg-[#0b1120] border-t border-slate-800/80 text-slate-300 py-3 sm:py-4 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-2.5">
        {/* JUDUL UTAMA & TOPIK 1 (SELALU TAMPIL SEBAGAI PROFIL UTAMA) */}
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {t("preFooter.mainTitle")}
          </h2>

          {/* TOPIK 1: APA ITU DAPAY? */}
          <div className="space-y-1">
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight">
              {t("preFooter.qWhatIsDaPay")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed text-justify sm:text-left">
              {t("preFooter.aWhatIsDaPay")}
            </p>
          </div>
        </div>

        {/* TOMBOL BACA SELENGKAPNYA JIKA SEDANG TERTUTUP (DI TENGAH DENGAN SPACING COMPACT) */}
        {!isExpanded && (
          <div className="pt-1 flex justify-center">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="px-5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 hover:bg-slate-800 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 text-[11px] sm:text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              {t("preFooter.readMore")}
            </button>
          </div>
        )}

        {/* KONTEN LENGKAP YANG BISA DISEMBUNYIKAN / DIBUKA */}
        {isExpanded && (
          <div className="space-y-3 pt-1.5 animate-in fade-in duration-300">
            {/* TOPIK 2: APA SAJA LAYANAN & PRODUK DI DAPAY? */}
            <div className="space-y-1">
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight">
                {t("preFooter.qWhatServices")}
              </h3>
              <div className="space-y-1.5 text-xs sm:text-sm text-slate-400 leading-relaxed text-justify sm:text-left">
                <p>{t("preFooter.aWhatServices1")}</p>
                <p>{t("preFooter.aWhatServices2")}</p>
              </div>
            </div>

            {/* TOPIK 3: BAGAIMANA DAPAY MENDUKUNG RESELLER, KONTER, DAN UMKM? */}
            <div className="space-y-1">
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight">
                {t("preFooter.qReseller")}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed text-justify sm:text-left">
                {t("preFooter.aReseller")}
              </p>
            </div>

            {/* TOPIK 4: PANDUAN 3 ALUR TRANSAKSI (GUEST STOREFRONT, MEMBER DASHBOARD SATUAN/MASSAL, DAN SANDBOX) */}
            <div className="pt-2 border-t border-slate-800/70 space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {/* 1. TRANSAKSI LANGSUNG (STOREFRONT / GUEST) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Zap size={13} />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight">
                      {t("preFooter.qGuestTrans")}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t("preFooter.guestTransDesc")}
                  </p>
                  <ol className="space-y-1.5 pt-0.5 text-xs text-slate-300 leading-relaxed">
                    {guestSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-slate-300">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* 2. TRANSAKSI MEMBER / RESELLER / UMKM (DASHBOARD SATUAN & MASSAL) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Store size={13} />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight">
                      {t("preFooter.qMemberTrans")}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t("preFooter.memberTransDesc")}
                  </p>
                  <ol className="space-y-1.5 pt-0.5 text-xs text-slate-300 leading-relaxed">
                    {memberSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 text-blue-400 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-slate-300">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* 3. SIMULASI PENGUJIAN (SANDBOX SALDO VIRTUAL) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                      <TestTube2 size={13} />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight">
                      {t("preFooter.qSandbox")}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t("preFooter.sandboxDesc")}
                  </p>
                  <ol className="space-y-1.5 pt-0.5 text-xs text-slate-300 leading-relaxed">
                    {sandboxSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-slate-300">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

              </div>
            </div>

            {/* BARIS RINGKAS LAYANAN DAPAY */}
            <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-bold text-slate-200">
                {t("preFooter.servicesLabel")}:
              </span>
              <span className="text-slate-400 leading-relaxed">
                {t("preFooter.servicesList")}
              </span>
            </div>

            {/* TOMBOL SEMBUNYIKAN (DI TENGAH DENGAN SPACING COMPACT) */}
            <div className="pt-1.5 flex justify-center">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-300 hover:text-white text-[11px] sm:text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                {t("preFooter.showLess")}
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
