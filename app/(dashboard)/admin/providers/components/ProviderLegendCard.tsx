"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Power,
  Eye,
  RefreshCw,
  Layers,
  Zap,
  AlertTriangle,
  Activity,
  BookOpen,
  Wallet,
  Clock,
  FileText,
  ExternalLink,
} from "lucide-react";

interface LegendItem {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  badge?: string;
  badgeColor?: string;
  title: string;
  subtitle: string;
  description: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    icon: <Activity size={16} />,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    badge: "Kesiapan & Latensi",
    badgeColor: "bg-teal-100/70 text-teal-700",
    title: "Status",
    subtitle: "is_configured + health",
    description:
      "Kombinasi kesiapan kredensial API (Ready/Standby) serta telemetri latensi server vendor terkini (Healthy, Degraded, Down).",
  },
  {
    icon: <Power size={16} />,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    badge: "Master Switch",
    badgeColor: "bg-indigo-100/70 text-indigo-700",
    title: "Koneksi",
    subtitle: "is_enabled",
    description:
      "Saklar utama provider. Jika non-aktif, seluruh komunikasi, katalog, dan pemrosesan order ke vendor ini dimatikan total.",
  },
  {
    icon: <Eye size={16} />,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    badge: "Katalog Etalase",
    badgeColor: "bg-emerald-100/70 text-emerald-700",
    title: "Live",
    subtitle: "is_storefront_visible",
    description:
      "Mengatur apakah produk dari provider ini aktif ditampilkan di etalase publik agar dapat dibeli langsung oleh pembeli.",
  },
  {
    icon: <Layers size={16} />,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    badge: "Cron Otomatis",
    badgeColor: "bg-cyan-100/70 text-cyan-700",
    title: "Auto Sync",
    subtitle: "is_catalog_enabled",
    description:
      "Izin bagi background cron scheduler untuk memperbarui stok dan harga produk vendor secara otomatis dan berkala.",
  },
  {
    icon: <Zap size={16} />,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    badge: "Auto Dispatch",
    badgeColor: "bg-violet-100/70 text-violet-700",
    title: "Proses",
    subtitle: "is_execution_enabled",
    description:
      "Izin pemrosesan order otomatis. Sistem langsung mengeksekusi transaksi pembeli ke API vendor setelah pembayaran lunas (dalam Mode Live). Bila Mode Simulasi (Sandbox) aktif di Pengaturan Toko, eksekusi riil dilewati dan transaksi diproses secara simulasi internal tanpa memotong deposit vendor.",
  },
  {
    icon: <AlertTriangle size={16} />,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    badge: "Fallback Router",
    badgeColor: "bg-amber-100/70 text-amber-700",
    title: "Maint",
    subtitle: "is_maintenance",
    description:
      "Mode perbaikan vendor. Saat aktif, order secara cerdas dialihkan ke provider fallback cadangan agar transaksi pembeli tidak gagal.",
  },
  {
    icon: <RefreshCw size={16} />,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    badge: "Aksi 1-Klik",
    badgeColor: "bg-blue-100/70 text-blue-700",
    title: "Sync",
    subtitle: "Manual Instant Sync",
    description:
      "Tombol aksi langsung untuk menarik pembaruan data katalog SKU produk, harga modal, dan status gangguan vendor secara instan.",
  },
  {
    icon: <Wallet size={16} />,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
    badge: "Deposit Vendor",
    badgeColor: "bg-slate-200/70 text-slate-800",
    title: "Saldo",
    subtitle: "balance + refresh",
    description:
      "Sisa deposit modal di akun vendor untuk mengeksekusi order, dilengkapi tombol reload cepat dengan pembatas cooldown aman.",
  },
  {
    icon: <Clock size={16} />,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    badge: "Audit & Error Log",
    badgeColor: "bg-rose-100/70 text-rose-700",
    title: "Last Sync",
    subtitle: "last_sync_at + err",
    description:
      "Waktu sinkronisasi terakhir dan status hasil. Klik pada tautan error warna merah untuk membuka jendela audit telemetri lengkap.",
  },
];

export default function ProviderLegendCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white/95 p-4 sm:p-5 shadow-xs transition-all duration-300">
      {/* Header Bar (Clickable) */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <BookOpen size={18} className="text-slate-700" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-none truncate">
                Panduan Kolom &amp; Kontrol Operasional Provider
              </h3>
              <span className="hidden min-[480px]:inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold text-slate-600">
                9 Indikator Terpantau
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-normal leading-normal truncate">
              Penjelasan fungsi saklar master, tombol sinkronisasi langsung, otomasi, dan telemetri koneksi vendor
            </p>
          </div>
        </div>

        {/* Right Actions: Link Matriks Operasional & Toggle Expand / Collapse */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/providers/matrix"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/90 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Buka dokumen matriks operasional provider di tab baru"
          >
            <FileText size={13} className="text-blue-600" />
            <span className="hidden sm:inline text-[11px]">Matriks Operasional</span>
            <ExternalLink size={12} className="text-blue-500" />
          </Link>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Sembunyikan panduan" : "Tampilkan panduan"}
          >
            <span className="hidden sm:inline text-[11px]">
              {isExpanded ? "Tutup Panduan" : "Buka Panduan"}
            </span>
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Expandable Grid Body */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5 animate-in fade-in duration-200">
          {LEGEND_ITEMS.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50 transition-colors"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.iconBg} ${item.iconColor}`}
              >
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">
                    {item.title}
                  </span>
                  {item.badge && (
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.2 text-[8.5px] font-bold ${
                        item.badgeColor || "bg-slate-200/70 text-slate-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="text-[9.5px] font-mono font-medium text-slate-400 mt-0.5">
                  {item.subtitle}
                </div>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
