"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { safeFetch } from '@/utils/apiHelper';

interface ContactAndPromoProps {
  step4Ref: React.RefObject<HTMLDivElement | null>;
  waNumber: string;
  setWaNumber: (val: string) => void;
  promoCode: string;
  setPromoCode: (val: string) => void;
  isPromoApplied: boolean;
  setIsPromoApplied: (val: boolean) => void;
}

export default function ContactAndPromoSection(props: ContactAndPromoProps) {
  const {
    step4Ref, waNumber, setWaNumber, promoCode, setPromoCode,
    isPromoApplied, setIsPromoApplied
  } = props;

  const [isShake, setIsShake] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoCode) return alert("Silakan masukkan kode promo.");
    
    const result = await safeFetch('/api/promo/check', {
      method: 'POST',
      body: JSON.stringify({ code: promoCode })
    });

    if (result.success) {
      setIsPromoApplied(true);
      alert(`Selamat! Potongan harga berhasil diterapkan.`);
    } else {
      setIsPromoApplied(false);
      setIsShake(true);
      setTimeout(() => setIsShake(false), 2000);
      alert(result.message || "Maaf, kode promo tidak valid.");
    }
  };

return (
    <div ref={step4Ref} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
      
{/* STEP 4: KONTAK WHATSAPP (Ukuran Compact/Separuh) */}
      <section className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-[#B2DFDB]/40 overflow-hidden relative h-fit">
        <div className="flex items-stretch border-b border-[#E0F2F1] bg-[#F5FBFA]">
          <div className="bg-[#00695C] w-8 sm:w-10 flex items-center justify-center text-white font-black text-sm sm:text-base shrink-0 z-10 shadow-[1px_0_5px_rgba(0,0,0,0.1)]">
            4
          </div>
          <div className="py-1.5 px-3 sm:py-2.5 sm:px-4 flex flex-col justify-center">
            <h2 className="font-black text-xs sm:text-sm tracking-tight text-slate-800 leading-none">Nomor WhatsApp</h2>
            <p className="text-[7px] sm:text-[8px] font-bold text-slate-500 tracking-wide mt-0.5 lowercase first-letter:uppercase">Info status pesanan (Opsional)</p>
          </div>
        </div>
        <div className="p-3 sm:p-5">
          <input 
            type="text" 
            value={waNumber} 
            onChange={(e) => setWaNumber(e.target.value)} 
            placeholder="Nomor WA (08xxxx)" 
            className="w-full bg-[#F5FBFA] border-2 border-[#E0F2F1] focus:border-[#00796B] focus:bg-white py-2 px-3 sm:py-2.5 sm:px-4 rounded-lg sm:rounded-xl outline-none font-bold text-xs sm:text-sm text-slate-700 transition-all placeholder:text-slate-400" 
          />
          <p className="mt-1.5 ml-1 text-[8px] sm:text-[9px] font-medium text-slate-400 italic leading-tight">
            *Di isi jika ingin menerima bukti transaksi.
          </p>
        </div>
      </section>

      {/* STEP 5: KODE PROMO (Ukuran Compact/Separuh) */}
      <section className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-[#B2DFDB]/40 overflow-hidden relative h-fit">
        <div className="flex items-stretch border-b border-[#E0F2F1] bg-[#F5FBFA]">
          <div className="bg-[#00695C] w-8 sm:w-10 flex items-center justify-center text-white font-black text-sm sm:text-base shrink-0 z-10 shadow-[1px_0_5px_rgba(0,0,0,0.1)]">
            5
          </div>
          <div className="py-1.5 px-3 sm:py-2.5 sm:px-4 flex flex-col justify-center">
            <h2 className="font-black text-xs sm:text-sm tracking-tight text-slate-800 leading-none">Kode Promo</h2>
            <p className="text-[7px] sm:text-[8px] font-bold text-slate-500 tracking-wide mt-0.5 lowercase first-letter:uppercase">Dapat harga hemat (Opsional)</p>
          </div>
        </div>
        <div className="p-3 sm:p-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={promoCode} 
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setIsPromoApplied(false);
                  setIsShake(false);
                }}
                placeholder="KODE PROMO" 
                className={`w-full py-2 px-3 sm:py-2.5 sm:px-4 rounded-lg sm:rounded-xl outline-none font-black text-xs sm:text-sm text-slate-700 uppercase tracking-widest transition-all border-2 ${
                  isShake 
                    ? "animate-shake border-rose-500 bg-rose-50" 
                    : isPromoApplied 
                      ? "border-emerald-500 bg-emerald-50" 
                      : "bg-[#F5FBFA] border-[#E0F2F1] focus:border-[#00796B] focus:bg-white"
                }`} 
              />
              {isPromoApplied && (
                <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 animate-in zoom-in" />
              )}
            </div>
            <button 
              type="button"
              onClick={handleApplyPromo}
              className="bg-[#00796B] text-white px-3 sm:px-5 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase hover:bg-[#004D40] transition-all active:scale-95 shadow-md shadow-teal-900/10 shrink-0"
            >
              Pakai
            </button>
          </div>
          <p className={`mt-1.5 ml-1 text-[8px] sm:text-[9px] font-medium leading-tight ${isShake ? "text-rose-500" : isPromoApplied ? "text-emerald-600" : "text-slate-400"}`}>
            {isShake 
              ? "❌ Kode promo tidak valid!" 
              : isPromoApplied 
                ? "✅ Mantap! Diskon terpasang." 
                : "*Kosongkan jika tidak ada."}
          </p>
        </div>
      </section>

    </div> 
  );
}