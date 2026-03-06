// @/app/ProductSection/[slug]/components/shared/StickyBottomBar.tsx
"use client";

import { Zap } from "lucide-react";

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
}

export default function StickyBottomBar(props: StickyProps) {
  const {
    selectedItemId, selectedItem, totalPrice, formatRupiah, isReadyToCheckout,
    setIsModalOpen, nominalHemat, usedCoinsAmount, estimasiCashback,
    currentUser, memberType, isMounted
  } = props;

  if (!selectedItemId || !selectedItem) return null;

  const renderContent = () => {
    if (!isMounted) return null;

    const DaPayText = () => (
      <span className="font-black italic ml-1">
        <span className="text-[#FFC107]">Da</span><span className="text-[#2962FF]">Pay</span>
      </span>
    );

    const CashbackBox = ({ text, amount }: { text: string, amount: number }) => (
      <div className="flex items-center bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-200 shadow-sm animate-in zoom-in shrink-0">
        <div className="bg-emerald-500 rounded-full p-0.5 mr-2 shadow-sm">
          <Zap size={10} className="text-white fill-current" />
        </div>
        <span className="text-emerald-800 font-bold text-[10px] flex items-center" suppressHydrationWarning>
          {text} {formatRupiah(amount)} <DaPayText />
        </span>
      </div>
    );

    const DiskonKoinDisplay = () => (
      <>
        {usedCoinsAmount > 0 && (
          <div className="flex flex-col items-center border-r border-slate-300 pr-3 mr-3 shrink-0 animate-in zoom-in">
            <span className="text-amber-500 font-black text-[9px] uppercase mb-1 leading-none flex items-center gap-1">
               <Zap size={10} className="fill-current"/> Pakai Koin
            </span>
            <span className="text-amber-600 font-black text-sm leading-none" suppressHydrationWarning>-{formatRupiah(usedCoinsAmount)}</span>
          </div>
        )}
        {nominalHemat > 0 && (
          <div className="flex flex-col items-center border-r border-slate-300 pr-3 mr-3 shrink-0 animate-in zoom-in">
            <span className="text-emerald-600 font-black text-[9px] uppercase mb-1 leading-none">Anda Hemat</span>
            <span className="text-emerald-700 font-black text-sm leading-none" suppressHydrationWarning>{formatRupiah(nominalHemat)}</span>
          </div>
        )}
      </>
    );

    if (!currentUser) {
      return (
        <div className="flex items-center animate-in fade-in overflow-x-auto hide-scrollbar w-full">
          <DiskonKoinDisplay />
          <div className="flex flex-col items-center gap-1 shrink-0">
            <button onClick={() => window.location.href = "/login"} className="text-[#2962FF] font-black text-[11px] uppercase hover:underline leading-none">Login Sekarang</button>
            <CashbackBox text="Dapatkan Cashback" amount={estimasiCashback} />
          </div>
        </div>
      );
    }

    if (memberType !== "Special") {
      return (
        <div className="flex items-center animate-in fade-in overflow-x-auto hide-scrollbar w-full">
          <DiskonKoinDisplay />
          <div className="flex flex-col items-start min-w-fit shrink-0 mr-3">
            <span className="text-blue-600 font-black text-[10px] uppercase leading-none">Affiliasi Member</span>
            <span className="text-slate-400 font-medium text-[8px] italic leading-tight">Cek Komisi Dashboard</span>
          </div>
          <button onClick={() => window.location.href = "/dashboard/user"} className="flex flex-col items-center gap-1 active:scale-95 transition-transform shrink-0">
            <span className="text-amber-600 font-black text-[10px] uppercase leading-none">Upgrade Member</span>
            <CashbackBox text="Cashback" amount={estimasiCashback} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center animate-in zoom-in overflow-x-auto hide-scrollbar w-full">
        <DiskonKoinDisplay />
        <div className="flex flex-col items-center leading-none shrink-0">
          <span className="text-emerald-600 font-black text-[11px] uppercase italic tracking-widest mb-1">Selamat!</span>
          <CashbackBox text="Dapat Cashback" amount={estimasiCashback} />
        </div>
      </div>
    );
  };

  return (
    <div className="sticky bottom-4 z-40 w-full flex justify-center pointer-events-none mt-10 mb-4 animate-in slide-in-from-bottom-10 duration-500">
      <div className="pointer-events-auto w-[96%] max-w-5xl bg-[#D6EBE7] border-2 border-white shadow-[0_10px_40px_rgba(0,0,0,0.2)] rounded-[30px] p-2 pr-3 flex items-center justify-between gap-2 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-linear-to-b from-white/60 to-transparent pointer-events-none"></div>
        
        <div className="flex items-center gap-3 pl-3 shrink-0 relative z-10">
          <div className="w-12 h-12 relative hidden sm:flex items-center justify-center shrink-0 drop-shadow-md">
            <div className="absolute inset-0 bg-linear-to-tr from-[#B8860B] via-[#FFD700] to-[#FFFACD] rounded-full border-2 border-[#DAA520]"></div>
            <div className="relative z-10 flex flex-col items-center justify-center leading-none scale-90">
              <Zap size={14} className="text-[#B8860B] fill-current" />
              <span className="font-black text-[9px] italic flex flex-col items-center">
                <span className="text-[#FFC107] -mb-1">Da</span><span className="text-[#2962FF]">Pay</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 font-bold text-[10px] uppercase mb-0.5">TOTAL BAYAR</span>
            <span className="text-[#00796B] font-black text-2xl leading-none" suppressHydrationWarning>
              {isMounted ? formatRupiah(totalPrice) : "..."}
            </span>
            <span className="text-slate-500 font-bold text-[10px] mt-0.5 truncate max-w-30">{selectedItem.label}</span>
          </div>
        </div>

        <div className="flex-1 flex justify-center px-2 relative z-10 overflow-hidden">
          {renderContent()}
        </div>

        <button 
          disabled={!isReadyToCheckout}
          onClick={() => setIsModalOpen(true)}
          className={`px-6 sm:px-10 py-3 sm:py-4 rounded-[20px] border-b-4 shadow-xl flex items-center gap-2 transition-all ${!isReadyToCheckout ? 'bg-slate-400 border-slate-600 text-slate-200 cursor-not-allowed' : 'bg-[#2962FF] border-[#0039CB] text-white hover:bg-[#1E40FF] active:scale-95 cursor-pointer'}`}
        >
          <span className="font-black text-xs sm:text-sm italic uppercase">{isReadyToCheckout ? 'BELI SEKARANG' : 'LENGKAPI DATA'}</span>
          {isReadyToCheckout && <Zap size={16} className="fill-white animate-bounce" />}
        </button>
      </div>
    </div>
  );
}