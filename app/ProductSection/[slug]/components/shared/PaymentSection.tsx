"use client";

import { Zap, ChevronRight } from "lucide-react";
import { isPaymentAllowed } from '@/utils/LogicPembayaran';

interface PaymentSectionProps {
  step3Ref: React.RefObject<HTMLDivElement | null>;
  step4Ref: React.RefObject<HTMLDivElement | null>;
  currentUser: any;
  useCoins: boolean;
  setUseCoins: (val: boolean) => void;
  usedCoinsAmount: number;
  userCoins: number;
  isMounted: boolean;
  formatRupiah: (num: number) => string;
  dbPayments: any[];
  showAllPayment: boolean;
  setShowAllPayment: (val: boolean) => void;
  selectedPayment: string | null;
  setSelectedPayment: (method: string | null) => void;
  totalPrice: number;
  productName: string;
  scrollToNext: (ref: React.RefObject<HTMLDivElement | null>) => void;
}

export default function PaymentSection(props: PaymentSectionProps) {
  const {
    step3Ref, step4Ref, currentUser, useCoins, setUseCoins, usedCoinsAmount,
    userCoins, isMounted, formatRupiah, dbPayments, showAllPayment,
    setShowAllPayment, selectedPayment, setSelectedPayment, totalPrice,
    productName, scrollToNext
  } = props;

  const sortActivePayments = (list: any[]) => {
    if (!list) return [];
    return [...list].sort((a, b) => {
      const isAAllowed = isPaymentAllowed(a.name, productName, totalPrice, a);
      const isBAllowed = isPaymentAllowed(b.name, productName, totalPrice, b);
      return (isAAllowed === isBAllowed) ? 0 : (isAAllowed ? -1 : 1);
    });
  };

  return (
    <section ref={step3Ref} className="bg-white rounded-[2.5rem] shadow-sm border border-[#B2DFDB]/40 overflow-hidden relative">
      <div className="p-4 sm:p-8 border-b border-[#E0F2F1] bg-[#F5FBFA]">
        <div className="flex items-center gap-5">
          <div className="bg-linear-to-br from-[#00695C] to-[#004D40] text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-teal-900/10 text-xl">
            3
          </div>
          <div>
            <h2 className="font-black text-2xl tracking-tight text-slate-800 leading-none">Pilih Metode Bayar</h2>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-1.5 lowercase first-letter:uppercase">Pilih metode pembayaran favoritmu</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-8 space-y-8">
        {currentUser && (
          <div className="bg-[#F3F4FF] rounded-[20px] p-5 flex items-center justify-between shadow-sm animate-in fade-in mb-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-black text-[15px] leading-none tracking-tight italic">
                  <span className="text-[#FFC107]">Da</span><span className="text-[#2962FF]">Pay</span>
                </span>
                {useCoins && usedCoinsAmount > 0 && (
                   <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold animate-in fade-in shadow-sm">
                      -{formatRupiah(usedCoinsAmount)}
                   </span>
                )}
              </div>
              <p className="text-slate-500 text-xs font-bold leading-none mt-1" suppressHydrationWarning>
                Sisa {isMounted ? `${(userCoins - usedCoinsAmount).toLocaleString('id-ID')} Koin (Setara ${formatRupiah(userCoins - usedCoinsAmount)})` : "0"}
              </p>
            </div>
            
            <button
              onClick={() => setUseCoins(!useCoins)}
              disabled={userCoins <= 0}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ease-in-out shrink-0 ${
                useCoins ? 'bg-[#00796B]' : 'bg-slate-300'
              } ${userCoins <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-300 ease-in-out ${useCoins ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">E-Wallet & QRIS</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortActivePayments(dbPayments?.filter(p => {
              const n = p.name.toUpperCase();
              const isVA = n.includes('VA') || n.includes('VIRTUAL ACCOUNT');
              const isRetail = ['ALFAMART', 'INDOMARET', 'LAWSON', 'ALFAMIDI'].some(r => n.includes(r));
              const isTransfer = n.includes('TRANSFER') || n.includes('ATM BERSAMA') || n.includes('MANUAL');
              return !isVA && !isRetail && !isTransfer;
            })).map((pay, index) => {
              const isMaintenance = pay.is_maintenance === true;
              const isAllowed = isPaymentAllowed(pay.name, productName, totalPrice, pay);
              const internalMethods = ['DANA', 'OVO', 'GOPAY', 'SHOPEEPAY', 'LINKAJA', 'ISAKU', 'I.SAKU', 'SAKUKU'];
              const finalMethodName = internalMethods.includes(pay.name.toUpperCase()) ? `${pay.name} Sesama` : pay.name;
              
              if (index >= 4 && !showAllPayment) return null;

              return (
                <button 
                  key={pay.id} 
                  disabled={!isAllowed || isMaintenance} 
                  onClick={() => { setSelectedPayment(finalMethodName); scrollToNext(step4Ref); }}
                  className={`group flex items-center p-5 rounded-3xl border-2 transition-all min-h-25 animate-in fade-in duration-300 ${(!isAllowed || isMaintenance) ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 grayscale' : selectedPayment === finalMethodName ? 'border-[#00796B] bg-[#E0F2F1]/60 shadow-md shadow-teal-900/10' : 'border-[#E0F2F1] bg-white hover:border-[#80CBC4] hover:shadow-teal-100'}`}
                >
                  <div className="w-24 h-14 rounded-xl bg-white border border-[#E0F2F1] flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-sm"><img src={pay.logo_url || '/default-logo.png'} alt={pay.name} className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110" /></div>
                  <div className="ml-5 text-left flex-1">
                    <p className={`text-sm font-black tracking-tight ${(!isAllowed || isMaintenance) ? 'text-slate-400' : selectedPayment === finalMethodName ? 'text-[#00796B]' : 'text-slate-800'}`}>{pay.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-1">
                      {isMaintenance ? <span className="text-rose-500 font-black">🛠️ MAINTENANCE</span> : !isAllowed ? 'Limit Tercapai' : 'Proses Instan'}
                    </p>
                  </div>
                  <div className="text-right shrink-0"><p className={`text-sm font-black ${(!isAllowed || isMaintenance) ? 'text-slate-300' : 'text-slate-900'}`}>{formatRupiah(totalPrice)}</p></div>
                </button>
              );
            })}
          </div>
        </div>

        {!showAllPayment && (
          <button onClick={() => setShowAllPayment(true)} className="w-full py-4 bg-[#F5FBFA] hover:bg-[#004D40] border-2 border-dashed border-[#B2DFDB] hover:border-[#004D40] rounded-3xl transition-all duration-300 group shadow-sm">
            <div className="flex items-center justify-center gap-3">
              <span className="font-black text-[11px] capitalize tracking-normal text-[#00796B] group-hover:text-white transition-colors">Lihat semua metode pembayaran</span>
              <ChevronRight size={16} className="text-[#4DB6AC] group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        )}

        {showAllPayment && (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            
            <div className="space-y-4">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Virtual Account</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortActivePayments(dbPayments?.filter(p => {
                  const n = p.name.toUpperCase();
                  return n.includes('VA') || n.includes('VIRTUAL ACCOUNT');
                })).map((pay, index) => {
                  const isMaintenance = pay.is_maintenance === true;
                  const isAllowed = isPaymentAllowed(pay.name, productName, totalPrice, pay);
                  return (
                    <button key={pay.id} disabled={!isAllowed || isMaintenance} onClick={() => { setSelectedPayment(pay.name); scrollToNext(step4Ref); }} 
                      className={`group flex items-center p-5 rounded-3xl border-2 transition-all min-h-25 ${(!isAllowed || isMaintenance) ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 grayscale' : selectedPayment === pay.name ? 'border-[#00796B] bg-[#E0F2F1]/60 shadow-md shadow-teal-900/10' : 'border-[#E0F2F1] bg-white hover:border-[#80CBC4] hover:shadow-teal-100'}`}
                    >
                      <div className="w-24 h-14 rounded-xl bg-white border border-[#E0F2F1] flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-sm"><img src={pay.logo_url || '/default-logo.png'} alt={pay.name} className="max-w-full max-h-full object-contain" /></div>
                      <div className="ml-5 text-left flex-1">
                        <p className={`text-sm font-black tracking-tight ${(!isAllowed || isMaintenance) ? 'text-slate-400' : selectedPayment === pay.name ? 'text-[#00796B]' : 'text-slate-800'}`}>{pay.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-1">
                          {isMaintenance ? <span className="text-rose-500 font-black">🛠️ MAINTENANCE</span> : !isAllowed ? 'Limit Tercapai' : 'Cek Otomatis'}
                        </p>
                      </div>
                      <div className="text-right shrink-0"><p className={`text-sm font-black ${(!isAllowed || isMaintenance) ? 'text-slate-300' : 'text-slate-900'}`}>{formatRupiah(totalPrice)}</p></div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Gerai Retail / OTC</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortActivePayments(dbPayments?.filter(p => {
                  const n = p.name.toUpperCase();
                  return ['ALFAMART', 'INDOMARET', 'LAWSON', 'ALFAMIDI'].some(r => n.includes(r));
                })).map((pay, index) => {
                  const isMaintenance = pay.is_maintenance === true;
                  const isAllowed = isPaymentAllowed(pay.name, productName, totalPrice, pay);
                  return (
                    <button key={pay.id} disabled={!isAllowed || isMaintenance} onClick={() => { setSelectedPayment(pay.name); scrollToNext(step4Ref); }} 
                      className={`group flex items-center p-5 rounded-3xl border-2 transition-all min-h-25 ${(!isAllowed || isMaintenance) ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 grayscale' : selectedPayment === pay.name ? 'border-[#00796B] bg-[#E0F2F1]/60 shadow-md shadow-teal-900/10' : 'border-[#E0F2F1] bg-white hover:border-[#80CBC4] hover:shadow-teal-100'}`}
                    >
                      <div className="w-24 h-14 rounded-xl bg-white border border-[#E0F2F1] flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-sm"><img src={pay.logo_url || '/default-logo.png'} alt={pay.name} className="max-w-full max-h-full object-contain" /></div>
                      <div className="ml-5 text-left flex-1">
                        <p className={`text-sm font-black tracking-tight ${(!isAllowed || isMaintenance) ? 'text-slate-400' : selectedPayment === pay.name ? 'text-[#00796B]' : 'text-slate-800'}`}>{pay.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-1">
                          {isMaintenance ? <span className="text-rose-500 font-black">🛠️ MAINTENANCE</span> : !isAllowed ? 'Limit Tercapai' : 'Bayar Kasir'}
                        </p>
                      </div>
                      <div className="text-right shrink-0"><p className={`text-sm font-black ${(!isAllowed || isMaintenance) ? 'text-slate-300' : 'text-slate-900'}`}>{formatRupiah(totalPrice)}</p></div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Manual Transfer & ATM</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortActivePayments(dbPayments?.filter(p => {
                  const n = p.name.toUpperCase();
                  return n.includes('TRANSFER') || n.includes('ATM BERSAMA') || n.includes('MANUAL');
                })).map((pay, index) => {
                  const isMaintenance = pay.is_maintenance === true;
                  const isAllowed = isPaymentAllowed(pay.name, productName, totalPrice, pay);
                  return (
                    <button key={pay.id} disabled={!isAllowed || isMaintenance} onClick={() => { setSelectedPayment(pay.name); scrollToNext(step4Ref); }} 
                      className={`group flex items-center p-5 rounded-3xl border-2 transition-all min-h-25 ${(!isAllowed || isMaintenance) ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 grayscale' : selectedPayment === pay.name ? 'border-[#00796B] bg-[#E0F2F1]/60 shadow-md shadow-teal-900/10' : 'border-[#E0F2F1] bg-white hover:border-[#80CBC4] hover:shadow-teal-100'}`}
                    >
                      <div className="w-24 h-14 rounded-xl bg-white border border-[#E0F2F1] flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-sm"><img src={pay.logo_url || '/default-logo.png'} alt={pay.name} className="max-w-full max-h-full object-contain" /></div>
                      <div className="ml-5 text-left flex-1">
                        <p className={`text-sm font-black tracking-tight ${(!isAllowed || isMaintenance) ? 'text-slate-400' : selectedPayment === pay.name ? 'text-[#00796B]' : 'text-slate-800'}`}>{pay.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-1">
                          {isMaintenance ? <span className="text-rose-500 font-black">🛠️ MAINTENANCE</span> : !isAllowed ? 'Limit Tercapai' : 'Konfirmasi Manual'}
                        </p>
                      </div>
                      <div className="text-right shrink-0"><p className={`text-sm font-black ${(!isAllowed || isMaintenance) ? 'text-slate-300' : 'text-slate-900'}`}>{formatRupiah(totalPrice)}</p></div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </section>
  );
}