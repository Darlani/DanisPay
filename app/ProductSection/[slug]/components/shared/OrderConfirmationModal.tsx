// @/app/ProductSection/[slug]/components/shared/OrderConfirmationModal.tsx
"use client";

import { Loader2, CheckCircle2, CircleDollarSign, Zap, ShieldCheck } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  selectedItem: any;
  accId: string;
  selectedPayment: string | null;
  totalPrice: number;
  nominalHemat: number;
  usedCoinsAmount: number;
  estimasiCashback: number;
  memberType: string | null;
  formatRupiah: (num: number) => string;
  isProcessing: boolean;
  handleCheckout: () => void;
  dynamicLabel: string;
  isMounted: boolean;
  uniqueCode: number;
  isLoading: boolean;
}

export default function OrderConfirmationModal(props: ModalProps) {
  const {
    isOpen, onClose, product, selectedItem, accId, selectedPayment,
    totalPrice, nominalHemat, usedCoinsAmount, estimasiCashback,
    memberType, formatRupiah, isProcessing, handleCheckout, dynamicLabel, isMounted,
    uniqueCode, isLoading
  } = props;

  if (!isOpen) return null;

  const basePrice = totalPrice; 
  // Gunakan ternary agar Total Bayar tidak muncul sebelum kode unik siap
  // Jika sudah ada kode unik ATAU dia member (tidak loading), tampilkan harga
const finalTotalAmount = (uniqueCode > 0 || (!isLoading && memberType)) 
  ? (totalPrice + uniqueCode) 
  : null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative z-101 bg-white w-full max-w-md rounded-4xl shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-300 pointer-events-auto">
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-white text-center sm:text-left">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Konfirmasi Pesanan</h3>
          <p className="text-xs font-medium text-slate-500 mt-1">Mohon periksa kembali detail pesanan Anda</p>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="space-y-2">
            {[
              { label: "Produk", val: product?.name },
              { label: "Item", val: selectedItem?.label },
              { label: dynamicLabel, val: accId, blue: true },
              { label: "Metode Pembayaran", val: selectedPayment }
            ].map((row, idx) => (
              <div key={idx} className={`flex justify-between items-center py-3 px-4 rounded-xl border ${row.blue ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                <span className="text-xs font-semibold text-slate-500">{row.label}</span>
                <span className={`text-sm font-bold text-right ml-4 truncate ${row.blue ? 'text-blue-600' : 'text-slate-800'}`}>
                  {row.val}
                </span>
              </div>
            ))}

            {nominalHemat > 0 && (
              <div className="flex justify-between items-center p-4 rounded-xl border bg-orange-50 border-orange-100 animate-in slide-in-from-top-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-orange-600 mb-0.5">Total Hemat</span>
                  <span className="text-[10px] font-medium text-orange-500">Diskon + Kode Promo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="bg-orange-500 text-white p-1 rounded-md"><CircleDollarSign size={14} /></div>
                  <span className="text-sm font-bold text-orange-700" suppressHydrationWarning>
                    {isMounted ? formatRupiah(nominalHemat) : "..."}
                  </span>
                </div>
              </div>
            )}

            {usedCoinsAmount > 0 && (
              <div className="flex justify-between items-center p-4 rounded-xl border bg-[#F3F4FF] border-[#E0E7FF] animate-in slide-in-from-top-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold leading-none mb-1">
                    <span className="text-[#FFC107]">Da</span><span className="text-[#2962FF]">Pay</span>
                  </span>
                  <span className="text-[10px] font-medium text-[#7c3aed]">Saldo dipakai untuk bayar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="bg-linear-to-br from-[#FFC107] to-[#FF9800] text-white p-1 rounded-md">
                    <Zap size={14} className="fill-current" />
                  </div>
                  <span className="text-sm font-bold text-[#6d28d9]" suppressHydrationWarning>
                    {isMounted ? `-${formatRupiah(usedCoinsAmount)}` : "..."}
                  </span>
                </div>
              </div>
            )}

            <div className={`flex justify-between items-center p-4 rounded-xl border transition-all ${memberType === "Special" ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-80'}`}>
              <div className="flex flex-col">
                <span className={`text-xs font-semibold ${memberType === "Special" ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {memberType === "Special" ? "Cashback Anda" : "Potensi Cashback"}
                </span>
                {/* Detail yang dikembalikan agar sama persis 100% */}
                {memberType !== "Special" && (
                  <span className="text-[10px] font-medium text-blue-500 underline cursor-pointer mt-0.5" onClick={() => window.location.href='/membership'}>
                    Upgrade ke Special Member
                  </span>
                )}
              </div>
              <div className="flex items-center">
                <span className={`text-sm font-bold ${memberType === "Special" ? 'text-emerald-600' : 'text-slate-500'}`} suppressHydrationWarning>
                  {isMounted ? `+${formatRupiah(estimasiCashback)}` : ""}
                </span>
                <span className={`font-bold text-[10px] ml-1.5 ${memberType === "Special" ? 'opacity-100' : 'opacity-50'}`}>
                  <span className="text-[#FFC107]">Da</span><span className="text-[#2962FF]">Pay</span>
                </span>
                {/* Icon ShieldCheck yang dikembalikan */}
                {memberType !== "Special" && <ShieldCheck size={14} className="ml-2 text-slate-400" />}
              </div>
            </div>
          </div>

          {totalPrice > 0 ? (
            <div className="pt-2 space-y-2">
              {/* Rincian Transparansi Harga */}
              <div className="space-y-1 px-1 border-b border-dashed border-slate-200 pb-2 mb-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-medium">Harga Produk</span>
                  <span className="text-slate-700 font-bold">{isMounted ? formatRupiah(basePrice) : "..."}</span>
                </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-medium">Biaya Layanan</span>
                {uniqueCode > 0 ? (
                  <span className="text-blue-600 font-black italic animate-in zoom-in duration-300">
                    +{formatRupiah(uniqueCode)}
                  </span>
                ) : (
                // 🚀 KUNCI: Tambahkan && memberType agar Tamu tidak bisa melihat ini
                !isProcessing && !isLoading && memberType ? (
                  <span className="text-emerald-600 font-black italic animate-in fade-in">
                    GRATIS (MEMBER)
                  </span>
                ) : (
                    <div className="flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin text-blue-600" />
                      <span className="text-blue-400 italic text-[9px] animate-pulse">Menghitung...</span>
                    </div>
                  )
                )}
              </div>
              </div>

          <div>
              <p className="text-xs font-semibold text-slate-500 mb-1 leading-none">Total Bayar</p>
              <h4 className={`text-2xl font-bold text-blue-600 tracking-tight leading-none ${finalTotalAmount ? 'animate-in fade-in duration-500' : ''}`} suppressHydrationWarning>
                {isMounted ? (
                  finalTotalAmount ? formatRupiah(finalTotalAmount) : "..."
                ) : "..."} 
              </h4>
            </div>
            </div>
          ) : (
            <div className="pt-2 animate-in zoom-in duration-500">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col items-center">
                <p className="text-[10px] font-semibold text-emerald-600 mb-1 text-center w-full">Metode Pembayaran</p>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-lg font-bold text-emerald-700 leading-none">
                    Lunas Pembayaran Koin
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6 pt-0 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all active:scale-95 cursor-pointer">Batal</button>
        <button 
          type="button" 
          // 🚀 KUNCI TOMBOL hanya untuk Tamu jika kode unik belum ada. 
          // Member (uniqueCode 0) tetap bisa klik.
          disabled={isProcessing || (!memberType && uniqueCode === 0)} 
          onClick={handleCheckout}
            className={`py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isProcessing ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer'}`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={16} /> 
                Memproses...
              </>
            ) : "Konfirmasi Pesanan"}
          </button>
        </div>
      </div>
    </div>
  );
}