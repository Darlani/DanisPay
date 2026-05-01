"use client";
import { use, useState, useMemo, useEffect, Suspense } from "react"; 
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldAlert } from "lucide-react";
import FingerprintJS from '@fingerprintjs/fingerprintjs'; 
import { supabase } from "@/utils/supabaseClient";
import MaintenancePage from "@/utils/MaintenancePage";

// --- IMPORT KOMPONEN UI ---
import InterfaceGame from "@/app/ProductSection/[slug]/components/InterfaceGame";
import InterfaceVoucher from "@/app/ProductSection/[slug]/components/InterfaceVoucher";
import InterfacePulsa from "@/app/ProductSection/[slug]/components/InterfacePulsa";
import InterfacePascabayar from "@/app/ProductSection/[slug]/components/InterfacePascabayar";
import InterfaceEMoney from "@/app/ProductSection/[slug]/components/InterfaceEMoney";
import InterfaceEntertainment from "@/app/ProductSection/[slug]/components/InterfaceEntertainment";
import InterfaceSosmed from "@/app/ProductSection/[slug]/components/InterfaceSosmed";
import InterfaceProductivity from "@/app/ProductSection/[slug]/components/InterfaceProductivity";
import InterfaceTravel from "@/app/ProductSection/[slug]/components/InterfaceTravel";
import InterfaceDigitalService from "@/app/ProductSection/[slug]/components/InterfaceDigitalService";
import InterfaceMarketplace from "@/app/ProductSection/[slug]/components/InterfaceMarketplace";

// ============================================================================
// 1. KOMPONEN ISI (YANG MEMBACA SEARCH PARAMS)
// ============================================================================
function DetailContent({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams(); 

  const [productData, setProductData] = useState<any>(null);
  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // State Form
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [accId, setAccId] = useState(""); 
  const [zoneId, setZoneId] = useState(""); 
  const [additionalData, setAdditionalData] = useState<any>({}); 
  const [waNumber, setWaNumber] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [showAllPayment, setShowAllPayment] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [uniqueCode, setUniqueCode] = useState(0); // State baru untuk simpan kode unik
  const [isLoading, setIsLoading] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [memberType, setMemberType] = useState<string | null>(null);
  const [referrer, setReferrer] = useState<string | null>(null);
  
  // State Koin DaPay & Payment
  const [userCoins, setUserCoins] = useState(0);
  const [useCoins, setUseCoins] = useState(false);
  const [dbPayments, setDbPayments] = useState<any[]>([]);

  // SECURITY: Pengecekan Admin via LocalStorage & Session
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // --- TANGKAP DATA DARI URL PARAMETERS (QUICK RE-ORDER) ---
    const target = searchParams.get('target');
    const zone = searchParams.get('zone');

    if (target) setAccId(target);
    if (zone) setZoneId(zone);

    // --- CEK ADMIN AMAN TAHAP 1 (LocalStorage) ---
    const localEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
    let currentIsAdmin = localEmail === "admin1@gmail.com";
    setIsAdmin(currentIsAdmin);

const fetchProductFromDB = async () => {
    try {
      // Catatan: Mekanisme auto-retry maksimal 3 kali untuk mengatasi cold start API/Supabase
      let response;
      let result;
      
      for (let i = 0; i < 3; i++) {
        response = await fetch(`/api/products/${slug}`);
        result = await response.json();
        
        // Kalau sukses, langsung keluar dari loop
        if (response.ok && result.success) break;
        
        // Kalau gagal, tunggu 1.5 detik sebelum mencoba nembak API lagi
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      if (result && result.success) {
        // Handle Maintenance Mode
        if (result.productData.maintenance && !currentIsAdmin) {
          setProductData({ maintenance: true });
          setIsFetchingDB(false);
          return;
        }

        // Set Data Payment & Products
        if (result.payData) setDbPayments(result.payData);
        
        // Simpan harga ke local storage
        if (result.productData.items && result.productData.items.length > 0) {
          const priceMap = result.productData.items.reduce((acc: any, item: any) => {
            acc[item.id] = item.price;
            return acc;
          }, {});
          localStorage.setItem(`last_price_${slug}`, JSON.stringify(priceMap));
        }

        setProductData(result.productData);
      }
    } catch (err) { 
      // Error handled silently for performance
    } finally { 
      setIsFetchingDB(false); 
    }
  };

    // Catatan: Hanya fetch kalau data memang belum ada untuk ngurangin beban backend
if (!productData && !isLoading) {
  fetchProductFromDB();
}

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      
      // --- CEK ADMIN AMAN TAHAP 2 (Validasi Supabase Session) ---
      if (session?.user?.email === "admin1@gmail.com") {
        setIsAdmin(true);
      } else if (currentIsAdmin && session?.user?.email !== "admin1@gmail.com") {
        // Jika di LocalStorage dia ngaku Admin tapi di DB Supabase BUKAN, matikan aksesnya!
        setIsAdmin(false); 
      }

      if (session?.user) {
        supabase.from('profiles').select('member_type, balance, referred_by').eq('id', session.user.id).maybeSingle()
          .then(async ({ data }) => {
            setMemberType(data?.member_type || null);
            setUserCoins(data?.balance || 0);
            if (data?.referred_by) {
              setReferrer(data.referred_by); 
            }
          });
      }
    });
    return () => subscription.unsubscribe();
  }, [slug, searchParams]); 

  // --- FUNGSI TRACKING & LOGIKA HARGA (TETAP SAMA) ---
