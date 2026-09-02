"use client";

import React from "react";
import Image from "next/image";
import { ArrowLeftRight, ArrowRight, Coins, Wallet } from "lucide-react";
import { HelpCategory } from "../types";

interface HelpQuickCardsProps {
  onOpenWhatsApp: () => void;
  onSelectCategory: (category: HelpCategory, shouldScroll?: boolean) => void;
}

export default function HelpQuickCards({
  onOpenWhatsApp,
  onSelectCategory,
}: HelpQuickCardsProps) {
  return (
    <section className="mb-4 sm:mb-5 hidden sm:grid sm:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-3.5">
      {/* 1. HUBUNGI ADMIN (WHATSAPP ICON) */}
      <QuickCard
        icon={
          <Image
            src="/Bantuan/whatsapp.png"
            alt="WhatsApp"
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
          />
        }
        title="Hubungi Admin"
        description="Chat langsung dengan tim support DaPay"
        accentColor="green"
        onClick={onOpenWhatsApp}
      />

      {/* 2. MASALAH TRANSAKSI */}
      <QuickCard
        icon={<ArrowLeftRight size={20} />}
        title="Masalah Transaksi"
        description="Bantuan seputar deposit, penarikan & status transaksi"
        accentColor="blue"
        onClick={() => onSelectCategory("transaction", true)}
      />

      {/* 3. SALDO DAPAY */}
      <QuickCard
        icon={<Wallet size={20} />}
        title="Saldo DaPay"
        description="Informasi saldo, deposit dan penarikan"
        accentColor="amber"
        onClick={() => onSelectCategory("balance", true)}
      />

      {/* 4. KOIN DAPAY */}
      <QuickCard
        icon={<Coins size={20} />}
        title="Koin DaPay"
        description="Informasi cashback, reward & penggunaan koin"
        accentColor="purple"
        onClick={() => onSelectCategory("coin", true)}
      />
    </section>
  );
}

function QuickCard({
  icon,
  title,
  description,
  accentColor,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: "green" | "blue" | "amber" | "purple";
  onClick: () => void;
}) {
  const styles = {
    green: {
      border: "border-emerald-200/80 hover:border-emerald-400",
      bg: "bg-linear-to-br from-white via-emerald-50/40 to-emerald-100/30",
      iconBg: "bg-emerald-500/15 text-emerald-600 border border-emerald-300/40",
      arrowBg: "border-emerald-300/60 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    },
    blue: {
      border: "border-blue-200/80 hover:border-blue-400",
      bg: "bg-linear-to-br from-white via-blue-50/40 to-blue-100/30",
      iconBg: "bg-blue-500/15 text-blue-600 border border-blue-300/40",
      arrowBg: "border-blue-300/60 bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
    },
    amber: {
      border: "border-amber-200/80 hover:border-amber-400",
      bg: "bg-linear-to-br from-white via-amber-50/40 to-amber-100/30",
      iconBg: "bg-amber-500/15 text-amber-600 border border-amber-300/40",
      arrowBg: "border-amber-300/60 bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
    },
    purple: {
      border: "border-purple-200/80 hover:border-purple-400",
      bg: "bg-linear-to-br from-white via-purple-50/40 to-purple-100/30",
      iconBg: "bg-purple-500/15 text-purple-600 border border-purple-300/40",
      arrowBg: "border-purple-300/60 bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
    },
  }[accentColor];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-2xl md:rounded-[22px] border ${styles.border} ${styles.bg} p-3 xs:p-3.5 sm:p-3 md:p-4 text-left shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60 transition-all duration-200 hover:shadow-xs active:scale-98 cursor-pointer min-h-32.5 sm:min-h-33.75 md:min-h-36`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl ${styles.iconBg} shadow-2xs`}>
          {icon}
        </div>

        <div className={`flex h-6 w-6 sm:h-6 sm:w-6 md:h-6.5 md:w-6.5 shrink-0 items-center justify-center rounded-full border ${styles.arrowBg} transition-all duration-200 group-hover:scale-105`}>
          <ArrowRight size={11} strokeWidth={2.5} />
        </div>
      </div>

      <div className="mt-2.5 sm:mt-3">
        <h3 className="text-xs sm:text-[12.5px] md:text-sm font-black tracking-tight text-slate-900 leading-tight group-hover:text-blue-900 transition-colors">
          {title}
        </h3>
        <p className="mt-0.5 sm:mt-1 text-[10.5px] sm:text-[11px] md:text-xs text-slate-500 leading-snug line-clamp-2">
          {description}
        </p>
      </div>
    </button>
  );
}
