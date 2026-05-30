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
  email: string;
  setEmail: (val: string) => void;
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
  uniqueCode: number;
  isLoading: boolean;              
  onPreCheckout: () => Promise<void>; 
}

// 💡 MESIN PENYARING NAMA DI FRONTEND (Testing Gratis Tanpa Potong Saldo!)
function formatGameName(rawName: string): string {
  if (!rawName) return "Pelanggan Valid";
  const safeRaw = String(rawName);

  // 1. Tangkap Format MLBB (Username ... / Region ...)
  const mlMatch = safeRaw.match(/(?:Username|Nickname|Nama)\s*[:=]?\s*(.*?)\s*(?:\/|\||-)\s*(?:Region|Reg|Server|Zone)\s*[:\-=]?\s*([a-zA-Z0-9]+)/i);
  if (mlMatch) {
    const nick = mlMatch[1].trim();
    const reg = mlMatch[2].trim().toUpperCase();
    let regionName = reg === 'ID' ? 'Indonesia' : reg === 'SG' ? 'Singapura' : reg === 'MY' ? 'Malaysia' : reg;
    return `${nick} - Region: ${regionName}`;
  }

  // 2. Tangkap Format Free Fire dari SN (ID 12345 / Nickname) -> Mencegah tabrakan
  const ffMatch = safeRaw.match(/(?:ID|User ID)\s*\d+\s*(?:\/|\||-)\s*(.*)/i);
  if (ffMatch && !safeRaw.toLowerCase().includes('username')) {
    let nick = ffMatch[1].trim();
    nick = nick.replace(/(?:Tgl|Tanggal|SN|Waktu|Server|Zone|Region|Reg)[\s:=].*$/gi, '').trim();
    return nick || "Pelanggan Valid";
  }

  // 3. Tangkap format "ID-Nickname-Region"
  const dashMatch = safeRaw.match(/(?:ID\s*)?\d+\s*-\s*(.*?)\s*-\s*([a-zA-Z]{2,5})$/i);
  if (dashMatch) {
    return dashMatch[1].trim() + " - Region: " + dashMatch[2].trim().toUpperCase();
  }

  // 4. Fallback bersih-bersih standar
  let clean = safeRaw
    .replace(/(?:Tgl|Tanggal|SN|Waktu|Server|Zone|Region|Reg)[\s:=].*$/gi, '')
    .replace(/(?:,|\/|\|).*$/g, '')
    .replace(/Sukses Cek ID\.|Nickname:|Nama:|Username:|Tujuan:|ID:|User:/gi, '')
    .replace(/^[-\s]+|[-\s]+$/g, '');

  return clean || safeRaw; 
}

