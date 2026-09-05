"use client";

import React, { useState } from "react";
import {
  Power,
  Eye,
  RefreshCw,
  Layers,
  Zap,
  AlertTriangle,
  Activity,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Database,
  PlayCircle,
  FileText,
  Clock,
  Sparkles,
  Info,
  Server,
} from "lucide-react";

export default function ProviderMatrixDocPage() {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-24">
      {/* UNIFIED CONTAINER: 100% CONSISTENT WIDTH FROM TOP TO BOTTOM */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 space-y-10 sm:space-y-14">
        {/* HEADER (CENTERED & MATCHING CONTAINER WIDTH) */}
        <header className="text-center mx-auto max-w-3xl space-y-3.5">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
            Provider Operational Matrix &amp; State Machine
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed mx-auto max-w-2xl">
            Panduan teknis resmi mengenai keterkaitan logika saklar{" "}
            <span className="text-indigo-400 font-semibold">Koneksi</span>,{" "}
            <span className="text-emerald-400 font-semibold">Live</span>,{" "}
            <span className="text-cyan-400 font-semibold">Auto Sync</span>,{" "}
            <span className="text-violet-400 font-semibold">Proses</span>, dan{" "}
            <span className="text-amber-400 font-semibold">Maint</span> pada
            level database, router otomatisasi, dan keamanan finansial vendor.
          </p>
        </header>

        {/* MAIN CONTENT */}
        <main className="space-y-12 sm:space-y-16">
        {/* 3. VIDEO SHOWCASE SECTION (16:9 720P/1080P) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <PlayCircle size={18} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Video Animasi Alur Matriks Operasional
                </h2>
                <p className="text-xs text-slate-400">
                  Simulasi 12 detik gerak aliran data kontrol sistem (Resolusi
                  720p 16:9 Widescreen)
                </p>
              </div>
            </div>

            <span className="self-start sm:self-auto inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1 text-[10.5px] font-mono font-medium text-slate-300">
              <Clock size={11} className="text-slate-400" />
              16:9 • MP4 720p
            </span>
          </div>

          {/* Video Player Container */}
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 shadow-2xl ring-1 ring-white/5">
            {!videoFailed ? (
              <video
                controls
                playsInline
                preload="metadata"
                poster="/Panduan/providers-operational-matrix.png"
                onError={() => setVideoFailed(true)}
                className="h-full w-full object-contain bg-black"
              >
                <source
                  src="/Panduan/providers-operational-matrix.mp4"
                  type="video/mp4"
                />
                Browser Anda tidak mendukung tag pemutar video HTML5.
              </video>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-radial-[at_center] from-slate-900 to-slate-950">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3.5">
                  <PlayCircle size={28} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Menunggu File Video di Direktori Publik
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 max-w-md leading-relaxed">
                  File video animasi alur dapat disimpan ke:
                </p>
                <code className="mt-2 block rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-[11px] text-blue-300">
                  public/Panduan/providers-operational-matrix.mp4
                </code>
                <p className="mt-2 text-[11px] text-slate-500">
                  Rekomendasi resolusi: 720p (1280x720) dengan rasio aspek 16:9.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 4. INFOGRAPHIC / ARCHITECTURAL FLOWCHART SECTION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Diagram Arsitektur Alur Sistem
              </h2>
              <p className="text-xs text-slate-400">
                Visualisasi hirarki percabangan kontrol saklar dan interceptor
                maintenance
              </p>
            </div>
          </div>

          {/* User Infographic Image with Fallback */}
          {!imageFailed && (
            <div className="w-full rounded-3xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-2xl ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Panduan/providers-operational-matrix.png"
                alt="DaPay Provider Operational Matrix Diagram"
                onError={() => setImageFailed(true)}
                className="w-full h-auto block"
              />
            </div>
          )}

          {/* Built-in Interactive SVG/Tailwind Flowchart (Always informative) */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Sparkles size={14} className="text-blue-400" />
                <span>Skema Rantai Aliran Logika (Cascading State Machine)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                PostgreSQL Constraint Enforced
              </span>
            </div>

            {/* Flowchart Diagram Graphic */}
            <div className="flex flex-col items-center space-y-6">
              {/* Level 1: Master Switch */}
              <div className="relative group">
                <div className="flex items-center gap-3 rounded-2xl border-2 border-indigo-500/60 bg-indigo-950/70 px-5 py-3.5 shadow-[0_0_25px_-5px_rgba(99,102,241,0.4)] backdrop-blur-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg">
                    <Power size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">
                        KONEKSI
                      </span>
                      <span className="rounded-md bg-indigo-500/30 px-1.5 py-0.5 text-[9px] font-mono font-bold text-indigo-200">
                        is_enabled
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-300">
                      Saklar Induk MCB Utama (Jika OFF: Seluruh Turunan Mati
                      Total)
                    </p>
                  </div>
                </div>
              </div>

              {/* Connecting Lines */}
              <div className="flex flex-col items-center">
                <div className="h-6 w-0.5 bg-indigo-500/70" />
                <div className="h-0.5 w-64 sm:w-130 bg-slate-700 relative">
                  <div className="absolute -top-1 left-0 h-2.5 w-0.5 bg-slate-600" />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2.5 w-0.5 bg-slate-600" />
                  <div className="absolute -top-1 right-0 h-2.5 w-0.5 bg-slate-600" />
                </div>
              </div>

              {/* Level 2: Three Branches */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl">
                {/* Branch 1: LIVE */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 relative flex flex-col justify-between">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Eye size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">LIVE</div>
                      <div className="text-[9.5px] font-mono text-emerald-400">
                        is_storefront_visible
                      </div>
                    </div>
                  </div>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    Menampilkan produk di etalase toko publik. Jika OFF, produk
                    disembunyikan dari pembeli sementara backend tetap dapat
                    audit SKU.
                  </p>
                </div>

                {/* Branch 2: AUTO SYNC */}
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4 relative flex flex-col justify-between">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      <Layers size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        AUTO SYNC
                      </div>
                      <div className="text-[9.5px] font-mono text-cyan-400">
                        is_catalog_enabled
                      </div>
                    </div>
                  </div>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    Izin background cron scheduler memperbarui harga modal dan
                    stok berkala. Tombol manual [Sync] tetap bisa dipakai jika
                    Koneksi ON.
                  </p>
                </div>

                {/* Branch 3: PROSES with MAINT interceptor */}
                <div className="rounded-2xl border border-violet-500/30 bg-violet-950/30 p-4 relative flex flex-col justify-between">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400 border border-violet-500/30">
                      <Zap size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">PROSES</div>
                      <div className="text-[9.5px] font-mono text-violet-400">
                        is_execution_enabled
                      </div>
                    </div>
                  </div>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    Auto-dispatch order ke vendor instan. Otomatis diblokir jika
                    mode MAINT aktif demi mengamankan saldo dan kepuasan
                    customer.
                  </p>
                </div>
              </div>

              {/* Interceptor Node: MAINT -> Fallback Router */}
              <div className="w-full max-w-4xl pt-2">
                <div className="rounded-2xl border-2 border-dashed border-amber-500/50 bg-amber-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-300">
                          MAINT (is_maintenance) = ON
                        </span>
                        <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono text-amber-300">
                          Circuit Interceptor
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Memotong transmisi ke PROSES saat vendor cut-off atau
                        perbaikan.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-xs font-bold shrink-0 shadow-xs">
                    <Server size={14} className="text-emerald-400" />
                    <span>Reroute ke Fallback Provider</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. THE 5 PILLARS DEEP DIVE */}
        <section className="space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Rincian Mendalam 5 Pilar Kontrol Operasional
              </h2>
              <p className="text-xs text-slate-400">
                Spesifikasi teknis, mekanisme perlindungan, dan dampak sistem
                pada setiap saklar
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* 1. KONEKSI */}
            <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/80 p-5 space-y-3 hover:border-indigo-500/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Power size={18} />
                </div>
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                  Master Switch
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  1. Koneksi (is_enabled)
                </h3>
                <p className="text-[10px] font-mono text-indigo-400">
                  Database: providers.is_enabled (boolean)
                </p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Saklar induk penyambung komunikasi antara DaPay dan vendor. Jika
                Koneksi dimatikan, seluruh fungsi turunan (Auto Sync, Proses,
                Live) dipaksa nonaktif otomatis oleh database constraint.
              </p>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px] text-slate-400">
                <strong className="text-indigo-300">Dampak:</strong> Tidak ada
                satu pun request ke API vendor saat saklar ini mati.
              </div>
            </div>

            {/* 2. LIVE */}
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-5 space-y-3 hover:border-emerald-500/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Eye size={18} />
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  Storefront Visibility
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  2. Live (is_storefront_visible)
                </h3>
                <p className="text-[10px] font-mono text-emerald-400">
                  Database: providers.is_storefront_visible (boolean)
                </p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mengontrol apakah katalog produk dari vendor ini muncul di
                halaman depan pembeli. Dapat dimatikan jika admin ingin
                melakukan penyesuaian harga atau pengujian internal tanpa
                mengganggu toko publik.
              </p>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px] text-slate-400">
                <strong className="text-emerald-300">Dampak:</strong> Produk
                hilang dari katalog pengguna, namun tetap terkelola di dasbor
                admin.
              </div>
            </div>

            {/* 3. AUTO SYNC */}
            <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-5 space-y-3 hover:border-cyan-500/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Layers size={18} />
                </div>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                  Cron Scheduler
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  3. Auto Sync (is_catalog_enabled)
                </h3>
                <p className="text-[10px] font-mono text-cyan-400">
                  Database: providers.is_catalog_enabled (boolean)
                </p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Izin background scheduler otomatis untuk menarik pembaruan harga
                modal, status stok produk, dan maintenance SKU vendor. Berjalan
                tanpa intervensi manual dari admin.
              </p>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px] text-slate-400">
                <strong className="text-cyan-300">Dampak:</strong> Jika mati,
                harga modal tidak ter-update otomatis (harus tekan tombol
                [Sync]).
              </div>
            </div>

            {/* 4. PROSES */}
            <div className="rounded-2xl border border-violet-500/30 bg-slate-900/80 p-5 space-y-3 hover:border-violet-500/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  <Zap size={18} />
                </div>
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold text-violet-300">
                  Auto Dispatch Engine
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  4. Proses (is_execution_enabled)
                </h3>
                <p className="text-[10px] font-mono text-violet-400">
                  Database: providers.is_execution_enabled (boolean)
                </p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Izin bagi engine transaksi untuk langsung menembakkan order
                pembeli ke API vendor sesaat setelah status pembayaran menjadi
                PAID. Menjamin transaksi selesai dalam hitungan detik.
              </p>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px] text-slate-400">
                <strong className="text-violet-300">Dampak:</strong> Jika mati,
                order berstatus Pending dan menunggu verifikasi manual admin.
              </div>
            </div>

            {/* 5. MAINT */}
            <div className="rounded-2xl border border-amber-500/30 bg-slate-900/80 p-5 space-y-3 hover:border-amber-500/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <AlertTriangle size={18} />
                </div>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                  Fallback Circuit
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  5. Maint (is_maintenance)
                </h3>
                <p className="text-[10px] font-mono text-amber-400">
                  Database: providers.is_maintenance (boolean)
                </p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mode perlindungan saat vendor sedang cut-off malam atau gangguan
                server. Memblokir transmisi transaksi baru dan mengalihkan order
                secara cerdas ke provider fallback cadangan.
              </p>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px] text-slate-400">
                <strong className="text-amber-300">Dampak:</strong> Pelanggan
                tetap sukses transaksi karena diarahkan ke provider alternatif.
              </div>
            </div>

            {/* 6. TOMBOL SYNC (MANUAL) */}
            <div className="rounded-2xl border border-blue-500/30 bg-slate-900/80 p-5 space-y-3 hover:border-blue-500/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <RefreshCw size={18} />
                </div>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-300">
                  On-Demand Trigger
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  6. Sync (Tombol Manual 1-Klik)
                </h3>
                <p className="text-[10px] font-mono text-blue-400">
                  API: POST /api/admin/providers/[code]/sync-catalog
                </p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aksi sesaat (bukan saklar biner) yang dapat ditekan admin untuk
                segera menarik data katalog terbaru dari vendor (contoh:
                Digiflazz) tanpa menunggu jadwal cron job.
              </p>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px] text-slate-400">
                <strong className="text-blue-300">Dampak:</strong> Memperbarui
                SKU, harga modal, dan kategori secara langsung seketika.
              </div>
            </div>
          </div>
        </section>

        {/* 6. OPERATIONAL SCENARIOS MATRIX TABLE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Activity size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Matriks Skenario Lapangan &amp; Rekomendasi Saklar
              </h2>
              <p className="text-xs text-slate-400">
                Kombinasi setelan yang tepat sesuai kondisi operasional dan
                kebutuhan bisnis
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-4">Skenario Operasional</th>
                  <th className="py-3.5 px-3 text-center">Koneksi</th>
                  <th className="py-3.5 px-3 text-center">Live</th>
                  <th className="py-3.5 px-3 text-center">Auto Sync</th>
                  <th className="py-3.5 px-3 text-center">Proses</th>
                  <th className="py-3.5 px-3 text-center">Maint</th>
                  <th className="py-3.5 px-4">Efek Nyata &amp; Penjelasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {/* Scenario 1 */}
                <tr className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    Operasional Normal Penuh
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 mx-auto"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 mx-auto"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 mx-auto"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 mx-auto"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <XCircle size={16} className="text-slate-600 mx-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-[11.5px] text-slate-300">
                    Produk tayang di toko pembeli, harga otomatis sinkron, dan
                    pesanan langsung dikirim ke vendor secara instan.
                  </td>
                </tr>

                {/* Scenario 2 */}
                <tr className="hover:bg-slate-800/40 transition-colors bg-amber-950/10">
                  <td className="py-3.5 px-4 font-bold text-amber-200">
                    Vendor Gangguan / Cut-Off Malam
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 mx-auto"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 mx-auto"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <XCircle size={16} className="text-slate-600 mx-auto" />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <XCircle size={16} className="text-slate-600 mx-auto" />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <CheckCircle2
                      size={16}
                      className="text-amber-400 mx-auto"
                    />
                  </td>
                  <td className="py-3.5 px-4 text-[11.5px] text-slate-300">
                    Produk tetap terlihat di etalase, namun pesanan otomatis
                    dialihkan ke fallback provider cadangan agar transaksi tidak
                    gagal.
                  </td>
                </tr>

                {/* Scenario 3 */}
                <tr className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    Testing Internal &amp; Audit Margin SKU
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 mx-auto"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <XCircle size={16} className="text-slate-600 mx-auto" />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 mx-auto"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <XCircle size={16} className="text-slate-600 mx-auto" />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <XCircle size={16} className="text-slate-600 mx-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-[11.5px] text-slate-300">
                    Admin dapat menarik katalog dan menganalisis margin produk,
                    tetapi produk belum dijual ke publik dan tidak ada order
                    riil.
                  </td>
                </tr>

                {/* Scenario 4 */}
                <tr className="hover:bg-slate-800/40 transition-colors bg-rose-950/10">
                  <td className="py-3.5 px-4 font-bold text-rose-300">
                    Putus Vendor / Saldo Deposit Kosong
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <XCircle size={16} className="text-rose-500 mx-auto" />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <XCircle size={16} className="text-slate-600 mx-auto" />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <XCircle size={16} className="text-slate-600 mx-auto" />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <XCircle size={16} className="text-slate-600 mx-auto" />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <XCircle size={16} className="text-slate-600 mx-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-[11.5px] text-slate-300">
                    Seluruh aliran sistem dimatikan total. Aman dari percobaan
                    transaksi gagal karena saldo deposit habis.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. DATABASE INTEGRITY RULES */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Integritas Database PostgreSQL &amp; Validasi Backend
              </h2>
              <p className="text-xs text-slate-400">
                Pencegahan inkonsistensi data pada layer penyimpanan paling dasar
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Tabel <code className="text-cyan-300">public.providers</code> di
                Supabase PostgreSQL dilindungi oleh aturan konsistensi status
                yang menolak kombinasi data invalid:
              </p>
            </div>

            <pre className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-cyan-300 overflow-x-auto">
              {`-- PostgreSQL Consistency Constraint:
CONSTRAINT chk_providers_state_consistency CHECK (
  is_enabled = true OR (is_catalog_enabled = false AND is_execution_enabled = false)
);`}
            </pre>

            <p className="text-xs text-slate-400 leading-relaxed">
              Constraint ini menjamin bahwa jika saklar{" "}
              <strong className="text-white">Koneksi</strong> dimatikan (
              <code className="text-slate-300">is_enabled = false</code>),
              database tidak akan pernah mengizinkan saklar Auto Sync ataupun
              Proses bernilai <code className="text-slate-300">true</code>,
              mencegah potensi kegagalan sistem ataupun eksekusi liar tanpa
              izin.
            </p>
          </div>
        </section>
      </main>
    </div>
  </div>
);
}

