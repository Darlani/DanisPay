"use client";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic"; // Pakai dynamic import biar enteng
import { STORE_CONFIG } from "@/utils/storeConfig";

// Load Navbar, Footer, dan BottomNav cuma pas dibutuhin (Lazy Load)
const Navbar = dynamic(() => import("./Navbar"), { ssr: false });
const Footer = dynamic(() => import("./Footer"), { ssr: false });
const BottomNav = dynamic(() => import("./BottomNav"), { ssr: false }); 
const MaintenancePage = dynamic(() => import("./MaintenancePage"));

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardPage = pathname?.startsWith("/user") || pathname?.startsWith("/admin");

  // Jika maintenance, langsung potong kompas biar gak load yang lain
  if (STORE_CONFIG.isMaintenanceMode) {
    return <MaintenancePage />;
  }

  return (
    <>
      {!isDashboardPage && <Navbar />}
      
      {/* Tambahkan pb-20 di HP agar konten tidak ketutupan BottomNav */}
      <main className={`grow relative ${!isDashboardPage ? "pb-20 md:pb-0" : ""}`}>
        {children}
      </main>

      {!isDashboardPage && <Footer />}
      
      {/* Tampilkan Bottom Navigasi khusus Mobile di Landing Page */}
      {!isDashboardPage && <BottomNav />}
    </>
  );
}