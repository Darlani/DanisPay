"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Newspaper, Tag, ReceiptText, LogIn, UserCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import { stripLocaleFromPathname } from "@/lib/i18n/config";

export default function BottomNav() {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const [role, setRole] = useState<'admin' | 'user' | null>(() => {
    if (typeof window !== "undefined") {
      const isAdmin = localStorage.getItem("isAdmin") === "true";
      const isUser = localStorage.getItem("isUser") === "true";
      if (isAdmin) return "admin";
      if (isUser) return "user";
    }
    return null;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const isAdmin = localStorage.getItem("isAdmin") === "true";
      const isUser = localStorage.getItem("isUser") === "true";
      setRole(isAdmin ? "admin" : isUser ? "user" : null);
    };

    handleStorageChange();
  }, [pathname]);

  // Sembunyikan di halaman Dashboard (Admin & User) agar tidak tabrakan dengan Navigation Dashboard
  if (pathname.startsWith('/admin') || pathname.startsWith('/user')) return null;

  const currentNormalized = stripLocaleFromPathname(pathname);
  const isHomeActive = currentNormalized === "/";
  const isNewsActive = currentNormalized === "/news";
  const isPromoActive = currentNormalized === "/promo";

  return (
    // Class md:hidden akan menyembunyikan div ini di layar tablet/desktop
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a] border-t border-slate-800 z-50 pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-center h-18 px-2">
        
        <Link href={locale === "en" ? "/en" : "/"} className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isHomeActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
          {isHomeActive && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full"></div>}
          <Home size={22} className={isHomeActive ? 'animate-in zoom-in duration-300' : ''} />
          <span className="text-[10px] font-bold">{t("navigation.home")}</span>
        </Link>

        <Link href={locale === "en" ? "/en/news" : "/news"} className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isNewsActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
          {isNewsActive && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full"></div>}
          <Newspaper size={22} className={isNewsActive ? 'animate-in zoom-in duration-300' : ''} />
          <span className="text-[10px] font-bold">{t("navigation.news")}</span>
        </Link>

        <Link href={locale === "en" ? "/en/promo" : "/promo"} className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isPromoActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
          {isPromoActive && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full"></div>}
          <Tag size={22} className={isPromoActive ? 'animate-in zoom-in duration-300' : ''} />
          <span className="text-[10px] font-bold">{t("navigation.promo")}</span>
        </Link>

        <button onClick={() => window.dispatchEvent(new CustomEvent('openHistoryModal'))} className="relative flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 hover:text-slate-200 transition-colors">
          <ReceiptText size={22} />
          <span className="text-[10px] font-bold">{t("navigation.track")}</span>
        </button>

        {role ? (
          <Link href={role === 'admin' ? "/admin" : "/user"} className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${(pathname === '/admin' || pathname === '/user') ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
             {(pathname === '/admin' || pathname === '/user') && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full"></div>}
            <UserCircle size={22} className={(pathname === '/admin' || pathname === '/user') ? 'animate-in zoom-in duration-300' : ''} />
            <span className="text-[10px] font-bold">{t("navigation.account")}</span>
          </Link>
        ) : (
          <Link href="/login" className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/login' ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
            {pathname === '/login' && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full"></div>}
            <LogIn size={22} className={pathname === '/login' ? 'animate-in zoom-in duration-300' : ''} />
            <span className="text-[10px] font-bold">{t("navigation.signIn")}</span>
          </Link>
        )}

      </div>
    </div>
  );
}
