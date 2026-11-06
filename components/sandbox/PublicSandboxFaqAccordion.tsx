"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

export interface PublicFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const PUBLIC_SANDBOX_FAQS_ID: PublicFaqItem[] = [
  {
    id: "faq-1",
    question: "Apa itu Sandbox DaPay?",
    answer:
      "DaPay Sandbox adalah ruang simulasi transaksi produk digital untuk mempelajari cara pemesanan, melihat simulasi harga produk, dan mencoba fitur DaPay tanpa menggunakan saldo uang riil.",
  },
  {
    id: "faq-2",
    question: "Apakah saldo Sandbox uang nyata?",
    answer:
      "Bukan. Saldo virtual Rp 1.000.000 yang diberikan di Sandbox sepenuhnya bersifat simulasi. Saldo ini tidak dapat dicairkan (non-withdrawable), tidak dapat ditransfer, dan tidak memiliki nilai tunai di luar lingkungan simulasi.",
  },
  {
    id: "faq-3",
    question: "Apakah Koin Sandbox bisa dicairkan?",
    answer:
      "Tidak. Koin Sandbox adalah reward cashback simulasi untuk tipe akun Spesial di lingkungan Sandbox. Koin ini terisolasi dan tidak dapat diuangkan ke rekening bank maupun ke saldo riil DaPay.",
  },
  {
    id: "faq-4",
    question: "Apakah transaksi Sandbox mempengaruhi saldo riil?",
    answer:
      "Sama sekali tidak. Transaksi simulasi hanya menggunakan saldo virtual dan berjalan di sistem simulasi terpisah yang 100% aman dan terisolasi dari saldo riil DaPay Anda.",
  },
  {
    id: "faq-5",
    question: "Apakah riwayat pesanan Sandbox masuk ke riwayat utama?",
    answer:
      "Tidak. Seluruh pesanan simulasi dicatat khusus pada riwayat latihan Sandbox dan terpisah sepenuhnya dari riwayat transaksi utama Anda.",
  },
  {
    id: "faq-6",
    question: "Siapa saja yang dapat mencoba Sandbox?",
    answer:
      "Seluruh pengguna DaPay yang memiliki akun terdaftar dengan email terverifikasi dapat mencoba mode simulasi ini secara gratis.",
  },
  {
    id: "faq-7",
    question: "Apakah Sandbox menjamin keuntungan usaha?",
    answer:
      "Tidak. Sandbox adalah sarana latihan dan edukasi. Simulasi harga dan kalkulasi yang ditampilkan bersifat latihan untuk pemahaman alur, bukan jaminan keuntungan finansial di dunia nyata.",
  },
  {
    id: "faq-8",
    question: "Apa perbedaan Member Reguler dan Spesial?",
    answer:
      "Member Reguler mendapatkan akses Harga Promo dan Komisi Referral (tanpa cashback). Member Spesial mendapatkan akses Harga Promo, Komisi Referral, ditambah Cashback Transaksi (di Sandbox disimulasikan sebagai Koin Sandbox).",
  },
  {
    id: "faq-9",
    question: "Bagaimana cara kembali ke Akun Utama?",
    answer:
      "Setelah selesai mencoba alur transaksi di Sandbox, Anda dapat langsung kembali ke Akun Utama DaPay Anda kapan saja untuk bertransaksi menggunakan saldo riil Anda.",
  },
];

export const PUBLIC_SANDBOX_FAQS_EN: PublicFaqItem[] = [
  {
    id: "faq-1",
    question: "What is DaPay Sandbox?",
    answer:
      "DaPay Sandbox is a digital product simulation space designed to help you explore order workflows, preview product prices, and practice transactions safely without using real money.",
  },
  {
    id: "faq-2",
    question: "Is the Sandbox balance real money?",
    answer:
      "No. The Rp 1,000,000 virtual balance provided in the Sandbox is strictly for simulation purposes. It cannot be withdrawn (non-withdrawable), cannot be transferred, and holds no cash value outside the simulation environment.",
  },
  {
    id: "faq-3",
    question: "Can Sandbox Coins be withdrawn?",
    answer:
      "No. Sandbox Coins are simulated cashback rewards for Special tier accounts in the Sandbox environment. These coins are isolated and cannot be converted to bank funds or real DaPay balance.",
  },
  {
    id: "faq-4",
    question: "Do Sandbox transactions affect my real DaPay balance?",
    answer:
      "Not at all. Simulated transactions only utilize virtual balance and run within an isolated simulation system that is 100% separate from your real DaPay cash balance.",
  },
  {
    id: "faq-5",
    question: "Do Sandbox orders appear in my main transaction history?",
    answer:
      "No. All simulated orders are recorded exclusively in the Sandbox practice history and remain entirely separate from your primary transaction records.",
  },
  {
    id: "faq-6",
    question: "Who can try the Sandbox?",
    answer:
      "All registered DaPay users with a verified email can try this simulation mode for free.",
  },
  {
    id: "faq-7",
    question: "Does the Sandbox guarantee business profits?",
    answer:
      "No. The Sandbox is an educational and practice tool. Simulated prices and calculations are for learning workflows, not a real-world financial guarantee.",
  },
  {
    id: "faq-8",
    question: "What is the difference between Regular and Special Members?",
    answer:
      "Regular Members gain access to Promo Prices and Referral Commissions (without cashback). Special Members receive Promo Prices, Referral Commissions, plus Transaction Cashback (simulated as Sandbox Coins in the Sandbox environment).",
  },
  {
    id: "faq-9",
    question: "How do I return to my Primary Account?",
    answer:
      "After exploring order workflows in the Sandbox, you can switch back to your primary DaPay account at any time to transact using your real balance.",
  },
];

// Backwards-compatible export
export const PUBLIC_SANDBOX_FAQS = PUBLIC_SANDBOX_FAQS_ID;

interface PublicSandboxFaqAccordionProps {
  locale?: Locale;
}

export default function PublicSandboxFaqAccordion({ locale }: PublicSandboxFaqAccordionProps) {
  const { locale: contextLocale } = useI18n();
  const currentLocale = locale || contextLocale;
  const faqs = currentLocale === "en" ? PUBLIC_SANDBOX_FAQS_EN : PUBLIC_SANDBOX_FAQS_ID;

  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const regionLabel = currentLocale === "en"
    ? "Frequently Asked Questions About Sandbox"
    : "Pertanyaan yang Sering Diajukan Seputar Sandbox";

  return (
    <div className="space-y-3" role="region" aria-label={regionLabel}>
      {faqs.map((item) => {
        const isOpen = openId === item.id;
        const buttonId = `faq-btn-${item.id}`;
        const panelId = `faq-panel-${item.id}`;

        return (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 transition-all duration-200 hover:border-slate-700 overflow-hidden"
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggleItem(item.id)}
              className="flex w-full items-center justify-between gap-3 p-4 sm:p-5 text-left transition-colors cursor-pointer min-h-12 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400/50"
            >
              <div className="flex items-start gap-3 min-w-0 pr-2">
                <HelpCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-bold text-white leading-snug">
                  {item.question}
                </span>
              </div>
              <ChevronDown
                size={18}
                className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-amber-400" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 text-slate-300 text-xs sm:text-sm leading-relaxed border-t border-slate-800/60 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <p className="mt-3 text-slate-300/90">{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}