import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  Comfortaa,
  Poppins,
} from "next/font/google";

import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import GlobalErrorTracker from "@/components/GlobalErrorTracker";
import { isValidLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";

const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-comfortaa",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DanisPay - Top Up Game & Digital",
  description: "Layanan Top Up Tercepat dan Terpercaya",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const headerLocale = headersList.get("x-dapay-locale");
  const serverLocale = isValidLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE;

  return (
    <html lang={serverLocale} className="bg-slate-50 dark:bg-[#0f172a]" suppressHydrationWarning>
      <head>
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`,
          }}
        />
      </head>

      <body
        className={`${poppins.variable} ${comfortaa.variable} antialiased min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0f172a] dark:text-slate-200 transition-colors duration-150`}
        suppressHydrationWarning
      >
        <GlobalErrorTracker />

        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
