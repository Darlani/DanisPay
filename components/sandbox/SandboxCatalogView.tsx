"use client";

import { useState } from "react";
import {
  FlaskConical,
  Smartphone,
  Wifi,
  Zap,
  Wallet,
  CheckCircle2,
  Info,
  X,
  TrendingUp,
  RotateCcw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import {
  CURATED_SANDBOX_CATEGORIES,
  CURATED_SANDBOX_PRODUCTS,
  calculateSimulatedMargin,
  type CuratedSandboxProduct,
} from "@/lib/sandbox/curated-catalog";

interface SandboxCatalogViewProps {
  isSidebarExpanded?: boolean;
  onMarginView?: () => void;
  isSimulationQuotaExhausted?: boolean;
}

interface SimulatedTransactionOutcome {
  success: boolean;
  status: string;
  orderId: string;
  productName: string;
  customerNo: string;
  amount: number;
  remainingBalance: number;
  sn: string | null;
  message: string;
}

export default function SandboxCatalogView({
  isSidebarExpanded = true,
  onMarginView,
  isSimulationQuotaExhausted = false,
}: SandboxCatalogViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeProduct, setActiveProduct] = useState<CuratedSandboxProduct | null>(null);
  const [customSellingPrice, setCustomSellingPrice] = useState<number | null>(null);

  // Simulated Transaction States
  const [targetNumber, setTargetNumber] = useState<string>("081234567890");
  const [isTransacting, setIsTransacting] = useState<boolean>(false);
  const [transactionResult, setTransactionResult] = useState<SimulatedTransactionOutcome | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  const filteredProducts =
    selectedCategory === "all"
      ? CURATED_SANDBOX_PRODUCTS
      : CURATED_SANDBOX_PRODUCTS.filter((p) => p.category === selectedCategory);

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case "pulsa":
        return <Smartphone size={14} className="shrink-0" />;
      case "data":
        return <Wifi size={14} className="shrink-0" />;
      case "pln":
        return <Zap size={14} className="shrink-0" />;
      case "emoney":
        return <Wallet size={14} className="shrink-0" />;
      default:
        return <FlaskConical size={14} className="shrink-0" />;
    }
  };

  const currentSellingPrice = activeProduct
    ? customSellingPrice ?? activeProduct.suggestedSellingPrice
    : 0;

  const currentMargin = activeProduct
    ? calculateSimulatedMargin(activeProduct.demoPrice, currentSellingPrice)
    : { marginAmount: 0, marginPercent: 0 };

  const handleOpenProduct = (product: CuratedSandboxProduct) => {
    setActiveProduct(product);
    setCustomSellingPrice(product.suggestedSellingPrice);
    setTransactionResult(null);
    setTransactionError(null);
    if (product.category === "pln") {
      setTargetNumber("14023456789");
    } else {
      setTargetNumber("081234567890");
    }
    onMarginView?.();
  };

  const handleCloseModal = () => {
    setActiveProduct(null);
    setTransactionResult(null);
    setTransactionError(null);
  };

  const handleExecuteSimulatedTransaction = async () => {
    if (!activeProduct) return;
    if (!targetNumber.trim() || targetNumber.trim().length < 4) {
      setTransactionError("Nomor tujuan / ID pelanggan minimal 4 karakter.");
      return;
    }

    setIsTransacting(true);
    setTransactionError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/tester/simulate-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          productId: activeProduct.id,
          customerNo: targetNumber.trim(),
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Transaksi simulasi gagal.");
      }

      setTransactionResult(body as SimulatedTransactionOutcome);

      // Notify other components (header, sidebar, wallet) to refresh virtual balance
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sandboxSessionChanged"));
      }
    } catch (err: unknown) {
      setTransactionError(err instanceof Error ? err.message : "Transaksi simulasi gagal diproses.");
    } finally {
      setIsTransacting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-amber-300/80 bg-linear-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 p-4 sm:p-5 shadow-2xs backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-900 border border-amber-300">
                <FlaskConical size={11} className="text-amber-700" />
                SANDBOX • SIMULASI
              </span>
              <span className="text-[10px] font-bold text-amber-800/80 uppercase tracking-wide">
                Katalog & Simulasi Transaksi
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Katalog Produk & Simulasi Transaksi Digital
            </h2>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Pilih produk retail digital di bawah untuk mencoba simulasi pembelian menggunakan koin virtual. Semua transaksi dan mutasi saldo terisolasi dari sistem LIVE DaPay.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2 text-xs font-semibold text-amber-900 bg-white/80 px-3 py-2 rounded-xl border border-amber-200/80 shadow-2xs">
            <TrendingUp size={15} className="text-emerald-600 shrink-0" />
            <span>Simulasi Transaksi Aktif</span>
          </div>
        </div>
      </div>

      {/* 2. Category Filter Pills */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CURATED_SANDBOX_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
              }`}
            >
              {getCategoryIcon(cat.id)}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Product Grid */}
      <div className={`grid grid-cols-1 xs:grid-cols-2 ${!isSidebarExpanded ? "md:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-4"} gap-3 sm:gap-4`}>
        {filteredProducts.map((product) => {
          const cardMargin = calculateSimulatedMargin(product.demoPrice, product.suggestedSellingPrice);
          return (
            <div
              key={product.id}
              onClick={() => handleOpenProduct(product)}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all duration-200 hover:border-amber-400/80 hover:shadow-md cursor-pointer"
            >
              {/* Top Row: Brand & Simulation Badge */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold text-slate-700 tracking-wide uppercase">
                    {product.brand}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[8.5px] font-extrabold text-amber-900 border border-amber-300/80">
                    <FlaskConical size={9} className="text-amber-600" />
                    SIMULASI
                  </span>
                </div>

                {/* Product Title */}
                <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug group-hover:text-amber-900 transition-colors line-clamp-2">
                  {product.name}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Middle Row: Price & Margin Snapshot */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10.5px] text-slate-500">Harga Beli Demo:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    Rp {product.demoPrice.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2 py-1 border border-emerald-200/60">
                  <span className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                    <TrendingUp size={11} className="text-emerald-600" />
                    Est. Margin:
                  </span>
                  <span className="text-[11px] font-black text-emerald-700 font-mono">
                    +Rp {cardMargin.marginAmount.toLocaleString("id-ID")} ({cardMargin.marginPercent}%)
                  </span>
                </div>
              </div>

              {/* Bottom Row: Action */}
              <div className="mt-3 pt-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Koin Virtual</span>
                <span className="text-[10.5px] font-bold text-amber-800 group-hover:text-amber-950 transition flex items-center gap-0.5">
                  Coba Simulasi →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Educational Simulation Notice Footer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
        <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-slate-800">
            Jaminan Isolasi Finansial Sandbox:
          </p>
          <p className="text-[11.5px] leading-relaxed text-slate-600">
            Semua transaksi di katalog ini hanya memotong saldo koin virtual sandbox. Tidak ada pemanggilan API ke vendor riil dan saldo kas riil DaPay Anda dijamin 100% aman tanpa pemotongan.
          </p>
        </div>
      </div>

      {/* 5. Product Detail & Simulated Checkout Modal */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 text-slate-900 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isTransacting}
              className="absolute right-3.5 top-3.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>

            {/* Simulation Badge */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900 border border-amber-300">
                <FlaskConical size={12} className="text-amber-600" />
                {activeProduct.badge}
              </span>
            </div>

            <h3 className="text-base font-black text-slate-950 leading-tight">
              {activeProduct.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-1">
              SKU: {activeProduct.sku}
            </p>

            {/* Transaction Success View */}
            {transactionResult ? (
              <div className="my-4 space-y-3 animate-in zoom-in-95 duration-150">
                <div className={`p-4 rounded-2xl border text-center ${
                  transactionResult.status === "Berhasil"
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : "bg-rose-50/80 border-rose-300 text-rose-950"
                }`}>
                  <div className="flex justify-center mb-2">
                    {transactionResult.status === "Berhasil" ? (
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={22} />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                        <AlertCircle size={22} />
                      </div>
                    )}
                  </div>

                  <h4 className="text-sm font-black">
                    {transactionResult.status === "Berhasil"
                      ? "Transaksi Simulasi Berhasil!"
                      : "Transaksi Simulasi Gagal"}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    {transactionResult.message}
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-slate-200/70 space-y-1.5 text-xs text-left bg-white/70 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order ID:</span>
                      <span className="font-mono font-bold text-slate-800">#{transactionResult.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">No. Tujuan:</span>
                      <span className="font-mono font-bold text-slate-800">{transactionResult.customerNo}</span>
                    </div>
                    {transactionResult.sn && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Serial Number (SN):</span>
                        <span className="font-mono font-black text-emerald-700">{transactionResult.sn}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Koin Terpotong:</span>
                      <span className="font-mono font-bold text-slate-900">Rp {transactionResult.amount.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/70 pt-1.5 font-bold">
                      <span className="text-slate-600">Sisa Saldo Koin:</span>
                      <span className="font-mono text-amber-700">Rp {transactionResult.remainingBalance.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTransactionResult(null);
                      setTransactionError(null);
                    }}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Beli Lagi
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Product Specifications */}
                <div className="my-3.5 rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kategori:</span>
                    <span className="font-bold text-slate-900">{activeProduct.categoryLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Brand Provider:</span>
                    <span className="font-bold text-slate-900">{activeProduct.brand}</span>
                  </div>
                </div>

                {/* Margin Simulator Summary */}
                <div className="rounded-2xl border border-amber-300/80 bg-linear-to-br from-amber-50/90 via-orange-50/60 to-amber-100/50 p-3.5 mb-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                      <TrendingUp size={13} className="text-emerald-700" />
                      Simulasi Margin Keuntungan
                    </span>
                    <span className="text-[9px] font-bold text-amber-800/80 bg-amber-200/60 px-1.5 py-0.5 rounded-full">
                      Ilustratif
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-200/80 text-center mb-2.5">
                    <div>
                      <p className="text-[8.5px] font-bold text-slate-400 uppercase">Modal Demo</p>
                      <p className="text-xs font-black text-slate-900 font-mono mt-0.5">
                        Rp {activeProduct.demoPrice.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8.5px] font-bold text-slate-400 uppercase">Jual Simulasi</p>
                      <p className="text-xs font-black text-slate-900 font-mono mt-0.5">
                        Rp {currentSellingPrice.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8.5px] font-bold text-emerald-700 uppercase">Est. Margin</p>
                      <p className="text-xs font-black text-emerald-700 font-mono mt-0.5">
                        +Rp {currentMargin.marginAmount.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                    <span>Opsi Harga Jual:</span>
                    <button
                      type="button"
                      onClick={() => setCustomSellingPrice(activeProduct.suggestedSellingPrice)}
                      className="text-[9.5px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={9} /> Reset
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {[1000, 1500, 2000, 3000].map((delta) => {
                      const targetPrice = activeProduct.demoPrice + delta;
                      const isActive = currentSellingPrice === targetPrice;
                      return (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => setCustomSellingPrice(targetPrice)}
                          className={`rounded-lg py-1 text-[9.5px] font-bold transition cursor-pointer ${
                            isActive
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          +Rp {delta.toLocaleString("id-ID")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Simulated Order Checkout Section */}
                <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs mb-3.5">
                  <div className="space-y-1">
                    <label
                      htmlFor="customer-no-input"
                      className="block text-[11px] font-bold text-slate-800"
                    >
                      {activeProduct.category === "pln" ? "Nomor Meter / ID Pelanggan PLN:" : "Nomor HP Tujuan (Simulasi):"}
                    </label>
                    <input
                      id="customer-no-input"
                      type="text"
                      value={targetNumber}
                      onChange={(e) => setTargetNumber(e.target.value)}
                      placeholder={activeProduct.category === "pln" ? "Contoh: 14023456789" : "Contoh: 081234567890"}
                      disabled={isTransacting}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200"
                    />
                    <p className="text-[10px] text-slate-400">
                      *Masukkan nomor tujuan apa saja untuk keperluan simulasi.
                    </p>
                  </div>

                  {transactionError && (
                    <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-800 border border-rose-200">
                      <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{transactionError}</span>
                    </div>
                  )}

                  {isSimulationQuotaExhausted && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-200">
                      <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">Batas kuota simulasi harian Anda telah tercapai. Eksplorasi katalog tetap aktif, silakan lanjutkan transaksi besok.</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleExecuteSimulatedTransaction}
                    disabled={isTransacting || isSimulationQuotaExhausted}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition cursor-pointer disabled:opacity-50"
                  >
                    {isTransacting ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-slate-950" />
                        <span>Memproses Transaksi Simulasi...</span>
                      </>
                    ) : isSimulationQuotaExhausted ? (
                      <>
                        <FlaskConical size={14} />
                        <span>Batas Kuota Tercapai (Coba Besok)</span>
                      </>
                    ) : (
                      <>
                        <FlaskConical size={14} />
                        <span>Beli dengan Koin (Rp {activeProduct.demoPrice.toLocaleString("id-ID")})</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isTransacting}
                  className="w-full py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer text-center"
                >
                  Batal
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
