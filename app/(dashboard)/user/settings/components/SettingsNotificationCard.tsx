"use client";

import React, { useState } from "react";
import { Loader2, Mail, ShieldAlert, ShoppingBag, Wallet } from "lucide-react";
import { NotificationPreferences } from "../types";

interface SettingsNotificationCardProps {
  notifications: NotificationPreferences;
  onTogglePreference: (key: keyof NotificationPreferences, value: boolean) => Promise<void>;
}

export default function SettingsNotificationCard({
  notifications,
  onTogglePreference,
}: SettingsNotificationCardProps) {
  const [loadingKey, setLoadingKey] = useState<keyof NotificationPreferences | null>(null);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (loadingKey) return;
    setLoadingKey(key);
    await onTogglePreference(key, !notifications[key]);
    setLoadingKey(null);
  };

  return (
    <div className="rounded-2xl md:rounded-[22px] border border-slate-200/80 bg-white/95 p-3.5 xs:p-4 sm:p-5 md:p-6 shadow-2xs backdrop-blur-md ring-1 ring-inset ring-white/60">
      <div className="space-y-2.5 sm:space-y-3">
        {/* 1. STATUS TRANSAKSI / PESANAN */}
        <NotificationRow
          icon={<ShoppingBag size={15} />}
          iconBg="bg-blue-50 text-blue-600"
          title="Status Transaksi & Pesanan"
          description="Pemberitahuan instan saat status pesanan produk digital Anda berubah menjadi sukses atau gagal."
          checked={Boolean(notifications.orders)}
          isLoading={loadingKey === "orders"}
          onToggle={() => handleToggle("orders")}
        />

        {/* 2. MUTASI SALDO & DEPOSIT/PENARIKAN */}
        <NotificationRow
          icon={<Wallet size={15} />}
          iconBg="bg-emerald-50 text-emerald-600"
          title="Aktivitas Saldo & Mutasi"
          description="Pemberitahuan saat deposit disetujui, penarikan saldo diproses, cashback, atau komisi referral masuk."
          checked={Boolean(notifications.balance)}
          isLoading={loadingKey === "balance"}
          onToggle={() => handleToggle("balance")}
        />

        {/* 3. PROMO & PENAWARAN */}
        <NotificationRow
          icon={<Mail size={15} />}
          iconBg="bg-purple-50 text-purple-600"
          title="Promo & Penawaran Eksklusif"
          description="Informasi diskon member, voucher potongan harga, dan pembaruan fitur terbaru DaPay."
          checked={Boolean(notifications.promotions)}
          isLoading={loadingKey === "promotions"}
          onToggle={() => handleToggle("promotions")}
        />
      </div>

      {/* Info Banner */}
      <div className="mt-4 sm:mt-5 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-800">
        <ShieldAlert size={15} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px] sm:text-xs">
          Preferensi tersimpan secara persisten pada akun cloud Anda dan akan tersinkronisasi di seluruh perangkat login.
        </p>
      </div>
    </div>
  );
}

function NotificationRow({
  icon,
  iconBg,
  title,
  description,
  checked,
  isLoading,
  onToggle,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  checked: boolean;
  isLoading: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3 sm:p-4 transition hover:bg-slate-50 hover:border-slate-300/80">
      <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0">
        <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
            {title}
          </p>
          <p className="mt-0.5 text-[10.5px] sm:text-xs text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Switch Toggle Button */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={isLoading}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        {isLoading ? (
          <span className="flex w-full items-center justify-center">
            <Loader2 size={12} className="animate-spin text-white" />
          </span>
        ) : (
          <span
            className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
              checked ? "translate-x-5.5" : "translate-x-1"
            }`}
          />
        )}
      </button>
    </div>
  );
}

