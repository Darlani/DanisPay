// @/app/ProductSection/[slug]/components/shared/StickyBottomBar.tsx
"use client";

import { Zap, Loader2 } from "lucide-react";

interface StickyProps {
  selectedItemId: string | null;
  selectedItem: any;
  totalPrice: number;
  formatRupiah: (num: number) => string;
  isReadyToCheckout: boolean;
  setIsModalOpen: (val: boolean) => void;
  nominalHemat: number;
  usedCoinsAmount: number;
  estimasiCashback: number;
  currentUser: any;
  memberType: string | null;
  isMounted: boolean;
  onCheckInquiry?: () => Promise<boolean>;
  isChecking?: boolean;
  isLoading?: boolean; 
  onPreCheckout?: () => Promise<void>;
}

export default function StickyBottomBar(props: StickyProps) {
  const {
    selectedItemId, selectedItem, totalPrice, formatRupiah, isReadyToCheckout,
    setIsModalOpen, nominalHemat, usedCoinsAmount, estimasiCashback,
    currentUser, memberType, isMounted, onCheckInquiry, isChecking, isLoading, onPreCheckout
  } = props;

  const handleBuyClick = async () => {
    // 1. Jika ada fungsi cek ID (Inquiry), jalankan dulu
    if (onCheckInquiry) {
      const isValid = await onCheckInquiry();
      if (!isValid) return; // Berhenti jika ID salah
    }

    // 2. Jalankan Pre-Checkout (Minta kode unik ke backend)
    if (onPreCheckout) {
      await onPreCheckout();
    } else {
      setIsModalOpen(true);
    }
  };

  if (!selectedItemId || !selectedItem) return null;

  const renderContent = () => {
    if (!isMounted) return null;

    const DaPayText = () => (
      <span className="font-black italic ml-1">
        <span className="text-[#FFC107]">Da</span><span className="text-[#2962FF]">Pay</span>
      </span>
    );

// Font dan Padding dikecilkan drastis khusus untuk mobile [cite: 2026-03-09]
    const CashbackBox = ({ text, amount }: { text: string, amount: number }) => (
      <div className="flex items-center bg-emerald-50 px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-lg sm:rounded-2xl border border-emerald-200 shadow-sm animate-in zoom-in shrink-0">
        <div className="bg-emerald-500 rounded-full p-0.5 mr-1 sm:mr-2 shadow-sm">
          <Zap size={6} className="text-white fill-current sm:w-2.5 sm:h-2.5" />
        </div>
        <span className="text-emerald-800 font-bold text-[6px] sm:text-[10px] flex items-center" suppressHydrationWarning>
          {text} {formatRupiah(amount)} <DaPayText />
        </span>
      </div>
    );

    const DiskonKoinDisplay = () => (
      <>
        {usedCoinsAmount > 0 && (
          <div className="flex flex-col items-center border-r border-slate-300 pr-1.5 sm:pr-3 mr-1.5 sm:mr-3 shrink-0 animate-in zoom-in">
            <span className="text-amber-500 font-black text-[6px] sm:text-[9px] uppercase mb-0.5 sm:mb-1 leading-none flex items-center gap-0.5 sm:gap-1">
               <Zap size={6} className="fill-current sm:w-2.5 sm:h-2.5"/> Pakai Koin
            </span>
            <span className="text-amber-600 font-black text-[8px] sm:text-sm leading-none" suppressHydrationWarning>-{formatRupiah(usedCoinsAmount)}</span>
          </div>
        )}
        {nominalHemat > 0 && (
          <div className="flex flex-col items-center border-r border-slate-300 pr-1.5 sm:pr-3 mr-1.5 sm:mr-3 shrink-0 animate-in zoom-in">
            <span className="text-emerald-600 font-black text-[6px] sm:text-[9px] uppercase mb-0.5 sm:mb-1 leading-none">Anda Hemat</span>
            <span className="text-emerald-700 font-black text-[8px] sm:text-sm leading-none" suppressHydrationWarning>{formatRupiah(nominalHemat)}</span>
          </div>
        )}
      </>
    );

    if (!currentUser) {
      return (
        <div className="flex items-center animate-in fade-in overflow-x-auto hide-scrollbar w-full">
          <DiskonKoinDisplay />
          <div className="flex flex-col items-center gap-0.5 sm:gap-1 shrink-0">
            <button onClick={() => window.location.href = "/login"} className="text-[#2962FF] font-black text-[7px] sm:text-[11px] uppercase hover:underline leading-none">Login Sekarang</button>
            <CashbackBox text="Dapatkan Cashback" amount={estimasiCashback} />
          </div>
        </div>
      );
    }

    if (memberType !== "Special") {
      return (
        <div className="flex items-center animate-in fade-in overflow-x-auto hide-scrollbar w-full">
          <DiskonKoinDisplay />
          <div className="hidden sm:flex flex-col items-start min-w-fit shrink-0 mr-3">
            <span className="text-blue-600 font-black text-[10px] uppercase leading-none">Affiliasi Member</span>
            <span className="text-slate-400 font-medium text-[8px] italic leading-tight">Cek Komisi</span>
          </div>
          <button onClick={() => window.location.href = "/dashboard/user"} className="flex flex-col items-center gap-0.5 sm:gap-1 active:scale-95 transition-transform shrink-0">
            <span className="text-amber-600 font-black text-[6px] sm:text-[10px] uppercase leading-none">Upgrade Member</span>
            <CashbackBox text="Cashback" amount={estimasiCashback} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center animate-in zoom-in overflow-x-auto hide-scrollbar w-full">
        <DiskonKoinDisplay />
        <div className="flex flex-col items-center leading-none shrink-0">
          <span className="text-emerald-600 font-black text-[6px] sm:text-[11px] uppercase italic tracking-widest mb-0.5 sm:mb-1">Selamat!</span>
          <CashbackBox text="Dapat Cashback" amount={estimasiCashback} />
        </div>
      </div>
    );
  };

  return (
    <div className="sticky bottom-20 sm:bottom-4 z-40 w-full flex justify-center pointer-events-none mt-10 mb-4 animate-in slide-in-from-bottom-10 duration-500">
      {/* Ubah layout jadi flex-col di HP, dan flex-row di Desktop (sm:flex-row) [cite: 2026-03-09] */}
      <div className="pointer-events-auto w-[96%] max-w-5xl bg-[#D6EBE7] border-2 border-white shadow-[0_10px_40px_rgba(0,0,0,0.2)] rounded-3xl p-2.5 sm:p-2 sm:pr-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-2 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-linear-to-b from-white/60 to-transparent pointer-events-none"></div>
        
        {/* ========================================= */}
        {/* BAGIAN ATAS (Mobile) / KIRI & TENGAH (Desktop) */}
        {/* ========================================= */}
        <div className="flex w-full sm:w-auto flex-1 items-center justify-between gap-2 relative z-10">
          
          {/* HARGA & INFO */}
          <div className="flex items-center gap-2 sm:gap-3 sm:pl-3 shrink-0 min-w-0">
            <div className="w-12 h-12 relative hidden sm:flex items-center justify-center shrink-0 drop-shadow-md">
              <div className="absolute inset-0 bg-linear-to-tr from-[#B8860B] via-[#FFD700] to-[#FFFACD] rounded-full border-2 border-[#DAA520]"></div>
              <div className="relative z-10 flex flex-col items-center justify-center leading-none scale-90">
                <Zap size={14} className="text-[#B8860B] fill-current" />
                <span className="font-black text-[9px] italic flex flex-col items-center">
                  <span className="text-[#FFC107] -mb-1">Da</span><span className="text-[#2962FF]">Pay</span>
                </span>
              </div>
            </div>
            
            <div className="flex flex-col min-w-0">
              <span className="text-slate-500 font-bold text-[7px] sm:text-[10px] uppercase mb-0.5">TOTAL BAYAR</span>
              <span className="text-[#00796B] font-black text-[14px] sm:text-2xl leading-none truncate" suppressHydrationWarning>
                {isMounted ? formatRupiah(totalPrice) : "..."}
              </span>
              <span className="text-slate-500 font-medium text-[7px] sm:text-[10px] mt-0.5 truncate w-32 sm:w-40">{selectedItem.label}</span>
            </div>
          </div>

          {/* KONTEN TENGAH (Cashback/Koin/Affiliasi) */}
          <div className="flex justify-end sm:justify-center items-center overflow-hidden min-w-0">
            {renderContent()}
          </div>
        </div>

        {/* ========================================= */}
        {/* BAGIAN BAWAH (Mobile) / KANAN (Desktop) */}
        {/* ========================================= */}
      <button 
        disabled={!isReadyToCheckout || isChecking || isLoading}
        onClick={handleBuyClick}
        className={`w-full sm:w-auto px-4 sm:px-10 py-2.5 sm:py-4 rounded-[14px] sm:rounded-[20px] border-b-4 shadow-xl flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 shrink-0 transition-all ${(!isReadyToCheckout || isChecking || isLoading) ? 'bg-slate-400 border-slate-600 text-slate-200 cursor-not-allowed' : 'bg-[#2962FF] border-[#0039CB] text-white hover:bg-[#1E40FF] active:scale-95 cursor-pointer'}`}
        >
          <span className="font-black text-[11px] sm:text-sm italic uppercase">
            {isChecking ? 'MENGECEK ID...' : isLoading ? 'MEMPROSES...' : isReadyToCheckout ? 'BELI SEKARANG' : 'LENGKAPI DATA'}
          </span>
          {isReadyToCheckout && !isChecking && !isLoading && <Zap size={12} className="fill-white animate-bounce sm:w-4 sm:h-4" />}
          {(isChecking || isLoading) && <Loader2 size={12} className="animate-spin sm:w-4 sm:h-4" />}
        </button>
      </div>
    </div>
  );
}