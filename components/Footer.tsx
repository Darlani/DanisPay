"use client";
import { useState } from "react";
import Link from "next/link";
import { Instagram, Facebook, Twitter, ShieldCheck } from "lucide-react";
import ContactModal from "./ContactModal";
import { useI18n } from "@/lib/i18n/context";

export default function Footer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { locale, t } = useI18n();

  return (
    <footer className="bg-[#0f172a] border-t border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Section */}
          <div className="md:col-span-1">
            <h2 className="text-2xl font-black text-white italic tracking-tighter mb-4">
              DANISH<span className="text-blue-500">TOPUP</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {t("footer.brandDescription")}
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Instagram size={20}/></a>
              <a href="#" className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Facebook size={20}/></a>
              <a href="#" className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Twitter size={20}/></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6">{t("footer.sitemapTitle")}</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link href={locale === "en" ? "/en" : "/"} className="hover:text-blue-500 transition-colors">{t("navigation.home")}</Link></li>
              <li><Link href={locale === "en" ? "/en/sandbox" : "/sandbox"} className="hover:text-blue-500 transition-colors">{t("footer.sandboxLink")}</Link></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">{t("footer.checkTransaction")}</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">{t("footer.priceList")}</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">{t("footer.termsAndConditions")}</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold mb-6">{t("footer.helpTitle")}</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="#" className="hover:text-blue-500 transition-colors">{t("footer.ourWhatsApp")}</a></li>
              <li>
                {/* Tampil di HP (Mobile-first): Buka aplikasi email */}
                <a href="mailto:support@danispay.my.id" className="md:hidden hover:text-blue-500 transition-colors">{t("footer.contactEmail")}</a>
                
                {/* Tampil di Desktop: Buka Modal UI */}
                <button onClick={() => setIsModalOpen(true)} className="hidden md:block hover:text-blue-500 transition-colors text-left w-full">{t("footer.contactEmail")}</button>
              </li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">{t("footer.paymentMethods")}</a></li>
            </ul>
          </div>

          {/* Payment Trust */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-500" />
              {t("footer.transactionSecurity")}
            </h4>
            <p className="text-slate-400 text-sm mb-4">
              {t("footer.securityDescription")}
            </p>
            <div className="grid grid-cols-4 gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {['DANA', 'GOPAY', 'OVO', 'QRIS', 'BCA', 'BNI', 'BRI', 'MDR'].map((bank) => (
                <div key={bank} className="bg-white text-[8px] font-black text-slate-900 p-1 rounded text-center">
                  {bank}
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs text-center md:text-left">
            {t("footer.copyrightText")}
          </p>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">
            {t("footer.poweredBy")}
          </p>
        </div>
      </div>
      
      {/* Panggil Modalnya di sini */}
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </footer>
  );
}
