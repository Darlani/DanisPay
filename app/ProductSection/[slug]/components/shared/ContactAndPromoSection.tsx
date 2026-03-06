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
      <div className="bg-white p-6 rounded-4xl border border-[#B2DFDB]/40 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#00695C] to-[#004D40] text-white flex items-center justify-center font-black text-xs shadow-md shadow-teal-900/10">
            4
          </div>
          <p className="text-[11px] font-black text-slate-500 tracking-wider lowercase first-letter:uppercase">Masukkan info kontak (Opsional)</p>
        </div>
        <input 
          type="text" 
          value={waNumber} 
          onChange={(e) => setWaNumber(e.target.value)} 
          placeholder="Nomor WhatsApp (08xxxx)" 
          className="w-full bg-[#F5FBFA] border border-[#E0F2F1] focus:border-[#00796B] p-4 rounded-xl outline-none font-bold text-sm text-slate-700 transition-all placeholder:text-slate-300" 
        />
        <p className="mt-2 ml-1 text-[10px] font-medium text-slate-400">
          *Nomor ini digunakan untuk mengirim status pesanan.
        </p>
      </div>

      <div className="bg-white p-6 rounded-4xl border border-[#B2DFDB]/40 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#00695C] to-[#004D40] text-white flex items-center justify-center font-black text-xs shadow-md shadow-teal-900/10">
            5
          </div>
          <p className="text-[11px] font-black text-slate-500 tracking-wider lowercase first-letter:uppercase">Masukkan kode promo (Opsional)</p>
        </div>
        
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
              className={`w-full p-4 rounded-xl outline-none font-black text-sm text-slate-700 uppercase tracking-widest transition-all ${
                isShake 
                  ? "animate-shake border border-rose-500 bg-rose-50" 
                  : isPromoApplied 
                    ? "border border-emerald-500 bg-emerald-50" 
                    : "bg-[#F5FBFA] border border-[#E0F2F1] focus:border-[#00796B]"
              }`} 
            />
            {isPromoApplied && (
              <CheckCircle2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 animate-in zoom-in" />
            )}
          </div>
          
          <button 
            type="button"
            onClick={handleApplyPromo}
            className="bg-[#3bb5a7] text-white px-5 rounded-xl font-black text-[10px] uppercase hover:bg-[#079f86] transition-all active:scale-95 shadow-lg shadow-teal-900/10 shrink-0"
          >
            Gunakan
          </button>
        </div>
        
        <p className={`mt-2 ml-1 text-[10px] font-medium ${isShake ? "text-rose-500" : "text-slate-400"}`}>
          {isShake 
            ? "❌ Kode promo tidak valid, coba lagi!" 
            : isPromoApplied 
              ? "✅ Promo Berhasil: Diskon diterapkan!" 
              : "*Dapatkan potongan harga dengan kode promo."}
        </p>
      </div>
    </div> 
  );
}