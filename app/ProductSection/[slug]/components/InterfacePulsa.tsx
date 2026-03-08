"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { PULSA_CATEGORY_SLUGS } from '@/lib/constants/product-mappings';
import { safeFetch } from '@/utils/apiHelper';
import { 
  Info, ChevronRight, CheckCircle2, ShoppingCart, 
  ShieldCheck, CircleDollarSign, Zap, Loader2,
  ShieldAlert
} from "lucide-react";

// IMPORT KOMPONEN SHARED YANG BARU DIBUAT
import OrderConfirmationModal from "./shared/OrderConfirmationModal";
import StickyBottomBar from "./shared/StickyBottomBar";
import PaymentSection from "./shared/PaymentSection";
import ContactAndPromoSection from "./shared/ContactAndPromoSection";

interface InterfacePulsaProps {
  product: any;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  selectedPayment: string | null;
  setSelectedPayment: (method: string | null) => void;
  accId: string;
  setAccId: (val: string) => void;
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

export default function InterfacePulsa(props: InterfacePulsaProps) {
  const {
    product, selectedItemId, setSelectedItemId, selectedPayment, setSelectedPayment,
    accId, setAccId, waNumber, setWaNumber, promoCode, setPromoCode,
    showAllPayment, setShowAllPayment, showAllItems, setShowAllItems,
    isModalOpen, setIsModalOpen, totalPrice, formatRupiah, handleCheckout,
    isPromoApplied, setIsPromoApplied, checkPromo, basePrice, currentUser, memberType,
    estimasiCashback, isMounted, userCoins, useCoins, setUseCoins, usedCoinsAmount, isMaintenanceDigiflazz,
    isAdmin, dbPayments
  } = props;

  const [isProcessing, setIsProcessing] = useState(false);
  
  const [activeTab, setActiveTab] = useState("");
  const [mainCategory, setMainCategory] = useState("PULSA");
  const [errorOp, setErrorOp] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isInquiring, setIsInquiring] = useState(false);

  // Deklarasi dipindah ke atas agar bisa dibaca oleh semua fungsi di bawahnya [cite: 2026-03-06]
  const isPLN = product?.name?.toLowerCase().includes('pln') || product?.category?.toLowerCase().includes('pln');

const checkPlnInquiry = async (plnId: string) => {
    setIsInquiring(true);
    setErrorOp("");
    setCustomerName("");

    // Pakai safeFetch biar aman dari error JSON/HTML
    const result = await safeFetch('/api/prabayar/inquiry', { // <--- UBAH JADI PRABAYAR BOS!
      method: 'POST',
      body: JSON.stringify({ customer_id: plnId, sku: 'pln', category: 'pln' })
    });

    if (result.success) {
      setCustomerName(result.data.data?.customerName || result.data.customerName);
      scrollToNext(step3Ref);
    } else {
      setErrorOp(result.message || "ID PLN tidak ditemukan");
    }
    
    setIsInquiring(false);
  };

  const OPERATOR_PREFIX = {
    TRI: ["0895", "0896", "0897", "0898", "0899"],
    TELKOMSEL: ["0811", "0812", "0813", "0821", "0822", "0823", "0851", "0852", "0853"],
    BYU: ["0851"],
    INDOSAT: ["0814", "0815", "0816", "0855", "0856", "0857", "0858"],
    XL: ["0817", "0818", "0819", "0859", "0877", "0878"],
    AXIS: ["0831", "0832", "0833", "0838"],
    SMARTFREN: ["0881", "0882", "0883", "0884", "0885", "0886", "0887", "0888", "0889"]
  };

  const OPERATOR_LOGOS: Record<string, string> = {
    TRI: "/logos/tri.jpg",
    TELKOMSEL: "/logos/telkomsel-1.jpg",
    BYU: "/logos/byu.jpg",
    INDOSAT: "/logos/indosat-1.jpg",
    XL: "/logos/xl.jpg",
    AXIS: "/logos/axis.jpg",
    SMARTFREN: "/logos/smartfren.jpg"
  };

