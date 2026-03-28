import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import GlobalErrorTracker from "@/components/GlobalErrorTracker";

export const metadata: Metadata = {
  title: "DanisPay - Top Up Game & Digital",
  description: "Layanan Top Up Tercepat dan Terpercaya",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="bg-[#0f172a]">
      <head />
      <body className="antialiased bg-[#0f172a] text-slate-200">
        <GlobalErrorTracker />
        {/* Pindahkan semua logic Client (pathname, maintenance) ke sini */}
        <ClientLayout>
          {children}
          {/* Floating Support Button */}
          <div className="fixed bottom-6 right-6 z-[9999]">
            <a 
              href="mailto:support@danispay.my.id?subject=Tanya%20Seputar%20Layanan%20DanisPay"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:scale-110 hover:bg-blue-500 active:scale-95 sm:h-16 sm:w-16 group"
              aria-label="Contact Support"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={2} 
                stroke="currentColor" 
                className="h-6 w-6 sm:h-8 sm:w-8 transition-transform group-hover:rotate-12"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </a>
          </div>
        </ClientLayout>
      </body>
    </html>
  );
}