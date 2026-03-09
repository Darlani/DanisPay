"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { 
  Info, ChevronRight, CheckCircle2, ShoppingCart,
  ShieldCheck, CircleDollarSign, Zap, Loader2
} from "lucide-react";

// IMPORT KOMPONEN SHARED
import OrderConfirmationModal from "./shared/OrderConfirmationModal";
import StickyBottomBar from "./shared/StickyBottomBar";
import PaymentSection from "./shared/PaymentSection";
import ContactAndPromoSection from "./shared/ContactAndPromoSection";

interface InterfaceGameProps {
  product: any;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  selectedPayment: string | null;
  setSelectedPayment: (method: string | null) => void;
  accId: string;
  setAccId: (val: string) => void;
  zoneId: string;
  setZoneId: (val: string) => void;
  waNumber: string;
  setWaNumber: (val: string) => void;
  promoCode: string;
  setPromoCode: (val: string) => void;
  showAllPayment: boolean;
  setShowAllPayment: (val: boolean) => void;
  showAllItems: boolean;
  setShowAllItems: (val: boolean) => void;
  isModalOpen: boolean;
  setIsModalOpen: (val: boolean) => void;
  totalPrice: number;
  formatRupiah: (num: number) => string;
  handleCheckout: () => void;
  isPromoApplied: boolean;
  setIsPromoApplied: (val: boolean) => void;
  checkPromo: (inputCode: string) => Promise<{ success: boolean; amount?: number }>;
  basePrice: number;
  currentUser: any;
  memberType: string | null;
  estimasiCashback: number;
  isMounted: boolean;
  userCoins: number;
  useCoins: boolean;
  setUseCoins: (val: boolean) => void;
  usedCoinsAmount: number;
  isMaintenanceDigiflazz: boolean;
  isAdmin: boolean;
  dbPayments: any[];
}