  const availableSubBrands = useMemo(() => {
    if (!product?.items) return [];
    const brands = [...new Set(product.items.map((item: any) => item.sub_brand).filter(Boolean))];
    return (brands as string[]).sort((a, b) => {
      if (a.toLowerCase() === "umum" || a.toLowerCase() === "pulsa-reguler") return -1;
      if (b.toLowerCase() === "umum" || b.toLowerCase() === "pulsa-reguler") return 1;
      return 0;
    });
  }, [product?.items]);

  const menuData = useMemo(() => {
    return {
      PULSA: availableSubBrands.filter((tab: string) => PULSA_CATEGORY_SLUGS.includes(tab.toLowerCase())),
      DATA: availableSubBrands.filter((tab: string) => !PULSA_CATEGORY_SLUGS.includes(tab.toLowerCase()))
    };
  }, [availableSubBrands]);

  useEffect(() => {
    const categories = menuData[mainCategory as keyof typeof menuData];
    if (categories && categories.length > 0) {
      setActiveTab(categories[0]);
    } else {
      setActiveTab("");
    }
  }, [mainCategory, menuData]);

  const detectedOperator = useMemo(() => {
    if (isPLN || accId.length < 4) return null;
    const prefix = accId.slice(0, 4);
    for (const [op, prefixes] of Object.entries(OPERATOR_PREFIX)) {
      if (prefixes.includes(prefix)) return op;
    }
    return null;
  }, [accId, isPLN]);

  const filteredItems = useMemo(() => {
    if (!product?.items) return [];
    const filtered = product.items.filter((item: any) => {
      const matchTab = String(item.sub_brand).toLowerCase() === String(activeTab).toLowerCase();
      if (isMaintenanceDigiflazz && !isAdmin) {
        return matchTab && String(item.provider).toUpperCase() !== 'DIGIFLAZZ';
      }
      return matchTab;
    });

    return filtered.sort((a: any, b: any) => {
      if (mainCategory === 'DATA') {
        const nameA = String(a.name || a.label || "").toLowerCase();
        const nameB = String(b.name || b.label || "").toLowerCase();

        // 1. Ekstrak Hari
        const getDays = (name: string) => {
          const match = name.match(/(\d+)\s*hari/i);
          return match ? parseInt(match[1], 10) : 999;
        };

        // 2. Ekstrak & Normalisasi Kuota (ke MB)
        const getDataValue = (name: string) => {
          const gbMatch = name.match(/(\d+(?:\.\d+)?)\s*gb/i);
          if (gbMatch) return parseFloat(gbMatch[1]) * 1024;
          const mbMatch = name.match(/(\d+(?:\.\d+)?)\s*mb/i);
          if (mbMatch) return parseFloat(mbMatch[1]);
          return 0;
        };

        const daysA = getDays(nameA);
        const daysB = getDays(nameB);

        // Sort Pertama: Berdasarkan Hari
        if (daysA !== daysB) return daysA - daysB;

        // Sort Kedua: Berdasarkan Jumlah Kuota (MB/GB)
        const valA = getDataValue(nameA);
        const valB = getDataValue(nameB);
        if (valA !== valB) return valA - valB;
      }
      
      // Fallback: Berdasarkan Harga
      return a.price - b.price;
    });
  }, [product?.items, activeTab, mainCategory, isMaintenanceDigiflazz, isAdmin]);

