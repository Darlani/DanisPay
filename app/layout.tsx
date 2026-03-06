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
    <html lang="id">
      <head />
      <body className="antialiased">
        {/* Pindahkan semua logic Client (pathname, maintenance) ke sini */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}