const getBrowserData = async () => {
    let ip = "0.0.0.0";
    try { 
      const ipReq = await fetch('https://api.ipify.org?format=json'); 
      const ipData = await ipReq.json(); 
      ip = ipData.ip; 
    } catch (e) { 
      // Silently fail to keep UI snappy
    }
    const fpPromise = await FingerprintJS.load(); 
    const fpResult = await fpPromise.get();
    return { ip, deviceId: fpResult.visitorId };
  };

  const selectedItem = useMemo(() => productData?.items?.find((i: any) => String(i.id) === String(selectedItemId)) || null, [productData, selectedItemId]);
  const basePrice = selectedItem ? selectedItem.price : 0;
  const estimasiCashback = useMemo(() => selectedItem ? (selectedItem.cashback || 0) : 0, [selectedItem]);

  const priceBeforeBalance = useMemo(() => {
    if (!selectedItem) return 0;
    let p = basePrice;
    if (selectedItem.discount > 0) p = Math.floor(basePrice * (1 - selectedItem.discount / 100));
    if (isPromoApplied && discount > 0) p -= discount;
    return p < 0 ? 0 : p;
  }, [selectedItem, basePrice, isPromoApplied, discount]);

  const usedCoinsAmount = useMemo(() => (useCoins && userCoins > 0) ? Math.min(priceBeforeBalance, userCoins) : 0, [useCoins, userCoins, priceBeforeBalance]);
  const totalPrice = useMemo(() => priceBeforeBalance - usedCoinsAmount, [priceBeforeBalance, usedCoinsAmount]);
  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

  const checkPromo = async (inputCode: string) => {
    setIsPromoApplied(false); setDiscount(0);
    if (!inputCode) return { success: false };
    try {
      const { ip, deviceId } = await getBrowserData();
      const res = await fetch('/api/voucher/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputCode, product_slug: slug, ip, device_id: deviceId, target_id: accId })
      });
      const data = await res.json();
      if (data.valid) { setDiscount(data.discount); setIsPromoApplied(true); return { success: true, amount: data.discount }; }
      return { success: false, message: data.message };
    } catch (err) { return { success: false }; }
  };

const handlePreCheckout = async () => {
    if (!selectedItemId || !selectedPayment) return;
    
    // 🚀 LANGSUNG BUKA MODAL (Render < 50ms)
    setIsModalOpen(true); 
    setUniqueCode(0); // Reset kode lama
    
    setIsLoading(true); // Loading hanya untuk bagian Biaya Layanan
    try {
      const res = await fetch('/api/orders/generate-uniquecode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basePrice: priceBeforeBalance })
      });
      const data = await res.json();
      
      if (data.success) {
        setUniqueCode(data.uniqueCode);
      }
    } catch (err) {
      console.error("Gagal ambil kode unik");
    } finally {
      setIsLoading(false);
    }
  };