export default function InterfaceGame(props: InterfaceGameProps) {
  const {
    product, selectedItemId, setSelectedItemId, selectedPayment, setSelectedPayment,
    accId, setAccId, zoneId, setZoneId, waNumber, setWaNumber, promoCode, setPromoCode,
    showAllPayment, setShowAllPayment, showAllItems, setShowAllItems,
    isModalOpen, setIsModalOpen, totalPrice, formatRupiah, handleCheckout,
    isPromoApplied, setIsPromoApplied, checkPromo, basePrice, currentUser, memberType,
    estimasiCashback, isMounted, userCoins, useCoins, setUseCoins,
    usedCoinsAmount, isMaintenanceDigiflazz, isAdmin, dbPayments
  } = props;

const [isProcessing, setIsProcessing] = useState(false); 
  const [activeTab, setActiveTab] = useState("");

  // Tambahkan state untuk Cek ID Game [cite: 2026-03-06]
  const [isChecking, setIsChecking] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleInquiryGame = async () => {
    if (!accId || accId.length < 3) { setErrorMsg("ID terlalu pendek!"); return; }
    setIsChecking(true);
    setErrorMsg("");
    setCustomerName("");

    try {
      const res = await fetch('/api/digiflazz/prabayar/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customer_id: zoneId ? `${accId}${zoneId}` : accId, 
          sku: product.items?.[0]?.sku || 'game' 
        })
      });
      const result = await res.json();
      if (res.ok && result.data?.customer_name) {
        setCustomerName(result.data.customer_name);
        scrollToNext(step3Ref);
      } else {
        setErrorMsg("ID tidak ditemukan atau sedang gangguan.");
      }
    } catch (err) {
      setErrorMsg("Gagal verifikasi ID.");
    } finally {
      setIsChecking(false);
    }
  };

  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);

  const selectedItem = product.items.find((item: any) => String(item.id) === String(selectedItemId));
  const nominalHemat = (basePrice - totalPrice) - usedCoinsAmount;

  const availableSubBrands = useMemo(() => {
    if (!product?.items) return [];
    const brands = [...new Set(product.items.map((item: any) => item.sub_brand).filter(Boolean))];
    return (brands as string[]).sort((a, b) => {
      if (a.toLowerCase().includes("diamond")) return -1;
      if (b.toLowerCase().includes("diamond")) return 1;
      return 0;
    });
  }, [product?.items]);

  useEffect(() => {
    if (availableSubBrands.length > 0 && activeTab === "") {
      setActiveTab(availableSubBrands[0]);
    }
  }, [availableSubBrands, activeTab]);

  const filteredItems = useMemo(() => {
    if (!product?.items) return [];
    if (availableSubBrands.length === 0) return product.items; 

    return product.items.filter((item: any) => {
      const matchTab = String(item.sub_brand).toLowerCase() === String(activeTab).toLowerCase();
      const providerName = String(item.provider || "").toUpperCase();
      
      if (isMaintenanceDigiflazz && !isAdmin) {
        return matchTab && providerName !== 'DIGIFLAZZ';
      }
      return matchTab;
    });
  }, [product?.items, activeTab, availableSubBrands, isMaintenanceDigiflazz, isAdmin]);

  const isMLBB = product.name.toLowerCase().includes('legends');
  
  const isReadyToCheckout = !!selectedItemId && 
                            accId.length >= 3 && 
                            (!!selectedPayment || totalPrice === 0) && 
                            (!isMLBB || zoneId.length >= 3);

  const scrollToNext = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

  const getDynamicLabel = () => {
    const name = product.name.toLowerCase();
    if (name.includes('legends')) return "User ID"; 
    if (name.includes('honor of kings')) return "Player ID";
    if (name.includes('league of legends')) return "Riot ID";
    if (name.includes('free fire')) return "Player ID"; 
    if (name.includes('pubg')) return "ID Karakter";
    if (name.includes('call of duty')) return "Player ID";
    if (name.includes('fortnite')) return "Epic Games ID";
    if (name.includes('valorant')) return "Riot ID";
    if (name.includes('point blank')) return "ID Akun";
    if (name.includes('genshin')) return "UID";
    if (name.includes('honkai')) return "UID";
    if (name.includes('fate/grand order')) return "User ID";
    if (name.includes('monopoly')) return "User ID";
    if (name.includes('coin master')) return "Player ID";
    if (name.includes('candy crush')) return "Player ID";
    if (name.includes('royal match')) return "Player ID";
    if (name.includes('whiteout survival')) return "Player ID";
    if (name.includes('pokemon go')) return "Trainer Code";
    if (name.includes('brawl stars')) return "Player Tag";
    if (name.includes('minecraft')) return "Username / Email";

    return "User ID"; 
  };

  const onConfirmCheckout = () => {
    setIsProcessing(true);
    handleCheckout();
  };

  const steps = [
    { id: 1, label: "Pilih Nominal yang kamu inginkan", completed: !!selectedItemId },
    { id: 2, label: "Masukan Detail Akun yang kamu gunakan", completed: isMLBB ? accId.length >= 3 && zoneId.length >= 3 : accId.length >= 3 },
    { id: 3, label: "Pilih Metode Pembayaran", completed: !!selectedPayment },
    { id: 4, label: "Masukan no WhatsApp kamu", completed: waNumber.length > 12 },
    { id: 5, label: "Masukan Kode Promo yang kamu punya", completed: isPromoApplied },
  ];

  if (!product) return null;

  return (
    <div className="min-h-screen bg-[#bcefe5] text-slate-900 font-sans tracking-tight relative">
      <div className="relative pb-10">
        
        <div 
          className="h-48 w-full absolute top-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/background/header-bg.png')", backgroundColor: '#002C5F' }} 
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">    
          
          {/* KOLOM KIRI (INFO PRODUK) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-900/10 border border-slate-100 sticky top-24">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left gap-4 mb-10">
                <div className="relative w-full lg:w-fit flex justify-center">
                  <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full lg:block hidden" />
                  <img 
                    src={product.img} 
                    className="relative w-full aspect-square sm:w-70 sm:h-70 lg:w-70 lg:h-70 rounded-3xl sm:rounded-4xl object-cover shadow-2xl border-4 border-white transition-all duration-500"
                    alt={product.name} 
                  />
                </div>
                <div className="flex flex-col items-center lg:items-start gap-2 min-w-0">
                  <div className="flex justify-center lg:justify-start">
                    <span className="bg-[#4ADE80] text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">TOP UP</span>
                  </div>
                  <h1 className="text-lg font-black leading-tight text-slate-800 tracking-tight uppercase wrap-break-word italic">{product.name}</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">Proses Instan & Terverifikasi Aman</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-8">
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-full border border-slate-100">
                  <div className="bg-slate-200 p-1 rounded-full text-slate-600 shrink-0"><ShieldCheck size={14} /></div>
                  <span className="text-[10px] font-bold text-slate-600 leading-tight italic">Official Supply</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-full border border-slate-100">
                  <div className="bg-slate-200 p-1 rounded-full text-slate-600 shrink-0"><CircleDollarSign size={14} /></div>
                  <span className="text-[10px] font-bold text-slate-600 leading-tight italic">Money Back</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg text-slate-800 border-b border-slate-50 pb-2 italic text-center lg:text-left">Panduan Top Up</h3>
                <ul className="space-y-3">
                  {steps.map((step) => (
                    <li key={step.id} className="flex items-start gap-3">
                      <span className={`text-sm font-medium mt-0.5 ${step.completed ? 'text-green-500 font-bold' : 'text-slate-400'}`}>{step.id}.</span>
                      <div className="w-full">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm leading-snug transition-all ${step.completed ? 'text-green-600 font-bold' : 'text-slate-500 font-medium'}`}>{step.label}</p>
                          {step.completed && <CheckCircle2 size={16} className="text-green-500 shrink-0 animate-in zoom-in" />}
                        </div>
                      </div>
                    </li>
                  ))}
                  
                  {isReadyToCheckout && (
                    <li className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl animate-in fade-in shadow-sm list-none shadow-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                          <ShoppingCart size={18} className="animate-bounce" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-blue-700 uppercase leading-none mb-1">Siap Transaksi!</p>
                          <p className="text-[11px] font-bold text-blue-600 italic leading-none">Silakan klik Beli Sekarang.</p>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-blue-400 animate-pulse" />
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN (FORM) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* STEP 1: PILIH NOMINAL */}
{/* Mengikuti lengkungan kolom kiri: rounded-2xl untuk mobile, rounded-3xl untuk desktop */}
<section className="bg-white rounded-2xl sm:rounded-3xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-[#B2DFDB]/40 overflow-hidden relative">
{/* Header Step 1 Ribbon Design persis seperti gambar [cite: 2026-03-09] */}
              <div className="flex items-stretch border-b border-[#E0F2F1] bg-[#F5FBFA]">
                <div className="bg-[#00695C] w-12 sm:w-16 flex items-center justify-center text-white font-black text-xl sm:text-2xl shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.1)] z-10">
                  1
                </div>
                <div className="py-3 px-4 sm:py-5 sm:px-6 flex flex-col justify-center">
                  <h2 className="font-black text-[16px] sm:text-xl tracking-tight text-slate-800 leading-none">Pilih Nominal</h2>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 tracking-wider mt-1 lowercase first-letter:uppercase">Item tersedia untuk top-up instan</p>
                </div>
              </div>
              
              <div className="p-2 sm:p-8 space-y-6">
                {availableSubBrands.length > 1 && (
                  /* pb-2 untuk merapatkan jarak ke grid nominal di bawahnya [cite: 2026-03-09] */
                  <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-4 hide-scrollbar select-none scroll-smooth">
                    {availableSubBrands.map((tab: string) => (
                      <button
                        key={tab}
                        onClick={() => { 
                          setActiveTab(tab); 
                          setShowAllItems(false); 
                        }}
                        /* h-7, font 9px, border tipis, dan rounded-xl khusus untuk mobile [cite: 2026-03-06, 2026-03-09] */
                        className={`px-2.5 sm:px-4 h-7 sm:h-10 flex items-center justify-center rounded-xl sm:rounded-2xl text-[9px] sm:text-[12px] font-black capitalize tracking-tight sm:tracking-normal transition-all border sm:border-2 shrink-0 whitespace-nowrap cursor-pointer ${
                          activeTab === tab 
                            ? "bg-[#64d1c4] border-[#63cdc1] text-white shadow-md sm:shadow-lg shadow-teal-900/20" 
                            : "bg-white border-[#E0F2F1] text-slate-400 hover:border-[#80CBC4]"
                        }`}
                      >
                        {tab.replace(/-/g, ' ')}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-1 sm:gap-4 px-0">
                  {filteredItems.map((opt: any, index: number) => {
                    const isEnabled = opt.is_active ?? true;
                    const promoLabel = opt.promo_label;
                    const discountPersen = opt.discount || 0; 
                    
                    const hargaAsli = opt.price;
                    const nominalPotongan = Math.floor(hargaAsli * (discountPersen / 100));
                    const hargaSetelahDiskon = hargaAsli - nominalPotongan;
                    const itemCashback = opt.cashback || opt.estimasi_cashback || 0;

                    if (!showAllItems && index >= 8) return null;

                    let cleanLabel = opt.label
                      .replace(new RegExp(product.name, 'gi'), '')
                      .replace(new RegExp(activeTab, 'gi'), '')    
                      .replace(/MOBILE\s*LEGENDS?/gi, '')          
                      .replace(/FREE\s*FIRE/gi, '')
                      .replace(/^[-_\s]+|[-_\s]+$/g, '')           
                      .trim();

                    if (!cleanLabel) cleanLabel = opt.label;       

                    return (
                      <button 
                        key={opt.id} 
                        disabled={!isEnabled} 
                        onClick={() => { setSelectedItemId(opt.id); scrollToNext(step2Ref); }} 
                        className="relative group h-auto sm:min-h-55 w-full text-left animate-in fade-in zoom-in cursor-pointer"
                      >
                    {discountPersen > 0 && (
                          <div className="absolute -top-2 -left-1 sm:-top-4 sm:-left-2 z-20 animate-bounce duration-1000">
                             <div className="bg-[#FFC107] text-[#D32F2F] px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg border-2 border-white shadow-md sm:shadow-lg relative top-0 active:top-0.5 transition-all">
                                <div className="absolute inset-0 border-b-2 sm:border-b-4 border-[#FF8F00] rounded-md sm:rounded-lg pointer-events-none"></div>
                                <div className="relative z-10 flex flex-col items-center leading-none pb-0.5 sm:pb-1">
                                   <span className="font-black text-xs sm:text-lg">{discountPersen}%</span>
                                   <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-tighter">OFF</span>
                                </div>
                             </div>
                             <div className="absolute -bottom-1.5 sm:-bottom-2 left-1/2 -translate-x-1/2 w-5 sm:w-8 h-1 bg-black/20 blur-sm rounded-full"></div>
                          </div>
                        )}

                        {/* Rounded kartu nominal diturunkan ke 2xl agar sudutnya lebih tegas tapi tetap halus */}
<div className={`relative w-full h-full rounded-2xl overflow-hidden border-2 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-xl ${
                          !isEnabled 
                            ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 grayscale' 
                            : selectedItemId === opt.id 
                              ? 'border-[#00796B] bg-[#E0F2F1]/60 ring-4 ring-[#00796B]/10 transform scale-[1.02] shadow-teal-900/10' 
                              : 'border-[#E0F2F1] bg-white hover:border-[#80CBC4] hover:shadow-teal-100'
                        }`}>

<div className={`relative h-7 sm:h-10 w-full flex items-center justify-center px-3 overflow-hidden transition-colors ${
    selectedItemId === opt.id ? 'bg-[#B2DFDB]' : 'bg-[#dddfde]'
}`}>
                               <span className="text-slate-400/50 font-black text-[8px] sm:text-[10px] uppercase tracking-wider absolute z-0 text-center leading-tight">
                                  {product.name}
                               </span>
                               {isEnabled && promoLabel && (
                                 <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FFC107] text-slate-900 px-3 py-0.5 rounded-full shadow-sm border border-white/50 transform rotate-3 z-10">
                                   <span className="font-black text-[8px] uppercase italic tracking-wider">{promoLabel}</span>
                                 </div>
                               )}
                            </div>

                        {/* pt-4 untuk menurunkan teks dari header, pb-6 untuk menjaga jarak dengan badge instan [cite: 2026-03-09] */}
                        <div className="px-1 sm:px-3 pt-4 pb-6 sm:py-2 flex flex-col items-center justify-start sm:justify-center text-center flex-1 relative overflow-hidden">
                               <h3 className={`font-black text-[8px] sm:text-[14px] leading-tight tracking-tight wrap-break-words w-full transition-colors ${
                                   selectedItemId === opt.id ? 'text-[#004D40]' : 'text-slate-800'
                               }`}>
                                 {cleanLabel}
                               </h3>
                               
                               {/* Badge INSTAN dengan pembungkus putih di pojok kanan bawah [cite: 2026-03-09] */}
                               <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-slate-100 shadow-sm flex items-center gap-1 scale-95 sm:scale-110 origin-bottom-right">
                                 <Zap size={10} className="text-[#00796B] fill-[#00796B]" />
                                 <div className="flex flex-col items-start leading-[0.7]">
                                   <span className="text-[#00796B] text-[5px] font-bold uppercase tracking-tighter">Proses</span>
                                   <span className="text-[#00796B] text-[7px] font-black italic uppercase tracking-tighter">Instan</span>
                                 </div>
                               </div>
                            </div>

                    <div className={`px-1.5 sm:px-3 py-1.5 sm:py-3 border-t flex flex-col gap-1 sm:gap-2 transition-colors ${
                                selectedItemId === opt.id ? 'bg-[#cbf0ea] border-[#00796B]/20' : 'bg-[#cbf0ea] border-[#E0F2F1]'
                            }`}>
                                <div className="flex flex-col w-full">
                                   <div className="flex justify-between items-center mb-0.5">
                                      <span className="text-slate-400 font-bold text-[7px] sm:text-[10px]">Harga</span>
                                      {discountPersen > 0 && (
                                         <span className="text-[#D32F2F] font-bold text-[7px] sm:text-[10px] line-through decoration-[#D32F2F]/60">
                                            {formatRupiah(hargaAsli)}
                                         </span>
                                      )}
                                   </div>
                                   <span className={`font-black text-[8px] sm:text-[14px] leading-none tracking-tight text-left transition-colors ${
                                       selectedItemId === opt.id ? 'text-[#00796B]' : 'text-[#00695C]'
                                   }`}>
                                      {formatRupiah(hargaSetelahDiskon)}
                                   </span>
                                </div>

                                {/* Container Kapsul: py-1 px-1.5 gap-1 (mobile), normal di desktop */}
                                <div className="bg-[#B2DFDB]/60 rounded-xl py-1 px-1.5 sm:py-1.5 sm:px-2 flex items-center justify-center gap-1 sm:gap-2 w-full border border-[#00796B]/10 shadow-sm">
                                   
                                   {/* Kontainer Ikon Zap: w-3 h-3 (mobile), w-4 h-4 (desktop) */}
                                   <div className="bg-[#FFC107] w-3 h-3 sm:w-4 sm:h-4 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                      <Zap className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] text-slate-900 fill-current" />
                                   </div>
                                   
                                   {/* Kontainer Teks: gap-0.5 (mobile), gap-1 (desktop) */}
                                   <div className="flex items-center gap-0.5 sm:gap-1 leading-none overflow-hidden">
                                      
                                      {/* Teks Nilai: text-[8px] (mobile), text-[10px] (desktop) */}
                                      <span className="text-[#025f54] font-bold text-[8px] sm:text-[10px] truncate" suppressHydrationWarning>
                                        {isMounted ? `+${itemCashback.toLocaleString('id-ID')}` : ""} 
                                      </span>
                                      
                                      {/* Teks Logo DaPay: text-[8px] (mobile), text-[10px] (desktop) */}
                                      <span className="font-black text-[8px] sm:text-[10px] italic shrink-0">
                                        <span className="text-[#F57F17]">Da</span><span className="text-blue-600">Pay</span>
                                      </span>
                                   </div>
                                </div>
                            </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {filteredItems.length === 0 && (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-[#F5FBFA] rounded-[2.5rem] border-2 border-dashed border-[#B2DFDB] animate-in fade-in zoom-in duration-500 mb-6">
                    <div className="bg-[#E0F2F1] p-5 rounded-full mb-4 shadow-sm">
                      <Info className="text-[#00796B]" size={40} />
                    </div>
                    <h3 className="text-[#004D40] font-black text-lg uppercase italic leading-none">Layanan Sedang Dioptimasi</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-62.5 leading-relaxed text-center">
                      Stok otomatis untuk kategori ini sedang diperbarui. Silakan pilih layanan lain atau kembali nanti.
                    </p>
                  </div>
                )}

                {!showAllItems && filteredItems.length > 8 && (
<button 
  onClick={() => setShowAllItems(true)}
  className="w-full py-3 sm:py-4 bg-[#F5FBFA] hover:bg-[#004D40] border-2 border-dashed border-[#B2DFDB] hover:border-[#004D40] rounded-3xl transition-all duration-300 group shadow-sm !mt-1 sm:!mt-4 cursor-pointer"
>
                    <div className="flex items-center justify-center">
                      <span className="font-black text-[11px] capitalize tracking-normal text-[#00796B] group-hover:text-white transition-colors">
                        Lihat {filteredItems.length - 8} nominal lainnya
                      </span>
                      <ChevronRight size={16} className="text-[#4DB6AC] group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                )}
              </div>
            </section>

            {/* STEP 2: DETAIL AKUN */}
            <section ref={step2Ref} className="bg-white rounded-2xl sm:rounded-3xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-[#B2DFDB]/40 overflow-hidden relative">
{/* Header Step 2 Ribbon Design persis seperti gambar [cite: 2026-03-09] */}
              <div className="flex items-stretch border-b border-[#E0F2F1] bg-[#F5FBFA]">
                <div className="bg-[#00695C] w-12 sm:w-16 flex items-center justify-center text-white font-black text-xl sm:text-2xl shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.1)] z-10">
                  2
                </div>
                <div className="py-3 px-4 sm:py-5 sm:px-6 flex flex-1 items-center justify-between">
                  <div className="flex flex-col justify-center">
                    <h2 className="font-black text-[16px] sm:text-xl tracking-tight text-slate-800 leading-none">Masukan Detail Akun</h2>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 tracking-wider mt-1 lowercase first-letter:uppercase">Pastikan data yang anda masukkan benar</p>
                  </div>
                  {/* Tombol panduan */}
                  <button className="hidden sm:flex items-center gap-1.5 bg-[#E0F2F1] text-[#00695C] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#B2DFDB] transition-all border border-[#B2DFDB]">
                    <Info size={12} /> Panduan
                  </button>
                </div>
              </div>

<div className="p-4 sm:p-8">
  {/* Gap diubah jadi 1 untuk HP agar rapat, dan 6 untuk desktop */}
  <div className="flex flex-col md:flex-row gap-0 md:gap-6">
                  
<div className="flex-1 space-y-3">
<label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2 justify-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00796B]" />
                      <span>{getDynamicLabel()}</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={accId} 
                        onChange={(e) => { setAccId(e.target.value); setCustomerName(""); }} 
                        placeholder={`Masukkan ${getDynamicLabel()}`} 
                        className={`w-full bg-[#F5FBFA] border-2 border-[#E0F2F1] focus:border-[#00796B] focus:bg-white p-3.5 sm:p-4 rounded-xl outline-none text-sm sm:text-base font-bold text-slate-700 transition-all placeholder:text-slate-300 ${!isMLBB ? 'pr-16 sm:pr-24' : ''}`} 
                      />
                      {!isMLBB && (
                        <button 
                          onClick={handleInquiryGame}
                          disabled={isChecking}
                          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-[#00796B] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase hover:bg-[#004D40] transition-all"
                        >
                          {isChecking ? <Loader2 size={16} className="animate-spin" /> : "CEK"}
                        </button>
                      )}
                    </div>
                    {customerName && (
                      <p className="text-[10px] font-black text-emerald-600 bg-emerald-50 p-2 rounded-lg animate-in zoom-in uppercase">
                        ✅ Nama: {customerName}
                      </p>
                    )}
                    {errorMsg && <p className="text-[10px] font-black text-rose-500 italic">{errorMsg}</p>}
                  </div>

                  {isMLBB && (
                    <div className="w-full md:w-1/3 space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2 justify-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00796B]" /> 
                        <span>Zone ID</span>
                      </label>
                      <div className="relative">
                        <input 
                            type="text" 
                            value={zoneId}
                            onChange={(e) => {
                              setZoneId(e.target.value);
                              if(e.target.value.length >= 4) scrollToNext(step3Ref);
                            }}
                            placeholder="1234" 
                            className="w-full bg-[#F5FBFA] border-2 border-[#E0F2F1] focus:border-[#00796B] focus:bg-white p-3.5 sm:p-4 pr-16 sm:pr-24 rounded-xl outline-none text-sm sm:text-base font-bold text-slate-700 transition-all placeholder:text-slate-300" 
                        />
                        <button 
                          onClick={handleInquiryGame}
                          disabled={isChecking}
                          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-[#00796B] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase hover:bg-[#004D40] transition-all"
                        >
                          {isChecking ? <Loader2 size={16} className="animate-spin" /> : "CEK"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* STEP 3: METODE PEMBAYARAN */}
            <PaymentSection
              step3Ref={step3Ref}
              step4Ref={step4Ref}
              currentUser={currentUser}
              useCoins={useCoins}
              setUseCoins={setUseCoins}
              usedCoinsAmount={usedCoinsAmount}
              userCoins={userCoins}
              isMounted={isMounted}
              formatRupiah={formatRupiah}
              dbPayments={dbPayments}
              showAllPayment={showAllPayment}
              setShowAllPayment={setShowAllPayment}
              selectedPayment={selectedPayment}
              setSelectedPayment={setSelectedPayment}
              totalPrice={totalPrice}
              productName={product.name}
              scrollToNext={scrollToNext}
            />

            {/* STEP 4 & 5: KONTAK & PROMO */}
            <ContactAndPromoSection
              step4Ref={step4Ref}
              waNumber={waNumber}
              setWaNumber={setWaNumber}
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              isPromoApplied={isPromoApplied}
              setIsPromoApplied={setIsPromoApplied}
            />

          </div> 
        </div> 

        {/* STICKY BOTTOM BAR */}
        <StickyBottomBar 
          selectedItemId={selectedItemId}
          selectedItem={selectedItem}
          totalPrice={totalPrice}
          formatRupiah={formatRupiah}
          isReadyToCheckout={isReadyToCheckout}
          setIsModalOpen={setIsModalOpen}
          nominalHemat={nominalHemat}
          usedCoinsAmount={usedCoinsAmount}
          estimasiCashback={estimasiCashback}
          currentUser={currentUser}
          memberType={memberType}
          isMounted={isMounted}
        />

        {/* MODAL KONFIRMASI */}
        <OrderConfirmationModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          product={product}
          selectedItem={selectedItem}
          accId={zoneId ? `${accId} (${zoneId})` : accId}
          selectedPayment={selectedPayment}
          totalPrice={totalPrice}
          nominalHemat={nominalHemat}
          usedCoinsAmount={usedCoinsAmount}
          estimasiCashback={estimasiCashback}
          memberType={memberType}
          formatRupiah={formatRupiah}
          isProcessing={isProcessing}
          handleCheckout={onConfirmCheckout}
          dynamicLabel={getDynamicLabel()}
          isMounted={isMounted}
        />

      </div>
    </div>
  );
}