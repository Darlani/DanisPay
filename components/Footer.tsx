"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Headphones,
  Search,
  MessageCircle,
  ExternalLink,
  Send,
  Lock,
  Sparkles
} from "lucide-react";
import ContactModal from "./ContactModal";
import { useI18n } from "@/lib/i18n/context";

const SUPPORT_WA_URL = "https://wa.me/6285545213952?text=Halo%20CS%20DaPay,%20saya%20butuh%20bantuan";

export default function Footer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { locale, t } = useI18n();

  const handleOpenHistoryModal = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("openHistoryModal"));
    }
  };

  const homeHref = locale === "en" ? "/en" : "/";
  const newsHref = locale === "en" ? "/en/news" : "/news";
  const promoHref = locale === "en" ? "/en/promo" : "/promo";
  const sandboxHref = locale === "en" ? "/en/sandbox" : "/sandbox";

  return (
    <footer className="bg-[#0b1120] border-t border-slate-800/80 pt-12 pb-10 text-slate-300 relative overflow-hidden">
      {/* Background Subtle Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* TOP CTA BAR */}
        <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-linear-to-r from-slate-900/90 via-slate-850 to-slate-900/90 border border-slate-800 shadow-xl shadow-black/20 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center lg:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{t("footer.systemOperational")} • {t("footer.uptime247")}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {t("footer.ctaTitle")}
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              {t("footer.ctaDesc")}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto justify-center">
            <a
              href={SUPPORT_WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-95"
            >
              <MessageCircle size={17} />
              <span>{t("footer.ctaChatWa")}</span>
            </a>
            <button
              onClick={handleOpenHistoryModal}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm border border-slate-700 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <Search size={16} className="text-blue-400" />
              <span>{t("footer.ctaTrack")}</span>
            </button>
          </div>
        </div>

        {/* MAIN FOUR-COLUMN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-12">
          
          {/* BRAND COLUMN (Span 4) */}
          <div className="lg:col-span-4 space-y-4">
            <Link href={homeHref} className="inline-flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                D
              </div>
              <span className="text-2xl font-black italic tracking-tighter text-white">
                Da<span className="text-blue-500">Pay</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
                Official
              </span>
            </Link>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed pr-2">
              {t("footer.brandDescription")}
            </p>

            {/* Social Channels with Active Links & Badges */}
            <div className="pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Sparkles size={13} className="text-blue-400" />
                {t("footer.communityChannel")}
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href="https://instagram.com/dapay.official"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram DaPay"
                  className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-linear-to-r hover:from-purple-600 hover:to-pink-600 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span>Instagram</span>
                  <ExternalLink size={12} className="opacity-70" />
                </a>
                <a
                  href={SUPPORT_WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp Channel DaPay"
                  className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span>WhatsApp</span>
                  <ExternalLink size={12} className="opacity-70" />
                </a>
                <a
                  href="https://t.me/dapay_official"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Telegram Channel DaPay"
                  className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-sky-600 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span>Telegram</span>
                  <ExternalLink size={12} className="opacity-70" />
                </a>
              </div>
            </div>
          </div>

          {/* SITEMAP / NAV COLUMN (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              {t("footer.sitemapTitle")}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
              <li>
                <Link href={homeHref} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                  {t("navigation.home")}
                </Link>
              </li>
              <li>
                <Link href={newsHref} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                  {t("footer.newsLink")}
                </Link>
              </li>
              <li>
                <Link href={promoHref} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                  {t("footer.promoLink")}
                </Link>
              </li>
              <li>
                <Link href={sandboxHref} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                  {t("footer.sandboxLink")}
                </Link>
              </li>
              <li>
                <button
                  onClick={handleOpenHistoryModal}
                  className="hover:text-blue-400 transition-colors inline-block py-0.5 text-left"
                >
                  {t("footer.checkTransaction")}
                </button>
              </li>
            </ul>
          </div>

          {/* SUPPORT & LEGAL COLUMN (Span 3) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Headphones size={15} className="text-blue-400" />
              {t("footer.helpTitle")}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
              <li>
                <a
                  href={SUPPORT_WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 py-0.5"
                >
                  <span>{t("footer.ourWhatsApp")}</span>
                  <ExternalLink size={12} className="opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@danispay.my.id"
                  className="md:hidden hover:text-blue-400 transition-colors inline-flex items-center gap-1.5 py-0.5"
                >
                  <Send size={13} className="text-slate-400" />
                  <span>{t("footer.contactEmail")}</span>
                </a>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="hidden md:inline-flex items-center gap-1.5 hover:text-blue-400 transition-colors py-0.5 text-left"
                >
                  <Send size={13} className="text-slate-400" />
                  <span>{t("footer.contactEmail")}</span>
                </button>
              </li>
              <li>
                <Link href={homeHref} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                  {t("footer.paymentMethods")}
                </Link>
              </li>
              <li>
                <Link href={homeHref} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                  {t("footer.termsAndConditions")}
                </Link>
              </li>
            </ul>
          </div>

          {/* PAYMENT & TRUST COLUMN (Span 3) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              {t("footer.transactionSecurity")}
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              {t("footer.securityDescription")}
            </p>

            {/* Payment Badges Grid */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { name: "QRIS", color: "text-red-500" },
                { name: "DANA", color: "text-sky-500" },
                { name: "GOPAY", color: "text-emerald-500" },
                { name: "OVO", color: "text-purple-500" },
                { name: "BCA", color: "text-blue-600" },
                { name: "BNI", color: "text-orange-500" },
                { name: "BRI", color: "text-blue-500" },
                { name: "MANDIRI", color: "text-amber-500" },
              ].map((channel) => (
                <div
                  key={channel.name}
                  className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-1 text-center flex items-center justify-center shadow-xs"
                >
                  <span className={`text-[9px] font-black tracking-tight ${channel.color}`}>
                    {channel.name}
                  </span>
                </div>
              ))}
            </div>

            {/* SSL Badge */}
            <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <Lock size={12} className="text-emerald-400 shrink-0" />
              <span>256-Bit SSL End-to-End Encryption</span>
            </div>
          </div>

        </div>

        {/* BOTTOM COPYRIGHT ROW */}
        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
          <p className="text-center sm:text-left">
            {t("footer.copyrightText")}
          </p>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {t("footer.poweredBy")}
          </p>
        </div>
      </div>

      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </footer>
  );
}