  const selectedItem = product?.items?.find((item: any) => String(item.id) === String(selectedItemId));
  const nominalHemat = (basePrice - totalPrice) - usedCoinsAmount;

  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);

  const isReadyToCheckout = !!selectedItemId && 
                            (isPLN ? !!customerName : accId.length >= 10) && 
                            (!!selectedPayment || totalPrice === 0);

  const scrollToNext = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

  const getDynamicLabel = () => {
    if (isPLN) return "ID Pelanggan / No. Meter PLN";
    const category = product?.category?.toLowerCase() || "";
    if (category.includes('pulsa') || category.includes('data')) return "Nomor Handphone (08xxx)";
    return "Nomor Tujuan / ID Pelanggan"; 
  };

  const onConfirmCheckout = () => {
    setIsProcessing(true);
    handleCheckout();
  };

  const steps = [
    { id: 1, label: "Pilih Nominal Pulsa/Data", completed: !!selectedItemId },
    { id: 2, label: `Masukan ${isPLN ? "ID PLN" : "Nomor Tujuan"}`, completed: isPLN ? accId.length >= 11 : accId.length >= 10 },
    { id: 3, label: "Pilih Metode Pembayaran", completed: !!selectedPayment },
    { id: 4, label: "Masukan Kontak WA", completed: waNumber.length >= 10 },
    { id: 5, label: "Gunakan Kode Promo", completed: isPromoApplied },
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
          
          {/* KOLOM KIRI (INFO PRODUK & PANDUAN) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-4 sm:p-8 rounded-3xl sm:rounded-4xl shadow-xl shadow-blue-900/10 border border-slate-100 sticky top-24">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left gap-4 mb-10">
                <div className="relative w-full lg:w-fit flex justify-center">
                  <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full lg:block hidden" />
                  <img 
                    src={product.img} 
                    className="relative w-full aspect-square sm:w-70 sm:h-70 rounded-3xl sm:rounded-4xl object-cover shadow-2xl border-4 border-white transition-all duration-500" 
                    alt={product.name} 
                  />
                </div>
                <div className="flex flex-col items-center lg:items-start gap-2 min-w-0">
                  <div className="flex justify-center lg:justify-start">
                    <span className="bg-[#4ADE80] text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">TOP UP</span>
                  </div>
                  <h1 className="text-lg font-black leading-tight text-slate-800 tracking-tight uppercase wrap-break-word italic">{product.name}</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic text-center lg:text-left">Proses Instan & Terverifikasi Aman</p>
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
                    {steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
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

          {/* KOLOM KANAN (FORM TRANSAKSI) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* STEP 1: PILIH NOMINAL */}
            <section className="bg-white rounded-[2.5rem] shadow-sm border border-[#B2DFDB]/40 overflow-hidden relative">
              <div className="p-4 sm:p-8 border-b border-[#E0F2F1] bg-[#F5FBFA]">
                <div className="flex items-center gap-5">
                  <div className="bg-linear-to-br from-[#00695C] to-[#004D40] text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-teal-900/10 text-xl">
                    1
                  </div>
                  <div>
                    <h2 className="font-black text-2xl tracking-tight text-slate-800 leading-none">Pilih Nominal</h2>
                    <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-1.5 lowercase first-letter:uppercase">Item tersedia untuk top-up instan</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-4 sm:px-8 pb-4">
                {!isPLN && (
                  <div className="flex gap-3 pt-6">
                    {['PULSA', 'DATA'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setMainCategory(cat)}
                        className={`flex-1 py-3 rounded-2xl text-[12px] font-black capitalize tracking-normal transition-all border-2 flex items-center justify-center gap-2 ${
                          mainCategory === cat
                            ? "bg-[#02bea8] border-[#28cbb8] text-white shadow-lg shadow-teal-900/20"
                            : "bg-white border-[#E0F2F1] text-[#00796B] hover:border-[#B2DFDB]"
                        }`}
                      >
                        <span className="text-sm">{cat === 'PULSA' ? '📱' : '🌐'}</span>
                        {cat === 'PULSA' ? 'Pulsa' : 'Data internet'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={`flex gap-2 overflow-x-auto px-4 sm:px-8 pb-4 hide-scrollbar select-none scroll-smooth ${isPLN ? 'pt-6' : ''}`}>
                {isPLN 
                  ? availableSubBrands.map((tab: string) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setShowAllItems(false); }}
                      className={`px-4 h-10 flex items-center justify-center rounded-2xl text-[12px] font-black capitalize tracking-normal transition-all border-2 shrink-0 whitespace-nowrap cursor-pointer ${
                        activeTab === tab 
                          ? "bg-[#61d4c6] border-[#58ccbf] text-white shadow-lg shadow-teal-900/20" 
                          : "bg-white border-[#E0F2F1] text-slate-400 hover:border-[#B2DFDB]"
                      }`}
                    >
                      {tab.replace(/-/g, ' ')}
                    </button>
                  ))
                  : menuData[mainCategory as keyof typeof menuData]?.map((tab: string) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setShowAllItems(false); }}
                    className={`px-3 h-10 flex items-center justify-center rounded-2xl text-[12px] font-black capitalize tracking-normal transition-all border-2 shrink-0 whitespace-nowrap cursor-pointer ${
                      activeTab === tab 
                        ? "bg-[#61d4c6] border-[#58ccbf] text-white shadow-lg shadow-teal-900/20" 
                        : "bg-white border-[#E0F2F1] text-slate-400 hover:border-[#B2DFDB]"
                    }`}
                  >
                    {tab.toLowerCase() === 'umum' || tab.toLowerCase() === 'pulsa-reguler' ? 'Pulsa biasa' : tab.toLowerCase() === 'data-umum' ? 'Umum' : tab.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
              
              <div className="p-4 sm:p-8 space-y-6 pt-0">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                      .replace(/pulsa/gi, '')                      
                      .replace(/^[-_\s]+|[-_\s]+$/g, '')            
                      .trim();

                    if (!cleanLabel) cleanLabel = opt.label;

                    return (
                      <button 
                        key={opt.id} 
                        disabled={!isEnabled} 
                        onClick={() => { setSelectedItemId(opt.id); scrollToNext(step2Ref); }} 
                        className="relative group h-auto min-h-55 w-full text-left animate-in fade-in zoom-in"
                      >
                        {discountPersen > 0 && (
                          <div className="absolute -top-4 -left-2 z-20 animate-bounce duration-1000">
                             <div className="bg-[#FFC107] text-[#D32F2F] px-3 py-1 rounded-lg border-2 border-white shadow-lg relative top-0 active:top-0.5 transition-all">
                                <div className="absolute inset-0 border-b-4 border-[#FF8F00] rounded-lg pointer-events-none"></div>
                                <div className="relative z-10 flex flex-col items-center leading-none pb-1">
                                   <span className="font-black text-lg">{discountPersen}%</span>
                                   <span className="text-[7px] font-black uppercase tracking-tighter">OFF</span>
                                </div>
                             </div>
                             <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-black/20 blur-sm rounded-full"></div>
                          </div>
                        )}

                        <div className={`relative w-full h-full rounded-3xl overflow-hidden border-2 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-xl ${
                          !isEnabled 
                            ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 grayscale' 
                            : selectedItemId === opt.id 
                              ? 'border-[#00796B] bg-[#E0F2F1]/60 ring-4 ring-[#00796B]/10 transform scale-[1.02] shadow-teal-900/10' 
                              : 'border-[#E0F2F1] bg-white hover:border-[#80CBC4] hover:shadow-teal-100'
                        }`}>

                            <div className={`relative h-10 w-full flex items-center justify-center px-3 overflow-hidden transition-colors ${
                                selectedItemId === opt.id ? 'bg-[#B2DFDB]' : 'bg-[#dddfde]'
                            }`}>
                               <span className="text-slate-400/50 font-black text-[10px] uppercase tracking-wider absolute z-0 text-center leading-tight">
                                  {isPLN ? "PLN Token" : product.name}
                               </span>
                               {isEnabled && promoLabel && (
                                 <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FFC107] text-slate-900 px-3 py-0.5 rounded-full shadow-sm border border-white/50 transform rotate-3 z-10">
                                   <span className="font-black text-[8px] uppercase italic tracking-wider">{promoLabel}</span>
                                 </div>
                               )}
                            </div>

                            <div className="px-3 py-2 flex flex-col items-center justify-center text-center flex-1">
                              <h3 className={`font-black text-[15px] leading-tight tracking-tight wrap-break-words w-full transition-colors ${
                                  selectedItemId === opt.id ? 'text-[#004D40]' : 'text-slate-800'
                              }`}>
                                {cleanLabel}
                              </h3>
                              <p className="text-slate-400 text-[9px] font-bold mt-1 uppercase tracking-wide">
                                {isPLN ? "Token Otomatis" : "Top Up Instan"}
                              </p>
                            </div>

                            <div className={`px-3 py-3 border-t flex flex-col gap-2 transition-colors ${
                                selectedItemId === opt.id ? 'bg-[#cbf0ea] border-[#00796B]/20' : 'bg-[#cbf0ea] border-[#E0F2F1]'
                            }`}>
                                <div className="flex flex-col w-full">
                                   <div className="flex justify-between items-center mb-0.5">
                                      <span className="text-slate-400 font-bold text-[10px]">Harga</span>
                                      {discountPersen > 0 && (
                                         <span className="text-[#D32F2F] font-bold text-[10px] line-through decoration-[#D32F2F]/60">
                                            {formatRupiah(hargaAsli)}
                                         </span>
                                      )}
                                   </div>
                                   <span className={`font-black text-[15px] leading-none tracking-tight text-left transition-colors ${
                                       selectedItemId === opt.id ? 'text-[#00796B]' : 'text-[#00695C]'
                                   }`}>
                                      {formatRupiah(hargaSetelahDiskon)}
                                   </span>
                                </div>

                                <div className="bg-[#B2DFDB]/60 rounded-xl py-1.5 px-2 flex items-center justify-center gap-2 w-full border border-[#00796B]/10 shadow-sm">
                                   <div className="bg-[#FFC107] w-4 h-4 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                      <Zap size={10} className="text-slate-900 fill-current" />
                                   </div>
                                   <div className="flex items-center gap-1 leading-none overflow-hidden">
                                      <span className="text-[#025f54] font-bold text-[10px] truncate" suppressHydrationWarning>
                                        {isMounted ? `+${itemCashback.toLocaleString('id-ID')}` : ""} 
                                      </span>
                                      <span className="font-black text-[10px] italic shrink-0">
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
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-[#F5FBFA] rounded-[2.5rem] border-2 border-dashed border-[#B2DFDB] animate-in fade-in zoom-in duration-500 mb-6 mt-4">
                    <div className="bg-[#E0F2F1] p-5 rounded-full mb-4 shadow-sm">
                      <Info className="text-[#00796B]" size={40} />
                    </div>
                    <h3 className="text-[#004D40] font-black text-lg uppercase italic leading-none">Layanan Sedang Dioptimasi</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-62.5 leading-relaxed text-center">
                      Stok otomatis untuk kategori ini sedang diperbarui.
                    </p>
                  </div>
                )}

                {!showAllItems && filteredItems.length > 8 && (
                  <button 
                    onClick={() => setShowAllItems(true)}
                    className="w-full mt-6 py-4 bg-[#F5FBFA] hover:bg-[#004D40] border-2 border-dashed border-[#B2DFDB] hover:border-[#004D40] rounded-3xl transition-all duration-300 group shadow-sm"
                  >
                    <div className="flex items-center justify-center gap-3">
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
            <section ref={step2Ref} className="bg-white rounded-[2.5rem] shadow-sm border border-[#B2DFDB]/40 overflow-hidden relative">
              <div className="p-4 sm:p-8 border-b border-[#E0F2F1] bg-[#F5FBFA]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="bg-linear-to-br from-[#00695C] to-[#004D40] text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-teal-900/10 text-xl">
                      2
                    </div>
                    <div>
                      <h2 className="font-black text-2xl tracking-tight text-slate-800 leading-none">Masukan Detail Akun</h2>
                      <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-1.5 lowercase first-letter:uppercase">Pastikan data yang anda masukkan benar</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 bg-[#E0F2F1] text-[#00695C] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#B2DFDB] transition-all border border-[#B2DFDB]">
                    <Info size={14} /> Panduan
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-8">
                <div className="flex flex-col gap-4">
                  <div className="flex-1 space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00796B]" />
                        {getDynamicLabel()}
                      </div>
                      {!isPLN && accId.length >= 4 && (
                        <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg animate-in fade-in">
                          Deteksi: {(() => {
                            const prefix = accId.slice(0, 4);
                            for (const [op, prefixes] of Object.entries(OPERATOR_PREFIX)) {
                              if (prefixes.includes(prefix)) return op;
                            }
                            return "Operator Tidak Dikenal";
                          })()}
                        </span>
                      )}
                      {isPLN && accId.length >= 11 && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg animate-in fade-in">
                          Deteksi: Token PLN
                        </span>
                      )}
                    </label>
                    
                    <div className="relative">
                      <div className="relative flex items-center">
                        {detectedOperator && (
                          <div className="absolute left-4 z-10 animate-in fade-in zoom-in duration-300">
                            <img 
                              src={OPERATOR_LOGOS[detectedOperator]} 
                              alt={detectedOperator}
                              className="w-10 h-10 object-contain bg-white rounded-lg p-1 shadow-sm border border-slate-100"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          </div>
                        )}
                        <input 
                          type="text" 
                          value={accId} 
                          disabled={isInquiring}
                          onChange={(e) => { 
                            const val = e.target.value.replace(/\D/g, ''); 
                            setAccId(val); 

                            if (isPLN) {
                              setErrorOp("");
                              setCustomerName("");
                              if (val.length >= 11 && val.length <= 12) {
                                 checkPlnInquiry(val);
                              }
                            } else {
                              if (val.length >= 4) {
                                const prefix = val.slice(0, 4);
                                let detectedOp = "";
                                
                                for (const [op, prefixes] of Object.entries(OPERATOR_PREFIX)) {
                                  if (prefixes.includes(prefix)) detectedOp = op;
                                }

                                const productNameClean = product.name.toUpperCase().replace(/\./g, ''); 
                                
                                if (detectedOp && !productNameClean.includes(detectedOp) && activeTab.toUpperCase() !== 'UMUM' && activeTab.toUpperCase() !== 'DATA-UMUM') {
                                  setErrorOp(`❌ Ini Nomor ${detectedOp}, Bos! Jangan salah lapak.`);
                                } else {
                                  setErrorOp("");
                                  if(val.length >= 10) scrollToNext(step3Ref); 
                                }
                              } else {
                                setErrorOp("");
                              }
                            }
                          }}
                          placeholder={`Masukkan ${getDynamicLabel()}`} 
                          className={`w-full bg-[#F5FBFA] border-2 p-5 ${detectedOperator ? 'pl-16' : 'pl-5'} rounded-2xl outline-none text-base font-bold transition-all placeholder:text-slate-300 ${
                            errorOp ? "border-rose-500 bg-rose-50 text-rose-700" : "border-[#E0F2F1] focus:border-[#00796B] text-slate-700"
                          }`} 
                        />
                      </div>
                      {isInquiring ? (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00796B]">
                          <Loader2 size={20} className="animate-spin" />
                        </div>
                      ) : errorOp ? (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 animate-bounce">
                          <ShieldAlert size={20} />
                        </div>
                      ) : customerName ? (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                          <CheckCircle2 size={20} />
                        </div>
                      ) : null}
                    </div>

                    {customerName && (
                      <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 animate-in zoom-in">
                        <div className="bg-emerald-500 p-1 rounded-full text-white">
                          <CheckCircle2 size={12} />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-emerald-600 uppercase">Nama Pelanggan PLN</p>
                          <p className="text-sm font-black text-emerald-800">{customerName}</p>
                        </div>
                      </div>
                    )}
                    
                    {errorOp && (
                      <p className="text-[10px] font-black text-rose-500 uppercase italic animate-in slide-in-from-top-1 mt-1">
                        {errorOp}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* STEP 3: METODE PEMBAYARAN (DARI SHARED COMPONENT) */}
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

            {/* STEP 4 & 5: WA DAN PROMO (DARI SHARED COMPONENT) */}
            <ContactAndPromoSection
              step4Ref={step4Ref}
              waNumber={waNumber}
              setWaNumber={setWaNumber}
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              isPromoApplied={isPromoApplied}
              setIsPromoApplied={setIsPromoApplied}
            />

          </div> {/* END KOLOM KANAN */}

        </div> {/* END GRID 3 KOLOM */}

        {/* KOMPONEN STICKY DAN MODAL DI LUAR GRID */}
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

        <OrderConfirmationModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          product={product}
          selectedItem={selectedItem}
          accId={accId}
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