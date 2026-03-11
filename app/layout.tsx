import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

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
        {/* Pindahkan semua logic Client (pathname, maintenance) ke sini */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}