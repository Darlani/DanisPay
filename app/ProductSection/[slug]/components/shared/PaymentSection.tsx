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
    <section ref={step3Ref} className="bg-white rounded-2xl sm:rounded-3xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-[#B2DFDB]/40 overflow-hidden relative">
      {/* Header Model Ribbon Sidebar sesuai Step 1 & 2 [cite: 2026-03-09] */}
      <div className="flex items-stretch border-b border-[#E0F2F1] bg-[#F5FBFA]">
        <div className="bg-[#00695C] w-12 sm:w-16 flex items-center justify-center text-white font-black text-xl sm:text-2xl shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.1)] z-10">
          3
        </div>
        <div className="py-3 px-4 sm:py-5 sm:px-6 flex flex-col justify-center">
          <h2 className="font-black text-[16px] sm:text-xl tracking-tight text-slate-800 leading-none">Pilih Metode Bayar</h2>
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 tracking-wider mt-1 lowercase first-letter:uppercase">Pilih metode pembayaran favoritmu</p>
        </div>
      </div>
      
      <div className="p-4 sm:p-8 space-y-8">
{/* Kontainer Koin: Posisi Wajib Login di Tengah [cite: 2026-03-09] */}
        <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-md animate-in fade-in mb-6 relative overflow-hidden border transition-all ${!currentUser?.id ? 'bg-slate-50 border-slate-200' : 'bg-[#F3F4FF] border-indigo-100'}`}>
          
{/* Badge BEST PAYMENT versi mini & slim [cite: 2026-03-09] */}
          <div className="absolute top-0 right-0 bg-orange-500 text-white text-[7px] font-black px-2 py-0.5 rounded-bl-lg shadow-sm uppercase tracking-tight z-10 pointer-events-none">
            BEST PAYMENT
          </div>

          {/* SISI KIRI: Info Judul & Saldo [cite: 2026-03-09] */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-[15px] leading-none tracking-tight italic">
                <span className="text-[#FFC107]">Da</span><span className="text-[#2962FF]">Pay</span> <span className="text-slate-700 not-italic ml-0.5">Coins</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-[11px] font-bold leading-none truncate" suppressHydrationWarning>
                Sisa {isMounted ? `${(currentUser?.id ? userCoins : 0).toLocaleString('id-ID')} Koin (Setara ${formatRupiah(currentUser?.id ? userCoins : 0)})` : "0"}
              </p>
              {currentUser?.id && useCoins && usedCoinsAmount > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold animate-in fade-in shadow-sm shrink-0">
                  -{formatRupiah(usedCoinsAmount)}
                </span>
              )}
            </div>
          </div>

          {/* SISI TENGAH: Badge Wajib Login [cite: 2026-03-09] */}
          {!currentUser?.id && (
            <div className="bg-white px-3 py-1 rounded-lg border-2 border-slate-200 shadow-[0_3px_0_0_#e2e8f0] animate-pulse cursor-pointer shrink-0">
              <span className="text-rose-500 text-[9px] font-black uppercase tracking-tighter italic whitespace-nowrap">Wajib Login</span>
            </div>
          )}
          
          {/* SISI KANAN: Tombol Switch [cite: 2026-03-09] */}
          <button
            onClick={() => currentUser?.id && setUseCoins(!useCoins)}
            disabled={!currentUser?.id || userCoins <= 0}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ease-in-out shrink-0 ${
              useCoins && currentUser?.id ? 'bg-[#00796B]' : 'bg-slate-300'
            } ${(!currentUser?.id || userCoins <= 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-300 ease-in-out ${useCoins && currentUser?.id ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Section QRIS Terpisah (Tepat di bawah Coin) [cite: 2026-03-09] */}
        {dbPayments?.filter(p => p.name.toUpperCase().includes('QRIS')).map((pay) => {
          const isMaintenance = pay.is_maintenance === true;
          const isAllowed = isPaymentAllowed(pay.name, productName, totalPrice, pay);
          return (
            <div key={pay.id} className="mb-6 space-y-3">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Metode Rekomendasi</p>
              <button 
                disabled={!isAllowed || isMaintenance} 
                onClick={() => { setSelectedPayment(pay.name); scrollToNext(step4Ref); }}
                className={`group flex items-center p-3 sm:p-5 rounded-2xl border-2 transition-all min-h-20 sm:min-h-25 animate-in fade-in duration-300 relative overflow-hidden w-full ${(!isAllowed || isMaintenance) ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 grayscale' : selectedPayment === pay.name ? 'border-[#00796B] bg-[#E0F2F1]/60 shadow-md shadow-teal-900/10' : 'border-[#E0F2F1] bg-white hover:border-[#80CBC4] hover:shadow-teal-100'}`}
              >
{/* Badge BEST PAYMENT versi mini & slim [cite: 2026-03-09] */}
                <div className="absolute top-0 right-0 bg-orange-500 text-white text-[7px] font-black px-2 py-0.5 rounded-bl-lg shadow-sm uppercase tracking-tight z-10 pointer-events-none">
                  BEST PAYMENT
                </div>

                <div className="w-20 h-12 sm:w-24 sm:h-14 rounded-xl bg-white border border-[#E0F2F1] flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-sm">
                  <img src={pay.logo_url || '/default-logo.png'} alt={pay.name} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="ml-4 sm:ml-5 text-left flex-1">
                  <p className={`text-sm font-black tracking-tight ${(!isAllowed || isMaintenance) ? 'text-slate-400' : selectedPayment === pay.name ? 'text-[#00796B]' : 'text-slate-800'}`}>{pay.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-1">
                    {isMaintenance ? '🛠️ MAINTENANCE' : 'Proses Instan & Otomatis'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[11px] sm:text-sm font-black ${(!isAllowed || isMaintenance) ? 'text-slate-300' : 'text-slate-900'}`}>{formatRupiah(totalPrice)}</p>
                </div>
              </button>
            </div>
          );
        })}

        <div className="space-y-4">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">E-Wallet</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortActivePayments(dbPayments?.filter(p => {
              const n = p.name.toUpperCase();
              const isVA = n.includes('VA') || n.includes('VIRTUAL ACCOUNT');
              const isRetail = ['ALFAMART', 'INDOMARET', 'LAWSON', 'ALFAMIDI'].some(r => n.includes(r));
              const isTransfer = n.includes('TRANSFER') || n.includes('ATM BERSAMA') || n.includes('MANUAL');
              const isQRIS = n.includes('QRIS');
              {/* Tambahkan !isQRIS agar tidak muncul dua kali [cite: 2026-03-09] */}
              return !isVA && !isRetail && !isTransfer && !isQRIS;
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
                  /* Pastikan ada overflow-hidden di sini [cite: 2026-03-09] */
                  className={`group flex items-center p-3 sm:p-5 rounded-2xl border-2 transition-all min-h-20 sm:min-h-25 animate-in fade-in duration-300 relative overflow-hidden ${(!isAllowed || isMaintenance) ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 grayscale' : selectedPayment === finalMethodName ? 'border-[#00796B] bg-[#E0F2F1]/60 shadow-md shadow-teal-900/10' : 'border-[#E0F2F1] bg-white hover:border-[#80CBC4] hover:shadow-teal-100'}`}
                >
                  {/* Kondisi jika pembayaran QRIS, tampilkan label miring [cite: 2026-03-09] */}
                  {pay.name.toUpperCase().includes('QRIS') && (
                    <div className="absolute top-0 right-0 h-10 w-10">
                      <div className="absolute top-1.5 -right-4 bg-orange-500 text-white text-[6px] font-black py-0.5 w-16 text-center rotate-45 shadow-sm uppercase tracking-tighter">
                        Best
                      </div>
                    </div>
                  )}
                  <div className="w-24 h-14 rounded-xl bg-white border border-[#E0F2F1] flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-sm"><img src={pay.logo_url || '/default-logo.png'} alt={pay.name} className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110" /></div>
                  <div className="ml-5 text-left flex-1">
                    <p className={`text-sm font-black tracking-tight ${(!isAllowed || isMaintenance) ? 'text-slate-400' : selectedPayment === finalMethodName ? 'text-[#00796B]' : 'text-slate-800'}`}>{pay.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-1">
                      {isMaintenance ? <span className="text-rose-500 font-black">🛠️ MAINTENANCE</span> : !isAllowed ? 'Limit Tercapai' : 'Proses Instan'}
                    </p>
                  </div>
                  <div className="text-right shrink-0"><p className={`text-[11px] sm:text-sm font-black ${(!isAllowed || isMaintenance) ? 'text-slate-300' : 'text-slate-900'}`}>{formatRupiah(totalPrice)}</p></div>
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
                      className={`group flex items-center p-3 sm:p-5 rounded-2xl border-2 transition-all min-h-20 sm:min-h-25 ${(!isAllowed || isMaintenance) ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 grayscale' : selectedPayment === pay.name ? 'border-[#00796B] bg-[#E0F2F1]/60 shadow-md shadow-teal-900/10' : 'border-[#E0F2F1] bg-white hover:border-[#80CBC4] hover:shadow-teal-100'}`}
                    >
                      <div className="w-24 h-14 rounded-xl bg-white border border-[#E0F2F1] flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-sm"><img src={pay.logo_url || '/default-logo.png'} alt={pay.name} className="max-w-full max-h-full object-contain" /></div>
                      <div className="ml-5 text-left flex-1">
                        <p className={`text-sm font-black tracking-tight ${(!isAllowed || isMaintenance) ? 'text-slate-400' : selectedPayment === pay.name ? 'text-[#00796B]' : 'text-slate-800'}`}>{pay.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-1">
                          {isMaintenance ? <span className="text-rose-500 font-black">🛠️ MAINTENANCE</span> : !isAllowed ? 'Limit Tercapai' : 'Cek Otomatis'}
                        </p>
                      </div>
                      <div className="text-right shrink-0"><p className={`text-[11px] sm:text-sm font-black ${(!isAllowed || isMaintenance) ? 'text-slate-300' : 'text-slate-900'}`}>{formatRupiah(totalPrice)}</p></div>
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
                      className={`group flex items-center p-3 sm:p-5 rounded-2xl border-2 transition-all min-h-20 sm:min-h-25 ${(!isAllowed || isMaintenance) ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 grayscale' : selectedPayment === pay.name ? 'border-[#00796B] bg-[#E0F2F1]/60 shadow-md shadow-teal-900/10' : 'border-[#E0F2F1] bg-white hover:border-[#80CBC4] hover:shadow-teal-100'}`}
                    >
                      <div className="w-24 h-14 rounded-xl bg-white border border-[#E0F2F1] flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-sm"><img src={pay.logo_url || '/default-logo.png'} alt={pay.name} className="max-w-full max-h-full object-contain" /></div>
                      <div className="ml-5 text-left flex-1">
                        <p className={`text-sm font-black tracking-tight ${(!isAllowed || isMaintenance) ? 'text-slate-400' : selectedPayment === pay.name ? 'text-[#00796B]' : 'text-slate-800'}`}>{pay.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-1">
                          {isMaintenance ? <span className="text-rose-500 font-black">🛠️ MAINTENANCE</span> : !isAllowed ? 'Limit Tercapai' : 'Bayar Kasir'}
                        </p>
                      </div>
                      <div className="text-right shrink-0"><p className={`text-[11px] sm:text-sm font-black ${(!isAllowed || isMaintenance) ? 'text-slate-300' : 'text-slate-900'}`}>{formatRupiah(totalPrice)}</p></div>
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
                      className={`group flex items-center p-3 sm:p-5 rounded-2xl border-2 transition-all min-h-20 sm:min-h-25 ${(!isAllowed || isMaintenance) ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 grayscale' : selectedPayment === pay.name ? 'border-[#00796B] bg-[#E0F2F1]/60 shadow-md shadow-teal-900/10' : 'border-[#E0F2F1] bg-white hover:border-[#80CBC4] hover:shadow-teal-100'}`}
                    >
                      <div className="w-24 h-14 rounded-xl bg-white border border-[#E0F2F1] flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-sm"><img src={pay.logo_url || '/default-logo.png'} alt={pay.name} className="max-w-full max-h-full object-contain" /></div>
                      <div className="ml-5 text-left flex-1">
                        <p className={`text-sm font-black tracking-tight ${(!isAllowed || isMaintenance) ? 'text-slate-400' : selectedPayment === pay.name ? 'text-[#00796B]' : 'text-slate-800'}`}>{pay.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mt-1">
                          {isMaintenance ? <span className="text-rose-500 font-black">🛠️ MAINTENANCE</span> : !isAllowed ? 'Limit Tercapai' : 'Konfirmasi Manual'}
                        </p>
                      </div>
                      <div className="text-right shrink-0"><p className={`text-[11px] sm:text-sm font-black ${(!isAllowed || isMaintenance) ? 'text-slate-300' : 'text-slate-900'}`}>{formatRupiah(totalPrice)}</p></div>
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