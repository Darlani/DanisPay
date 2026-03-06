"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Newspaper, Tag, ReceiptText, LogIn, UserCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<'admin' | 'user' | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isAdmin = localStorage.getItem("isAdmin") === "true";
      const isUser = localStorage.getItem("isUser") === "true";
      if (isAdmin) setRole('admin');
      else if (isUser) setRole('user');
      else setRole(null);
    }
  }, [pathname]);

  // Sembunyikan di halaman Admin agar tidak tabrakan dengan Sidebar
  if (pathname.startsWith('/admin')) return null;

  return (
    // Class md:hidden akan menyembunyikan div ini di layar tablet/desktop
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a] border-t border-slate-800 z-50 pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-center h-[72px] px-2">
        
        <Link href="/" className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/' ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
          {pathname === '/' && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full"></div>}
          <Home size={22} className={pathname === '/' ? 'animate-in zoom-in duration-300' : ''} />
          <span className="text-[10px] font-bold">Home</span>
        </Link>

        <Link href="/news" className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/news' ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
          {pathname === '/news' && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full"></div>}
          <Newspaper size={22} className={pathname === '/news' ? 'animate-in zoom-in duration-300' : ''} />
          <span className="text-[10px] font-bold">News</span>
        </Link>

        <Link href="/promo" className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/promo' ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
          {pathname === '/promo' && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full"></div>}
          <Tag size={22} className={pathname === '/promo' ? 'animate-in zoom-in duration-300' : ''} />
          <span className="text-[10px] font-bold">Promo</span>
        </Link>

        <button onClick={() => window.dispatchEvent(new CustomEvent('openHistoryModal'))} className="relative flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 hover:text-slate-200 transition-colors">
          <ReceiptText size={22} />
          <span className="text-[10px] font-bold">Lacak</span>
        </button>

        {role ? (
          <Link href={role === 'admin' ? "/admin" : "/user"} className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${(pathname === '/admin' || pathname === '/user') ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
             {(pathname === '/admin' || pathname === '/user') && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full"></div>}
            <UserCircle size={22} className={(pathname === '/admin' || pathname === '/user') ? 'animate-in zoom-in duration-300' : ''} />
            <span className="text-[10px] font-bold">Akun</span>
          </Link>
        ) : (
          <Link href="/login" className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/login' ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
            {pathname === '/login' && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full"></div>}
            <LogIn size={22} className={pathname === '/login' ? 'animate-in zoom-in duration-300' : ''} />
            <span className="text-[10px] font-bold">Sign In</span>
          </Link>
        )}

      </div>
    </div>
  );
}