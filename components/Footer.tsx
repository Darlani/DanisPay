"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Search,
  MessageCircle,
  Send,
  Instagram,
  Facebook,
  Twitter,
  ChevronRight,
  Wallet
} from "lucide-react";
import ContactModal from "./ContactModal";
import PreFooterInfo from "./PreFooterInfo";
import DaPayCoin from "@/components/dapay/DaPayCoin";
import { useI18n } from "@/lib/i18n/context";
import { localizeHref } from "@/lib/i18n/config";
import { getWhatsAppUrl } from "@/utils/storeConfig";

function TikTokIcon({ size = 15, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47c1.37-1.37 2.18-3.23 2.18-5.17V8.76a8.27 8.27 0 0 0 4.59 1.38V6.69z" />
    </svg>
  );
}

export default function Footer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { locale, t } = useI18n();
  const pathname = usePathname();

  const handleOpenHistoryModal = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("openHistoryModal"));
    }
  };

  const homeHref = locale === "en" ? "/en" : "/";
  const newsHref = locale === "en" ? "/en/news" : "/news";
  const promoHref = locale === "en" ? "/en/promo" : "/promo";
  const sandboxHref = locale === "en" ? "/en/sandbox" : "/sandbox";

  // Sembunyikan pre-footer info di halaman checkout dan otentikasi agar tidak mengganggu transaksi
  const isCheckout = pathname?.includes("/checkout");
  const isAuth =
    pathname?.includes("/login") ||
    pathname?.includes("/register") ||
    pathname?.includes("/forgot-password") ||
    pathname?.includes("/setup-2fa") ||
    pathname?.includes("/update-password");
  const showPreFooterInfo = !isCheckout && !isAuth;

  const waSupportUrl = getWhatsAppUrl();

  return (
    <footer className="w-full">
      {/* 1. PRE-FOOTER INFORMATIONAL SECTION (EDITORIAL ECOSYSTEM) */}
      {showPreFooterInfo && <PreFooterInfo />}

      {/* 2. MAIN FOOTER (DEEP DARK NAVY) */}
      <div className="bg-[#0b1120] border-t border-slate-800/80 pt-12 pb-6 text-slate-300 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          {/* MAIN GRID: BRAND (LEFT) & 4 NAVIGATION COLUMNS (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-10">
            {/* LEFT COLUMN: BRAND INFO & WILAYAH / BAHASA (Col span 4) */}
            <div className="lg:col-span-4 space-y-4">
              <Link href={homeHref} className="inline-flex items-center gap-2 group">
                <Image
                  src="/images/DaPay.svg"
                  alt="DaPay Logo"
                  width={1269}
                  height={313}
                  className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
                />
              </Link>

              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed pr-2">
                {t("footer.brandDescription")}
              </p>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t("footer.platformLocationTag")}
              </p>

              {/* Wilayah & Bahasa - Interactive Pill */}
              <div className="pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {t("footer.regionLanguage")}
                </p>
                <Link
                  href={localizeHref(pathname || "/", locale === "id" ? "en" : "id")}
                  className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-full border border-slate-700/80 bg-slate-900 hover:bg-slate-800 hover:border-slate-600 transition-all text-xs font-semibold text-slate-200 hover:text-white shadow-xs group w-48"
                  title={locale === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{locale === "id" ? "🇮🇩" : "🇬🇧"}</span>
                    <span>{locale === "id" ? "Indonesia" : "English"}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMNS: 4 SUB-COLUMNS (Col span 8) */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {/* 1. Hubungi Kami */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  {t("footer.contactUs")}
                </h3>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
                  <li>
                    <a
                      href="mailto:support@danispay.my.id"
                      className="md:hidden hover:text-blue-400 transition-colors inline-flex items-center gap-2 py-0.5"
                    >
                      <Send size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">support@danispay.my.id</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="hidden md:inline-flex items-center gap-2 hover:text-blue-400 transition-colors py-0.5 text-left cursor-pointer"
                    >
                      <Send size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">support@danispay.my.id</span>
                    </button>
                  </li>
                  <li>
                    <a
                      href={waSupportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-400 transition-colors inline-flex items-center gap-2 py-0.5"
                    >
                      <MessageCircle size={14} className="text-emerald-400 shrink-0" />
                      <span>Chat WhatsApp</span>
                    </a>
                  </li>
                  <li className="pt-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{t("footer.csOnline")}</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* 2. Produk & Layanan */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  {t("footer.productsTitle")}
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                  <li>
                    <Link href={`${homeHref}#game`} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                      {t("footer.gameTopup")}
                    </Link>
                  </li>
                  <li>
                    <Link href={`${homeHref}#pulsa`} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                      {t("footer.pulsaData")}
                    </Link>
                  </li>
                  <li>
                    <Link href={`${homeHref}#prabayar`} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                      {t("footer.plnBill")}
                    </Link>
                  </li>
                  <li>
                    <Link href={`${homeHref}#e-money`} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                      {t("footer.ewallet")}
                    </Link>
                  </li>
                  <li>
                    <Link href={`${homeHref}#voucher`} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                      {t("footer.voucher")}
                    </Link>
                  </li>
                  <li>
                    <Link href={sandboxHref} className="hover:text-blue-400 transition-colors inline-block py-0.5">
                      {t("footer.sandboxLink")}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* 3 & 4. Bantuan & Informasi + Ikuti Kami + PEMBAYARAN AMAN (Mengisi Ruang Kosong Bawah) */}
              <div className="col-span-2 flex flex-col justify-between space-y-6">
                {/* Baris Atas: Bantuan & Info + Ikuti Kami */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  {/* Bantuan & Informasi */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      {t("footer.helpTitle")}
                    </h3>
                    <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                      <li>
                        <button
                          type="button"
                          onClick={handleOpenHistoryModal}
                          className="hover:text-blue-400 transition-colors inline-flex items-center gap-1.5 py-0.5 text-left cursor-pointer"
                        >
                          <Search size={13} className="text-blue-400" />
                          <span>{t("footer.trackOrder")}</span>
                        </button>
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
                        <Link href="/login" className="hover:text-blue-400 transition-colors inline-block py-0.5">
                          {t("footer.resellerPartner")}
                        </Link>
                      </li>
                    </ul>
                  </div>

                  {/* Ikuti Kami */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      {t("footer.followUs")}
                    </h3>
                    {/* 4 Social Icons: Instagram, Facebook, TikTok, Twitter */}
                    <div className="flex items-center gap-2">
                      <a
                        href="https://instagram.com/dapay.official"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram DaPay"
                        className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-pink-500/50 hover:bg-pink-600/10 text-slate-300 hover:text-pink-400 flex items-center justify-center transition-all shadow-xs"
                      >
                        <Instagram size={15} />
                      </a>
                      <a
                        href="https://facebook.com/dapay.official"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook DaPay"
                        className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-600/10 text-slate-300 hover:text-blue-400 flex items-center justify-center transition-all shadow-xs"
                      >
                        <Facebook size={15} />
                      </a>
                      <a
                        href="https://tiktok.com/@dapay.official"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="TikTok DaPay"
                        className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-400 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-xs"
                      >
                        <TikTokIcon size={14} />
                      </a>
                      <a
                        href="https://x.com/dapay_official"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Twitter / X DaPay"
                        className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-600/10 text-slate-300 hover:text-sky-400 flex items-center justify-center transition-all shadow-xs"
                      >
                        <Twitter size={15} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Baris Bawah: PEMBAYARAN AMAN (Mengisi ruang kosong persis di bawah Bantuan & Ikuti Kami) */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    {t("footer.securePaymentTitle")}
                  </h3>

                  {/* Strip Logo Pembayaran: QRIS, DANA, GoPay, OVO, Koin DaPay, Saldo DaPay, + Lainnya */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {/* QRIS */}
                    <div className="bg-white rounded-lg px-2 py-1 h-7 flex items-center justify-center shadow-xs">
                      <Image
                        src="/payment/qris.png"
                        alt="QRIS"
                        width={44}
                        height={18}
                        className="h-3.5 sm:h-4 w-auto object-contain"
                      />
                    </div>

                    {/* DANA */}
                    <div className="bg-white rounded-lg px-2 py-1 h-7 flex items-center justify-center shadow-xs">
                      <Image
                        src="/payment/dana.png"
                        alt="DANA"
                        width={44}
                        height={18}
                        className="h-3 sm:h-3.5 w-auto object-contain"
                      />
                    </div>

                    {/* GoPay */}
                    <div className="bg-white rounded-lg px-2 py-1 h-7 flex items-center justify-center shadow-xs">
                      <Image
                        src="/payment/gopay.png"
                        alt="GoPay"
                        width={44}
                        height={18}
                        className="h-3 sm:h-3.5 w-auto object-contain"
                      />
                    </div>

                    {/* OVO */}
                    <div className="bg-white rounded-lg px-2 py-1 h-7 flex items-center justify-center shadow-xs">
                      <Image
                        src="/payment/ovo.png"
                        alt="OVO"
                        width={44}
                        height={18}
                        className="h-3 sm:h-3.5 w-auto object-contain"
                      />
                    </div>

                    {/* Koin DaPay */}
                    <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 rounded-lg px-2 py-1 h-7 flex items-center gap-1.5 shadow-xs">
                      <DaPayCoin size={18} showShadow={false} className="shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 tracking-tight whitespace-nowrap">
                        Koin DaPay
                      </span>
                    </div>

                    {/* Saldo DaPay */}
                    <div className="bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 border border-blue-500/40 rounded-lg px-2 py-1 h-7 flex items-center gap-1.5 shadow-xs">
                      <Wallet size={12} className="text-cyan-400 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-cyan-300 tracking-tight whitespace-nowrap">
                        Saldo DaPay
                      </span>
                    </div>

                    {/* + lainnya */}
                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg px-2 py-1 h-7 flex items-center justify-center shadow-xs text-slate-300 font-semibold text-[10px] sm:text-[11px] whitespace-nowrap">
                      + {t("footer.andOthers")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. BOTTOM BAR (QUIET ROW WITH SAFE MOBILE PADDING) */}
          <div className="border-t border-slate-800/80 pt-6 pb-28 md:pb-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
            <p className="text-center sm:text-left">
              {t("footer.copyrightText")}
            </p>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider text-center sm:text-right">
              {t("footer.poweredBy")}
            </p>
          </div>

        </div>
      </div>

      {/* Modal Kontak Email */}
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </footer>
  );
}
