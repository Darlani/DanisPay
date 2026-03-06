"use client";

import { useRef, useState } from "react";
import { isPaymentAllowed } from '@/utils/LogicPembayaran';
import { Zap, Smartphone, Info, ChevronRight, CheckCircle2, ShoppingCart, ShieldCheck, CircleDollarSign } from "lucide-react";

export default function InterfaceEMoney(props: any) {
  const {
    product, selectedItemId, setSelectedItemId, selectedPayment, setSelectedPayment,
    accId, setAccId, waNumber, setWaNumber, totalPrice, formatRupiah, handleCheckout, 
    isPromoApplied, basePrice, isMounted, userCoins, useCoins, setUseCoins, usedCoinsAmount,
    setIsModalOpen, isModalOpen, estimasiCashback, memberType
  } = props;

  const selectedItem = product.items.find((item: any) => String(item.id) === String(selectedItemId));
  const nominalHemat = (basePrice - totalPrice) - usedCoinsAmount;
  
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState("Saldo"); 

  const availableSubBrands = [...new Set(product.items.map((item: any) => item.sub_brand).filter((sb: any) => sb))];

  const isReadyToCheckout = !!selectedItemId && accId.length >= 10 && (!!selectedPayment || totalPrice === 0);

  const scrollToNext = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  const steps = [
    { id: 1, label: "Pilih Nominal Saldo", completed: !!selectedItemId },
    { id: 2, label: "Masukan Nomor HP Akun", completed: accId.length >= 10 },
    { id: 3, label: "Pilih Pembayaran", completed: !!selectedPayment },
  ];

  return (
    <div className="min-h-screen bg-[#F0F7F6] text-slate-900 font-sans tracking-tight relative">
      <div className="relative pb-10">
        <div className="h-48 w-full absolute top-0 z-0 bg-[#002C5F]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">     
          
          {/* INFO PRODUK */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-4xl shadow-xl border border-slate-100 sticky top-24">
              <img src={product.img} className="w-56 h-56 rounded-4xl object-cover shadow-2xl border-4 border-white mx-auto mb-4" alt={product.name} />
              <div className="text-center">
                <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase">E-WALLET & SALDO</span>
                <h1 className="text-xl font-black text-slate-800 uppercase mt-2">{product.name}</h1>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-50 space-y-3">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center justify-between">
                    <p className={`text-sm ${step.completed ? 'text-green-600 font-bold' : 'text-slate-400'}`}>{step.id}. {step.label}</p>
                    {step.completed && <CheckCircle2 size={16} className="text-green-500" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FORM SELECTION */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-[2.5rem] shadow-sm border border-[#B2DFDB]/40 overflow-hidden">
              <div className="p-8 border-b border-[#E0F2F1] bg-[#F5FBFA] flex items-center gap-5">
                <div className="bg-[#00796B] text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl">1</div>
                <h2 className="font-black text-2xl">Pilih Nominal Saldo</h2>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {product.items.map((opt: any) => (
                    <button key={opt.id} onClick={() => { setSelectedItemId(opt.id); scrollToNext(step2Ref); }} 
                      className={`p-4 rounded-3xl border-2 text-left transition-all ${selectedItemId === opt.id ? 'border-[#00796B] bg-[#E0F2F1]/60' : 'border-[#E0F2F1] bg-white'}`}>
                      <h3 className="font-black text-sm text-slate-800 mb-1">{opt.label}</h3>
                      <p className="font-black text-[#00796B]">{formatRupiah(opt.price)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section ref={step2Ref} className="bg-white rounded-[2.5rem] shadow-sm border border-[#B2DFDB]/40 overflow-hidden">
              <div className="p-8 border-b border-[#E0F2F1] bg-[#F5FBFA] flex items-center gap-5">
                <div className="bg-[#00796B] text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl">2</div>
                <h2 className="font-black text-2xl">Nomor HP Akun</h2>
              </div>
              <div className="p-8">
                <input type="text" value={accId} onChange={(e) => { setAccId(e.target.value); if(e.target.value.length >= 12) scrollToNext(step3Ref); }} 
                  placeholder="Masukkan Nomor HP Akun (DANA/OVO/Maxim)" className="w-full bg-[#F5FBFA] border-2 border-[#E0F2F1] focus:border-[#00796B] p-5 rounded-2xl outline-none font-bold text-lg" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}