const handleCheckout = async (customPayload?: any) => {
    // 1. Hapus validasi !selectedItem karena pascabayar gak pake pilih item
    if (isLoading) return; 
    setIsLoading(true);
    try {
      // 2. TANGKAP DATA TITIPAN DARI PASCABAYAR
      const activePrice = customPayload?.override_price !== undefined ? customPayload.override_price : totalPrice;
      const activePayment = customPayload?.override_payment || selectedPayment;
      const activeCost = customPayload?.override_cost !== undefined ? customPayload.override_cost : (selectedItem?.cost || 0);
      const activeLabel = customPayload?.override_label || selectedItem?.label || "Tagihan Pascabayar";
      const activeSku = selectedItem?.sku || productData?.items?.[0]?.sku || "PASCABAYAR";

      // Gunakan uniqueCode dari state, bukan diacak lagi di sini
      const totalAmount = Number(activePrice) + uniqueCode; 
      const isFullCoin = totalAmount === 0;
      const orderIdStr = `DANISH-${Math.floor(Math.random() * 90000) + 10000}`;
      const combinedGameId = zoneId ? `${accId}(${zoneId})` : accId;
      const browserData = await getBrowserData();
      
      const paymentMethodName = isFullCoin ? 'Koin DaPay' : (usedCoinsAmount > 0 ? `${activePayment} + Koin DaPay` : activePayment);

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderIdStr, 
          sku: activeSku, 
          product_name: productData.name, 
          item_label: activeLabel,
          game_id: combinedGameId, 
          buy_price: activeCost, 
          price: activePrice, 
          unique_code: uniqueCode,
          total_amount: totalAmount, 
          payment_method: paymentMethodName,
          status: 'Pending', 
          user_contact: waNumber || `GUEST-${browserData.deviceId.slice(0, 8)}`, 
          ip_address: browserData.ip,
          device_id: browserData.deviceId, 
          user_id: currentUser?.id || null, 
          email: currentUser?.email || null, 
          referred_by: referrer || null,
          category: productData.category || "game", 
          created_at: new Date().toISOString(), 
          used_balance: usedCoinsAmount,
          cashback: (memberType?.toLowerCase() === 'special') ? estimasiCashback : 0, 
          voucher_amount: isPromoApplied ? discount : 0,
          raw_tagihan: customPayload?.raw_tagihan || 0,
          admin_digiflazz: customPayload?.admin_digiflazz || 0,
          // 🚀 PAKSA KIRIM DATA INQUIRY AGAR API_REF_ID TERISI INQ-xxxx
          inquiry_result: customPayload?.inquiry_result || null 
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Gagal membuat pesanan.");

      if (isFullCoin && currentUser?.email) {
        await fetch('/api/orders/process/coin', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderIdStr, email: currentUser.email })
        });
      }

      router.push(`/checkout/pay/${orderIdStr}`);
    } catch (err: any) { 
      alert("Gagal: " + err.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const commonProps = {
    product: productData, selectedItemId, setSelectedItemId, setSelectedPayment, accId, setAccId, zoneId, setZoneId, 
    waNumber, setWaNumber, promoCode, setPromoCode, showAllPayment, setShowAllPayment, showAllItems, setShowAllItems,
    isModalOpen, setIsModalOpen, uniqueCode, totalPrice, formatRupiah, selectedPayment: selectedPayment, 
    handleCheckout, isPromoApplied, setIsPromoApplied, checkPromo, basePrice, estimasiCashback, isMounted, currentUser, memberType,
    additionalData, setAdditionalData, userCoins, useCoins, setUseCoins, usedCoinsAmount, 
    isMaintenanceDigiflazz: productData?.is_maintenance_digiflazz || false, isAdmin, dbPayments, onPreCheckout: handlePreCheckout, isLoading: isLoading
  };

  if (isFetchingDB && !productData) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!productData) return notFound();

  if (productData?.maintenance) {
    if (isAdmin) {
       if (!productData.name) return <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white font-black uppercase tracking-tighter italic">ADMIN MODE: BYPASSING MAINTENANCE...</div>;
    } else {
      return <MaintenancePage />;
    }
  }

const renderInterface = () => {
    const category = (productData?.category || "").toLowerCase();

    // 1. Cek Kategori Spesifik (Manual)
    if (category.includes("pascabayar") || category.includes("ppob")) return <InterfacePascabayar {...commonProps} />;
    
    // 2. Tambahkan "tagihan prabayar" agar masuk ke InterfacePulsa
    if (category.includes("pulsa") || category.includes("data") || category.includes("tagihan prabayar")) {
      return <InterfacePulsa {...commonProps} />;
    }

    // 3. Switch Case tanpa Default
    switch (category) {
      case "game": return <InterfaceGame {...commonProps} />;
      case "voucher": return <InterfaceVoucher {...commonProps} />;
      case "e-money": case "e-wallet": return <InterfaceEMoney {...commonProps} />;
      case "streaming": case "entertainment": return <InterfaceEntertainment {...commonProps} />;
      case "sosmed": return <InterfaceSosmed {...commonProps} />;
      case "productivity": return <InterfaceProductivity {...commonProps} />;
      case "travel": return <InterfaceTravel {...commonProps} />;
      case "marketplace": return <InterfaceMarketplace {...commonProps} />;
      case "digital": return <InterfaceDigitalService {...commonProps} />;
    }

    return null;
  };

  return (
    <div className="flex flex-col w-full bg-[#F8FAFC]">
      {renderInterface()}
      {productData?.maintenance && (
        <div className="fixed bottom-24 right-6 z-9999 pointer-events-none">
          <div className="bg-rose-600/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl border-2 border-white/20 shadow-2xl flex items-center gap-3 animate-bounce">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest leading-none">Admin Mode</p>
              <p className="text-[8px] font-bold opacity-80 uppercase italic">Maintenance Bypassed</p>
            </div>
            <ShieldAlert size={18} className="text-white/80" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. KOMPONEN UTAMA (MEMBUNGKUS DENGAN SUSPENSE UNTUK BUILD NEXT.JS)
// ============================================================================
export default function DetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    }>
      <DetailContent slug={slug} />
    </Suspense>
  );
}