export default function InterfaceGame(props: InterfaceGameProps) {
  const {
    product, selectedItemId, setSelectedItemId, selectedPayment, setSelectedPayment,
    accId, setAccId, zoneId, setZoneId, email, setEmail, promoCode, setPromoCode,
    showAllPayment, setShowAllPayment, showAllItems, setShowAllItems,
    isModalOpen, setIsModalOpen, totalPrice, formatRupiah, handleCheckout,
    isPromoApplied, setIsPromoApplied, checkPromo, basePrice, currentUser, memberType,
    estimasiCashback, isMounted, userCoins, useCoins, setUseCoins,
    usedCoinsAmount, isMaintenanceDigiflazz, isAdmin, dbPayments, uniqueCode, isLoading, onPreCheckout
  } = props;

  const [isProcessing, setIsProcessing] = useState(false); 
  const [activeTab, setActiveTab] = useState("");

  // State khusus Navigasi Bertingkat (FF & MLBB)
  const [advRegion, setAdvRegion] = useState("Indonesia");
  const [advCategory, setAdvCategory] = useState("Diamond");
  const [advSubCategory, setAdvSubCategory] = useState("Semua");

  // State untuk Cek ID Game
  const [isChecking, setIsChecking] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 💡 STATE RIWAYAT NOMOR (LOCAL STORAGE)
  const [historyList, setHistoryList] = useState<string[]>([]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`dapay_history_game_${product?.name}`);
      if (saved) setHistoryList(JSON.parse(saved));
    }
  }, [product?.name]);

  const saveToHistory = (acc: string, zone: string) => {
    if (!acc) return;
    const val = zone ? `${acc}|${zone}` : acc;
    const saved = JSON.parse(localStorage.getItem(`dapay_history_game_${product?.name}`) || "[]");
    const updated = [val, ...saved.filter((x: string) => x !== val)].slice(0, 3); // Maksimal 3
    localStorage.setItem(`dapay_history_game_${product?.name}`, JSON.stringify(updated));
    setHistoryList(updated);
  };

  // 💡 AMBIL SEMUA SKU "CEK USERNAME" SEBAGAI AMUNISI AUTO-RETRY
  const inquirySkus = useMemo(() => {
    if (!product?.items) return [];
    return product.items
      .filter((item: any) => String(item.label || item.name || "").toLowerCase().includes("cek username"))
      .map((item: any) => item.sku); // Ambil array SKU-nya saja
  }, [product?.items]);

  // 💡 Tambahkan isPolling agar sistem tahu ini jemput bola antrean atau refresh manual biasa
  const handleInquiryGame = async (forceRefresh = false, isPolling = false) => {
    if (inquirySkus.length === 0) return true; 
    if (!accId || accId.length < 3) { setErrorMsg("ID terlalu pendek!"); return false; }

    // 💡 CEK LIMIT REFRESH MANUAL (Bypass/Abaikan limit jika ini adalah aksi Jemput Bola)
    if (forceRefresh && !isPolling) {
      const today = new Date().toDateString();
      const limitData = JSON.parse(localStorage.getItem('dapay_refresh_limit') || "{}");
      if (limitData.date === today && limitData.count >= 3) {
        alert("Mohon maaf, Kakak terlalu sering memuat ulang (Refresh) ID. Silakan coba kembali besok ya Kak untuk refresh ID-nya. Jika Kakak baru saja mengubah Nickname namun yang muncul masih Nickname lama, transaksi tetap aman dilanjutkan kok! Yang terpenting, pastikan Nomor ID yang dimasukkan sudah benar ya, Kak. Terima kasih telah menggunakan layanan DaPay.");
        return false;
      }
    }

    const cacheKey = `dapay_inquiry_${product?.name}_${accId}_${zoneId}`;
    
    // 💡 SMART CACHE (Expired 7 Hari) - Hanya jalan jika tidak di-refresh manual
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { name, timestamp } = JSON.parse(cachedData);
          const isExpired = Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000; // 7 Hari
          
          if (!isExpired) {
            setCustomerName(name);
            return true; // Lolos jika belum 7 hari
          } else {
            localStorage.removeItem(cacheKey); // Hapus jika basi
          }
        } catch (e) {
          // Kompatibilitas jika cache lama masih format teks biasa
          setCustomerName(cachedData);
          return true;
        }
      }
    }

    setIsChecking(true);
    setErrorMsg("");
    setCustomerName("");

    try {
      const res = await fetch('/api/digiflazz/prabayar/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customer_id: zoneId ? `${accId}${zoneId}` : accId, 
          skus: inquirySkus, 
          category: product.category || 'game',
          game_name: product.name // 💡 Kirim nama game untuk server-side lock
        })
      });
      const result = await res.json();
      
      if (res.ok && (result.data?.customerName || result.data?.customer_name)) {
        const rawName = result.data.customerName || result.data.customer_name;
        
        // 💡 PERCANTIK FORMAT TEKS TEPAT SEBELUM DITAMPILKAN KE LAYAR
        const cleanName = formatGameName(rawName);
        
        setCustomerName(cleanName);
        
        // 1. Simpan nama dan timestamp untuk umur 7 hari
        localStorage.setItem(cacheKey, JSON.stringify({ name: cleanName, timestamp: Date.now() }));
        
        // 2. Simpan nomor ke History
        saveToHistory(accId, zoneId);

        // 3. Tambah hitungan spam refresh harian (Hanya tambah jika BUKAN jemput bola)
        if (forceRefresh && !isPolling) {
          const today = new Date().toDateString();
          const limitData = JSON.parse(localStorage.getItem('dapay_refresh_limit') || "{}");
          const currentCount = limitData.date === today ? limitData.count : 0;
          localStorage.setItem('dapay_refresh_limit', JSON.stringify({ date: today, count: currentCount + 1 }));
        }
        
        return true; 
      } else {
        setErrorMsg(result.message || "ID tidak ditemukan / gangguan.");
        return false; 
      }
    } catch (err) {
      setErrorMsg("Gagal verifikasi ID. Coba lagi.");
      return false; 
    } finally {
      setIsChecking(false);
    }
  };

  // Jalankan cek otomatis di latar belakang saat Modal Terbuka
  useEffect(() => {
    if (isModalOpen && inquirySkus.length > 0 && !customerName && !errorMsg && !isChecking) {
      handleInquiryGame();
    }
  }, [isModalOpen]);

  // 💡 JEMPUT BOLA OTOMATIS: Lakukan Polling setiap 5 detik jika status sedang Antrean (⏳)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    // 🚀 Tambahkan deteksi 'Pending' agar setara dengan logika UI di bawah
    if (isModalOpen && (errorMsg.includes('antrean') || errorMsg.includes('Pending')) && !isChecking) {
      interval = setInterval(() => {
        // forceRefresh = true, isPolling = true (Maka limit 3x sehari akan di-bypass!)
        handleInquiryGame(true, true); 
      }, 5000); // 5000 ms = 5 detik
    }
    return () => clearInterval(interval);
  }, [isModalOpen, errorMsg, isChecking]);

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

  // --- MESIN LOGIKA AUTO-HIDE TABS MULTI-TIER (FF & MLBB) ---
  const processedItems = useMemo(() => {
    if (!product?.items) return [];
    
    // Hilangkan item Cek Username dari UI
    const visibleItems = product.items.filter((item: any) => 
      !String(item.label || item.name || "").toLowerCase().includes("cek username")
    );

    const isFreeFire = product?.name?.toLowerCase().includes('free fire');
    const isMLBB = product?.name?.toLowerCase().includes('mobile legends') || product?.name?.toLowerCase().includes('mlbb');
    
    return visibleItems.map((item: any) => {
      const name = String(item.label || item.name || "").toLowerCase();
      let region = "Indonesia";
      let category = "Diamond"; // Default
      let subCat = "Semua";

      // 1. DETEKSI REGION UMUM
      if (name.includes("singapura") || name.includes("singapore")) region = "Singapura";
      else if (name.includes("malaysia")) region = "Malaysia";
      else if (name.includes("global")) region = "Global";
      else if (name.includes("filipina") || name.includes("philippines")) region = "Filipina";
      else if (name.includes("thailand")) region = "Thailand";
      else if (name.includes("brazil")) region = "Brazil";
      else if (name.includes("russia")) region = "Russia";
      else if (name.includes("turkey")) region = "Turkey";
      else if (name.includes("vietnam")) region = "Vietnam";

      // 2. KATEGORI KHUSUS FREE FIRE
      if (isFreeFire) {
        if (name.includes("membership") || name.includes("mingguan") || name.includes("bulanan")) category = "Membership";
        else if (name.includes("level up pass")) category = "Level Up Pass";

        if (category === "Membership") {
          if (name.includes("+")) subCat = "+ Diamond";
          else if (name.match(/x2|x3|x4|x5/)) subCat = "Paket Multiplier";
          else subCat = "Reguler";
        }
      } 
      // 3. KATEGORI KHUSUS MOBILE LEGENDS
      else if (isMLBB) {
        if (name.includes("pass") || name.includes("starlight") || name.includes("member") || name.includes("bundle")) category = "Membership & Pass";

        if (category === "Membership & Pass") {
          if (name.includes("weekly")) {
            if (name.match(/2x|3x|4x|5x/)) subCat = "Paket Multiplier";
            else subCat = "Weekly Pass";
          }
          else if (name.includes("starlight")) subCat = "Starlight";
          else if (name.includes("twilight")) subCat = "Twilight Pass";
          else if (name.includes("coupon")) subCat = "Coupon Pass";
          else if (name.includes("monthly")) subCat = "Monthly Pass";
          else subCat = "Lainnya";
        }
      }

      return { ...item, advRegion: region, advCategory: category, advSubCategory: subCat, isAdvGame: isFreeFire || isMLBB };
    });
  }, [product?.items, product?.name]);

  // Kalkulasi Tombol Menu yang Tersedia
  const availableRegions = useMemo(() => {
    const regions = new Set(processedItems.filter((i: any) => i.isAdvGame).map((i: any) => i.advRegion).filter(Boolean));
    return ["Indonesia", "Singapura", "Malaysia", "Global", "Filipina", "Thailand", "Brazil", "Russia", "Turkey", "Vietnam"].filter(r => regions.has(r));
  }, [processedItems]);

  const availableCategories = useMemo(() => {
    const categories = new Set(processedItems.filter((i: any) => i.advRegion === advRegion && i.isAdvGame).map((i: any) => i.advCategory));
    return ["Diamond", "Membership", "Level Up Pass", "Membership & Pass", "Bundle"].filter(c => categories.has(c));
  }, [processedItems, advRegion]);

  const availableSubCats = useMemo(() => {
    const subCats = new Set(processedItems.filter((i: any) => i.advRegion === advRegion && i.advCategory === advCategory && i.isAdvGame).map((i: any) => i.advSubCategory));
    const validSubs = ["Reguler", "+ Diamond", "Paket Multiplier", "Weekly Pass", "Starlight", "Twilight Pass", "Coupon Pass", "Monthly Pass", "Lainnya"].filter(sc => subCats.has(sc));
    if (validSubs.length > 0) return ["Semua", ...validSubs];
    return [];
  }, [processedItems, advRegion, advCategory]);

  // Auto-Select untuk menghindari tab kosong
  useEffect(() => { if (availableRegions.length > 0 && !availableRegions.includes(advRegion)) setAdvRegion(availableRegions[0]); }, [availableRegions, advRegion]);
  useEffect(() => { if (availableCategories.length > 0 && !availableCategories.includes(advCategory)) setAdvCategory(availableCategories[0]); }, [availableCategories, advCategory]);
  useEffect(() => { if (availableSubCats.length > 0 && !availableSubCats.includes(advSubCategory)) setAdvSubCategory(availableSubCats[0]); }, [availableSubCats, advSubCategory]);

  const filteredItems = useMemo(() => {
    if (!processedItems) return [];
    
    return processedItems.filter((item: any) => {
      const providerName = String(item.provider || "").toUpperCase();
      if (isMaintenanceDigiflazz && !isAdmin && providerName === 'DIGIFLAZZ') return false;

      // Filter khusus MLBB dan FF
      if (item.isAdvGame) {
        if (item.advRegion !== advRegion) return false;
        if (item.advCategory !== advCategory) return false;
        if ((item.advCategory === "Membership" || item.advCategory === "Membership & Pass") && advSubCategory !== "Semua" && item.advSubCategory !== advSubCategory) return false;
        return true;
      }

      // Filter Game Default
      if (availableSubBrands.length === 0) return true;
      return String(item.sub_brand).toLowerCase() === String(activeTab).toLowerCase();
    });
  }, [processedItems, activeTab, availableSubBrands, isMaintenanceDigiflazz, isAdmin, advRegion, advCategory, advSubCategory]);

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
    if (inquirySkus.length > 0 && errorMsg) {
      alert(`Gagal: ${errorMsg}\nSilakan perbaiki ID Akun Anda terlebih dahulu.`);
      setIsModalOpen(false); 
      return;
    }
    saveToHistory(accId, zoneId); // Simpan riwayat jika game tanpa fitur inquiry
    setIsProcessing(true);
    handleCheckout();
  };

  const steps = [
    { id: 1, label: "Pilih Nominal yang kamu inginkan", completed: !!selectedItemId },
    { id: 2, label: "Masukan Detail Akun yang kamu gunakan", completed: isMLBB ? accId.length >= 3 && zoneId.length >= 3 : accId.length >= 3 },
    { id: 3, label: "Pilih Metode Pembayaran", completed: !!selectedPayment },
    { id: 4, label: "Masukan alamat Email kamu", completed: email.includes('@') && email.length > 5 },
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
          <div className="lg:col-span-1 lg:sticky lg:top-24 lg:self-start z-20 space-y-4 relative">
            <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-900/10 border border-slate-100">
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
            <section className="bg-white rounded-2xl sm:rounded-3xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-[#B2DFDB]/40 overflow-hidden relative">
              <div className="flex items-stretch border-b border-[#E0F2F1] bg-[#F5FBFA]">
                <div className="bg-[#00695C] w-8 sm:w-10 flex items-center justify-center text-white font-black text-base sm:text-lg shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.1)] z-10">
                  1
                </div>
                <div className="py-2 px-3 sm:py-2.5 sm:px-4 flex flex-col justify-center">
                  <h2 className="font-black text-sm sm:text-base tracking-tight text-slate-800 leading-none">Pilih Nominal</h2>
                  <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 tracking-wide mt-1 lowercase first-letter:uppercase">Item tersedia untuk top-up instan</p>
                </div>
              </div>
              
              <div className="p-2 sm:p-8 space-y-6">
                {/* RENDER MENU TABS DINAMIS */}
                {product.name.toLowerCase().includes('free fire') || product.name.toLowerCase().includes('mobile legends') || product.name.toLowerCase().includes('mlbb') ? (
                  <div className="flex flex-col gap-3">
                    {/* TIER 1: REGION */}
                    {availableRegions.length > 0 && (
                      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 hide-scrollbar select-none scroll-smooth">
                        {availableRegions.map((reg) => (
                          <button
                            key={reg}
                            onClick={() => { setAdvRegion(reg); setShowAllItems(false); }}
                            className={`px-2.5 sm:px-4 h-7 sm:h-10 flex items-center justify-center rounded-xl sm:rounded-2xl text-[9px] sm:text-[12px] font-black tracking-tight sm:tracking-normal transition-all border sm:border-2 shrink-0 whitespace-nowrap cursor-pointer ${
                              advRegion === reg 
                                ? "bg-[#64d1c4] border-[#63cdc1] text-white shadow-md shadow-teal-900/20 flex-1" 
                                : "bg-[#F5FBFA] border-[#E0F2F1] text-slate-400 hover:border-[#80CBC4] flex-1"
                            }`}
                          >
                            {reg === "Indonesia" ? "🇮🇩 " : reg === "Singapura" ? "🇸🇬 " : reg === "Malaysia" ? "🇲🇾 " : reg === "Filipina" ? "🇵🇭 " : reg === "Thailand" ? "🇹🇭 " : reg === "Brazil" ? "🇧🇷 " : reg === "Russia" ? "🇷🇺 " : reg === "Turkey" ? "🇹🇷 " : reg === "Vietnam" ? "🇻🇳 " : "🌍 "}{reg}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* TIER 2: KATEGORI */}
                    {availableCategories.length > 0 && (
                      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 hide-scrollbar select-none scroll-smooth animate-in slide-in-from-top-2 fade-in">
                        {availableCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => { setAdvCategory(cat); setShowAllItems(false); }}
                            className={`px-3 sm:px-5 h-7 sm:h-9 flex items-center justify-center rounded-full text-[9px] sm:text-[11px] font-bold uppercase tracking-widest transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                              advCategory === cat 
                                ? "bg-[#00695C] text-white shadow-sm" 
                                : "bg-white border border-[#B2DFDB] text-slate-500 hover:bg-[#E0F2F1]"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* TIER 3: SUB-KATEGORI */}
                    {(advCategory === "Membership" || advCategory === "Membership & Pass") && availableSubCats.length > 1 && (
                      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-4 hide-scrollbar select-none scroll-smooth animate-in slide-in-from-left-4 fade-in">
                        {availableSubCats.map((sub) => (
                          <button
                            key={sub}
                            onClick={() => { setAdvSubCategory(sub); setShowAllItems(false); }}
                            className={`px-2.5 sm:px-3 h-6 sm:h-8 flex items-center justify-center rounded-lg text-[8px] sm:text-[10px] font-bold italic tracking-tight transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
                              advSubCategory === sub 
                                ? "bg-[#FFC107] border-[#FFB300] text-slate-900 shadow-sm" 
                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {sub === "Paket Multiplier" ? "Mingguan x2, x3..." : sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : availableSubBrands.length > 1 ? (
                  <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-4 hide-scrollbar select-none scroll-smooth">
                    {availableSubBrands.map((tab: string) => (
                      <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setShowAllItems(false); }}
                        className={`px-2.5 sm:px-4 h-7 sm:h-10 flex items-center justify-center rounded-xl sm:rounded-2xl text-[9px] sm:text-[12px] font-black capitalize tracking-tight sm:tracking-normal transition-all border sm:border-2 shrink-0 whitespace-nowrap cursor-pointer ${
                          activeTab === tab ? "bg-[#64d1c4] border-[#63cdc1] text-white shadow-md sm:shadow-lg shadow-teal-900/20" : "bg-white border-[#E0F2F1] text-slate-400 hover:border-[#80CBC4]"
                        }`}
                      >
                        {tab.replace(/-/g, ' ')}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 px-0">
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
                        className="relative group h-auto sm:min-h-48 w-full text-left animate-in fade-in zoom-in cursor-pointer"
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
                        <div className="px-1 sm:px-3 pt-4 pb-6 sm:pt-4 sm:pb-8 flex flex-col items-center justify-start sm:justify-center text-center flex-1 relative overflow-hidden">
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
                                      <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-slate-900 fill-current" />
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
  className="w-full py-3 sm:py-4 bg-[#F5FBFA] hover:bg-[#004D40] border-2 border-dashed border-[#B2DFDB] hover:border-[#004D40] rounded-3xl transition-all duration-300 group shadow-sm mt-1! sm:mt-4! cursor-pointer"
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
                <div className="bg-[#00695C] w-8 sm:w-10 flex items-center justify-center text-white font-black text-base sm:text-lg shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.1)] z-10">
                  2
                </div>
                <div className="py-2 px-3 sm:py-2.5 sm:px-4 flex flex-1 items-center justify-between">
                  <div className="flex flex-col justify-center">
                    <h2 className="font-black text-sm sm:text-base tracking-tight text-slate-800 leading-none">Masukan Detail Akun</h2>
                    <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 tracking-wide mt-1 lowercase first-letter:uppercase">Pastikan data yang anda masukkan benar</p>
                  </div>
                  {/* Tombol panduan */}
                  <button className="hidden sm:flex items-center gap-1 bg-[#E0F2F1] text-[#00695C] px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#B2DFDB] transition-all border border-[#B2DFDB]">
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
                        onChange={(e) => { setAccId(e.target.value); setCustomerName(""); setErrorMsg(""); }} 
                        placeholder={`Masukkan ${getDynamicLabel()}`} 
                        className="w-full bg-[#F5FBFA] border-2 border-[#E0F2F1] focus:border-[#00796B] focus:bg-white py-2.5 px-4 sm:py-3 sm:px-5 rounded-xl outline-none text-sm sm:text-base font-bold text-slate-700 transition-all placeholder:text-slate-400" 
                      />
                    </div>
                    {customerName && (
                      <p className="text-[10px] font-black text-emerald-600 bg-emerald-50 p-2 rounded-lg animate-in zoom-in uppercase">
                        👤 Nickname: {customerName}
                      </p>
                    )}
                    {errorMsg && (
                      <p className={`text-[10px] font-black italic ${errorMsg.includes('antrean') || errorMsg.includes('Pending') ? 'text-blue-500' : 'text-rose-500'}`}>
                        {errorMsg.includes('antrean') || errorMsg.includes('Pending') ? '⏳ Mengamankan jalur ke server...' : '❌ ID tidak ditemukan / Server sibuk'}
                      </p>
                    )}
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
                              setCustomerName("");
                              setErrorMsg("");
                              if(e.target.value.length >= 4) scrollToNext(step3Ref);
                            }}
                            placeholder="1234" 
                            className="w-full bg-[#F5FBFA] border-2 border-[#E0F2F1] focus:border-[#00796B] focus:bg-white py-2.5 px-4 sm:py-3 sm:px-5 rounded-xl outline-none text-sm sm:text-base font-bold text-slate-700 transition-all placeholder:text-slate-400" 
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* 💡 CHIP RIWAYAT UI */}
                {historyList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-4 pt-2 border-t border-slate-100 animate-in fade-in">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">Terakhir:</span>
                    {historyList.map(h => {
                      const [hAcc, hZone] = h.split('|');
                      return (
                        <button
                          key={h}
                          onClick={() => {
                            setAccId(hAcc);
                            if (hZone) setZoneId(hZone);
                            setCustomerName("");
                            setErrorMsg("");
                          }}
                          className="bg-slate-50 hover:bg-teal-50 text-slate-500 hover:text-teal-700 px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors border border-slate-200 hover:border-teal-200 shadow-sm"
                        >
                          {hZone ? `${hAcc} (${hZone})` : hAcc}
                        </button>
                      );
                    })}
                  </div>
                )}
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
              email={email}
              setEmail={setEmail}
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              isPromoApplied={isPromoApplied}
              setIsPromoApplied={setIsPromoApplied}
              checkPromo={checkPromo}
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
          // Copot fungsi penahan agar modal instan terbuka
          onCheckInquiry={undefined} 
          isChecking={false} 
          isLoading={isLoading}
          onPreCheckout={onPreCheckout}
        />

        {/* MODAL KONFIRMASI */}
        <OrderConfirmationModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          product={product}
          selectedItem={selectedItem}
          // 💡 Jika ditekan manual saat antrean, jadikan isPolling=true agar bebas limit!
          onRefresh={inquirySkus.length > 0 ? () => handleInquiryGame(true, errorMsg.includes('antrean') || errorMsg.includes('Pending')) : undefined} 
          // 💡 UI Canggih: Sembunyikan pesan backend & hapus ID redundan jika fitur Cek Username aktif
          accId={
            isChecking 
              ? `🔍 Mencari Data...` 
              : errorMsg.includes('antrean') || errorMsg.includes('Pending')
                ? `⏳ Menghubungkan Server...`
                : errorMsg 
                  ? `❌ ID Tidak Ditemukan`
                  : customerName 
                    ? `👤 ${customerName}` 
                    : (zoneId ? `${accId} (${zoneId})` : accId) // Fallback untuk game tanpa Cek Username
          }
          selectedPayment={selectedPayment}
          totalPrice={totalPrice}
          nominalHemat={nominalHemat}
          usedCoinsAmount={usedCoinsAmount}
          estimasiCashback={estimasiCashback}
          memberType={memberType}
          formatRupiah={formatRupiah}
          // 💡 Kunci tombol secara "Friendly" (Diam/Abu-abu jika belum siap)
          isProcessing={isProcessing} // Tombol HANYA muter saat beneran diklik "Konfirmasi Pesanan"
          hasError={!!errorMsg && !errorMsg.includes('antrean') && !errorMsg.includes('Pending')}
          handleCheckout={onConfirmCheckout}
          dynamicLabel={inquirySkus.length > 0 ? "Nickname" : getDynamicLabel()}
          isMounted={isMounted}
          uniqueCode={uniqueCode}
          // Gabungkan semua state antrean/pencarian ke isLoading agar tombol cukup mati (disable) tanpa muter-muter
          isLoading={isLoading || isChecking || errorMsg.includes('antrean') || errorMsg.includes('Pending')}
        />

      </div>
    </div>
  );
}