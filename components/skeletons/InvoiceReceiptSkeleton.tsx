export default function InvoiceReceiptSkeleton() {
  return (
    <div className="min-h-screen bg-[#070b14] py-6 px-3 sm:px-6 font-sans tracking-tight text-slate-100">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Breadcrumb Navigasi Atas Shimmer */}
        <div className="flex items-center gap-2 pl-1 animate-pulse">
          <div className="h-3 w-12 bg-slate-800 rounded" />
          <span className="text-slate-800">/</span>
          <div className="h-3 w-28 bg-slate-800/70 rounded" />
        </div>

        {/* Layout 2 Kolom Responsif: 8 Kolom Kiri, 4 Kolom Kanan */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ========================================================
              KOLOM KIRI (UTAMA) - 8 Kolom Desktop
             ======================================================== */}
          <div className="lg:col-span-8 space-y-4">
            {/* KARTU 1: KOTAK STATUS & PROSES UTAMA (Adopsi Status "Sedang Diproses") */}
            <div className="bg-[#0d1424] rounded-3xl border border-slate-800/80 shadow-xl p-5 sm:p-7 space-y-5 animate-pulse">
              {/* Stepper 3 Tahap Shimmer (1:1 Mirrored with CheckoutStepper) */}
              <div className="w-full pb-2">
                <div className="flex items-center justify-between relative">
                  {/* Step 1: Pesanan Dibuat */}
                  <div className="flex flex-col items-center z-10">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center mb-1.5" />
                    <div className="h-2.5 w-14 sm:w-16 bg-slate-800/80 rounded" />
                  </div>

                  {/* Connector 1 */}
                  <div className="flex-1 h-0.5 bg-slate-800 mx-2 -mt-4" />

                  {/* Step 2: Pembayaran / Diproses (Tahap Aktif) */}
                  <div className="flex flex-col items-center z-10">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 border-2 border-slate-600 ring-4 ring-slate-800/40 flex items-center justify-center mb-1.5" />
                    <div className="h-2.5 w-16 sm:w-20 bg-slate-700 rounded" />
                  </div>

                  {/* Connector 2 */}
                  <div className="flex-1 h-0.5 bg-slate-800 mx-2 -mt-4" />

                  {/* Step 3: Selesai */}
                  <div className="flex flex-col items-center z-10">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center mb-1.5" />
                    <div className="h-2.5 w-12 sm:w-14 bg-slate-800/80 rounded" />
                  </div>
                </div>
              </div>

              {/* Banner Status Sedang Diproses Shimmer */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0 mt-0.5" />
                  <div className="flex flex-col space-y-1.5 flex-1">
                    <div className="h-4 w-44 bg-slate-800 rounded" />
                    <div className="h-3 w-64 max-w-full bg-slate-800/60 rounded" />
                  </div>
                </div>

                {/* Sub-banner Estimasi Waktu Proses Shimmer */}
                <div className="bg-[#070b14] rounded-xl p-3 border border-slate-800/60 flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-slate-800 shrink-0" />
                  <div className="h-3 w-56 max-w-[80%] bg-slate-800/60 rounded" />
                </div>
              </div>

              {/* Baris Ringkasan Produk & Total Pembayaran Shimmer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-850 border border-slate-800/90 shrink-0" />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-12 bg-slate-800 rounded-full" />
                      <div className="h-4 w-36 bg-slate-800 rounded" />
                    </div>
                    <div className="h-3 w-28 bg-slate-800/60 rounded" />
                  </div>
                </div>

                <div className="space-y-1 text-left sm:text-right">
                  <div className="h-3 w-20 bg-slate-800/60 rounded sm:ml-auto" />
                  <div className="flex items-center gap-2 sm:justify-end">
                    <div className="h-5 w-28 bg-slate-800 rounded" />
                    <div className="h-4 w-12 bg-slate-800 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* KARTU 2: STATUS TRANSAKSI SHIMMER */}
            <div className="bg-[#0d1424] rounded-2xl border border-slate-800/80 shadow-xl p-5 space-y-3 animate-pulse">
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                <div className="h-3 w-24 bg-slate-800/60 rounded" />
                <div className="h-5 w-28 bg-slate-800 rounded-full" />
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                <div className="h-3 w-20 bg-slate-800/60 rounded" />
                <div className="h-3.5 w-32 bg-slate-800 rounded" />
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <div className="h-3 w-24 bg-slate-800/60 rounded" />
                <div className="h-3.5 w-40 bg-slate-800 rounded" />
              </div>
            </div>

            {/* KARTU 3: DETAIL PRODUK SHIMMER */}
            <div className="bg-[#0d1424] rounded-2xl border border-slate-800/80 shadow-xl p-5 space-y-3 animate-pulse">
              <div className="h-4 w-28 bg-slate-800 rounded pb-1" />
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                <div className="h-3 w-20 bg-slate-800/60 rounded" />
                <div className="h-3 w-28 bg-slate-800 rounded" />
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                <div className="h-3 w-24 bg-slate-800/60 rounded" />
                <div className="h-3 w-32 bg-slate-800 rounded" />
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                <div className="h-3 w-16 bg-slate-800/60 rounded" />
                <div className="h-3 w-24 bg-slate-800 rounded" />
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <div className="h-3 w-14 bg-slate-800/60 rounded" />
                <div className="h-3 w-6 bg-slate-800 rounded" />
              </div>
            </div>

            {/* KARTU 4: DETAIL PEMBAYARAN SHIMMER */}
            <div className="bg-[#0d1424] rounded-2xl border border-slate-800/80 shadow-xl p-5 space-y-3 animate-pulse">
              <div className="h-4 w-32 bg-slate-800 rounded pb-1" />
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                <div className="h-3 w-24 bg-slate-800/60 rounded" />
                <div className="h-3 w-24 bg-slate-800 rounded" />
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <div className="h-3 w-24 bg-slate-800/60 rounded" />
                <div className="h-4 w-28 bg-slate-800 rounded" />
              </div>
            </div>
          </div>

          {/* ========================================================
              KOLOM KANAN (SIDEBAR EDUKASI & KEAMANAN) - 4 Kolom Desktop
             ======================================================== */}
          <div className="lg:col-span-4 space-y-4">
            {/* SIDEBAR CARD 1: GARANSI UANG KEMBALI SHIMMER */}
            <div className="bg-[#0d1424] rounded-2xl border border-slate-800/80 shadow-xl p-4 flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800/80 shrink-0" />
                <div className="h-3.5 w-36 bg-slate-800 rounded" />
              </div>
              <div className="w-4 h-4 rounded-full bg-slate-800/80 shrink-0" />
            </div>

            {/* SIDEBAR CARD 2: CATATAN (PANDUAN RESMI) SHIMMER */}
            <div className="bg-[#0d1424] rounded-2xl border border-slate-800/80 shadow-xl p-5 space-y-3.5 animate-pulse">
              <div className="h-4 w-20 bg-slate-800 rounded" />
              <div className="space-y-2.5">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                    <div className="h-2.5 w-full bg-slate-800/60 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* SIDEBAR CARD 3: BUTUH BANTUAN CS SHIMMER */}
            <div className="bg-[#0d1424] rounded-2xl border border-slate-800/80 shadow-xl p-5 space-y-3 animate-pulse">
              <div className="space-y-1">
                <div className="h-4 w-28 bg-slate-800 rounded" />
                <div className="h-2.5 w-44 bg-slate-800/60 rounded" />
              </div>
              <div className="h-10 w-full rounded-xl bg-slate-800/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
