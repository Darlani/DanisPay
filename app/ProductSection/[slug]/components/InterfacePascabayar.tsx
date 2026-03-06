"use client";

import { useRef, useState } from "react";
import { Turnstile } from '@marsidev/react-turnstile';
import { 
  User, Search, Loader2, ReceiptText, CalendarDays, 
  CircleDollarSign, ShieldCheck, AlertTriangle, CheckCircle2, ShoppingCart
} from "lucide-react";

// IMPORT KOMPONEN SHARED
import OrderConfirmationModal from "./shared/OrderConfirmationModal";
import StickyBottomBar from "./shared/StickyBottomBar";
import PaymentSection from "./shared/PaymentSection";
import ContactAndPromoSection from "./shared/ContactAndPromoSection";

export default function InterfacePascabayar(props: any) {
  const {
    product, accId, setAccId, formatRupiah, 
    isMaintenanceDigiflazz, isAdmin, dbPayments,
    selectedPayment, setSelectedPayment, waNumber, setWaNumber,
    promoCode, setPromoCode, showAllPayment, setShowAllPayment,
    isModalOpen, setIsModalOpen, isPromoApplied, setIsPromoApplied,
    checkPromo, currentUser, memberType, userCoins, useCoins, setUseCoins,
    isMounted, handleCheckout
  } = props;

  // --- STATE KHUSUS PASCABAYAR ---
  const [isChecking, setIsChecking] = useState(false);
  const [inquiryData, setInquiryData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  // STATE LOKAL ANTI-OVERRIDE PAGE.TSX
  const [localPayment, setLocalPayment] = useState<string | null>(null);

  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);

  const isBlocked = isMaintenanceDigiflazz && !isAdmin;

// --- KALKULASI HARGA & ADMIN ---
// Gunakan Math.ceil atau pastikan Number benar-benar menangkap digit terakhir
  const rawTagihan = parseInt(inquiryData?.desc?.detail?.[0]?.nilai_tagihan || "0");
  const adminToko = parseInt(product?.items?.[0]?.price || "0");
  
  // 3. Admin Digiflazz (Hanya untuk keperluan record modal di backend nanti)
  const adminDigiflazz = Number(inquiryData?.admin || inquiryData?.desc?.detail?.[0]?.admin || 0);

  // 4. Harga yang harus dibayar User = Tagihan Murni + Admin Toko (118.976 + 5.100)
  const dynamicBasePrice = inquiryData ? (rawTagihan + adminToko) : 0;
  
  const totalPrice = Math.max(0, dynamicBasePrice - discount);
  
  // FIX: Validasi koin ketat, pastikan hanya memotong nominal jika toggle useCoins aktif
  const usedCoinsAmount = (useCoins && userCoins > 0) ? Math.min(totalPrice, userCoins) : 0;
  const finalTotalPrice = Math.max(0, totalPrice - usedCoinsAmount);
  
  // FIX: Ambil cashback dari database product, bukan hardcode
  const estimasiCashback = product?.cashback || product?.estimasi_cashback || 0;
  const nominalHemat = isPromoApplied ? discount : 0;

  // MOCK Data untuk komponen shared
  const mockSelectedItemId = inquiryData ? "pascabayar-item" : null;
  const mockSelectedItem = inquiryData ? { label: `Tagihan ${inquiryData.period || ''} + Admin` } : null;

const isReadyToCheckout = Boolean(
    inquiryData && 
    (finalTotalPrice === 0 ? true : !!localPayment) // captchaToken saya hapus sementara!
);

  const scrollToNext = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  const getDynamicLabel = () => {
    const name = product.name.toLowerCase();
    if (name.includes('pln') || name.includes('listrik')) return "ID Pelanggan (ID Pel)";
    if (name.includes('pdam')) return "Nomor Pelanggan PDAM";
    if (name.includes('bpjs')) return "Nomor Peserta BPJS";
    return "ID Pelanggan / Nomor Kontrak"; 
  };

  const handleInquiry = async () => {
    if (isBlocked) { setErrorMsg("Layanan sedang maintenance, Bos."); return; }
    if (!accId || accId.length < 5) { setErrorMsg("ID Pelanggan terlalu pendek!"); return; }

    setIsChecking(true);
    setErrorMsg("");
    setInquiryData(null);

    try {
      const res = await fetch('/api/pascabayar/inquiry', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customer_id: accId, 
          sku: product.items?.[0]?.sku || product.sku || 'pln', 
          category: product.category || product.name 
        })
      });

      const result = await res.json();
      if (res.ok) {
        setInquiryData(result.data);
        scrollToNext(step3Ref);
      } else {
        setErrorMsg(result.message || "ID Pelanggan tidak ditemukan.");
      }
    } catch (err) {
      setErrorMsg("Gagal koneksi ke server, coba lagi nanti.");
    } finally {
      setIsChecking(false);
    }
  };

const onConfirmCheckout = () => {
    setIsProcessing(true);
    handleCheckout({
      raw_tagihan: rawTagihan,
      admin_digiflazz: adminDigiflazz,
      override_price: totalPrice, // Ini sudah benar (rawTagihan + adminToko - diskon)
      override_payment: localPayment,
      override_cost: rawTagihan + adminDigiflazz, // Modal real Bos ke Digiflazz
      override_label: `Tagihan ${inquiryData?.period || 'Pascabayar'}`
    });
  };

  return (
    <div className="min-h-screen bg-[#bcefe5] text-slate-900 font-sans tracking-tight relative pb-32">
      <div className="relative">
        <div 
          className="h-48 w-full absolute top-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/background/header-bg.png')", backgroundColor: '#002C5F' }} 
        />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SISI KIRI: INFO PRODUK */}
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
                    <h1 className="text-lg font-black leading-tight text-slate-800 tracking-tight uppercase wrap-break-word">{product.name}</h1>
                    <p className="text-[10px] font-bold text-slate-400 lowercase first-letter:uppercase">Pembayaran tagihan bulanan otomatis & terpercaya.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                    <p className="text-[10px] text-emerald-700 font-bold leading-relaxed uppercase">Verifikasi Tagihan Real-Time.</p>
                  </div>
                  {isReadyToCheckout && (
                    <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl animate-in fade-in list-none shadow-sm shadow-blue-100">
                      <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shrink-0">
                          <ShoppingCart size={18} className="animate-bounce" />
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-blue-700 uppercase leading-none mb-1">Siap Transaksi!</p>
                          <p className="text-[11px] font-bold text-blue-600 lowercase first-letter:uppercase leading-none">Silakan selesaikan pembayaran.</p>
                      </div>
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* SISI KANAN: FORM & RINCIAN */}
          <div className="lg:col-span-2 space-y-8">
            
            {isBlocked && (
              <div className="bg-rose-50 border-2 border-dashed border-rose-200 p-6 rounded-4xl flex items-center gap-4">
                <div className="bg-rose-500 p-3 rounded-2xl text-white"><AlertTriangle size={24} className="animate-pulse" /></div>
                <div><h3 className="text-rose-700 font-black text-sm uppercase">Layanan Offline</h3><p className="text-[10px] text-rose-500 font-bold uppercase tracking-tight mt-0.5">Jalur pembayaran ini sedang perbaikan.</p></div>
              </div>
            )}

            {/* STEP 1: INPUT ID */}
            <section className={`bg-white rounded-[2.5rem] shadow-sm border border-[#B2DFDB]/40 overflow-hidden relative transition-opacity ${isBlocked ? 'opacity-60' : 'opacity-100'}`}>
              <div className="p-4 sm:p-8 border-b border-[#E0F2F1] bg-[#F5FBFA]">
                <div className="flex items-center gap-5">
                  <div className="bg-linear-to-br from-[#00695C] to-[#004D40] text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-teal-900/10 text-xl">
                    1
                  </div>
                  <div>
                    <h2 className="font-black text-2xl tracking-tight text-slate-800 leading-none uppercase">Cek Tagihan</h2>
                    <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-1.5 lowercase first-letter:uppercase">Masukkan nomor pelanggan Anda</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-8">
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"><User size={24} /></div>
                  <input 
                    type="text" disabled={isBlocked || inquiryData}
                    value={accId} onChange={(e) => setAccId(e.target.value.replace(/\D/g, ''))} 
                    placeholder={`Masukkan ${getDynamicLabel()}`} 
                    className={`w-full bg-[#F5FBFA] border-2 border-[#E0F2F1] focus:border-[#00796B] focus:bg-white pl-14 pr-24 py-5 rounded-2xl outline-none text-base font-bold transition-all ${isBlocked || inquiryData ? 'cursor-not-allowed opacity-70' : 'cursor-text text-slate-700'}`} 
                  />
                  {!inquiryData ? (
                    <button 
                      onClick={handleInquiry} disabled={isChecking || isBlocked}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#00796B] text-white p-3 rounded-xl hover:bg-[#004D40] transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      {isChecking ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                    </button>
                  ) : (
                    <button onClick={() => setInquiryData(null)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl hover:bg-rose-200 transition-all text-[10px] font-black uppercase shadow-sm">Ganti ID</button>
                  )}
                </div>
                {errorMsg && <p className="mt-4 text-rose-500 text-xs font-black uppercase flex items-center gap-2"><AlertTriangle size={14} /> {errorMsg}</p>}
              </div>
            </section>
            
            {/* STEP 2: RINCIAN TAGIHAN */}
            <section className={`bg-white rounded-[2.5rem] shadow-sm border border-[#B2DFDB]/40 overflow-hidden relative transition-all duration-500 ${inquiryData ? "opacity-100" : "hidden pointer-events-none"}`}>
              <div className="p-4 sm:p-8 border-b border-[#E0F2F1] bg-[#F5FBFA]">
                <div className="flex items-center gap-5">
                  <div className="bg-linear-to-br from-[#00695C] to-[#004D40] text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-teal-900/10 text-xl">
                    2
                  </div>
                  <div>
                    <h2 className="font-black text-2xl tracking-tight text-slate-800 leading-none uppercase">Rincian Tagihan</h2>
                    <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-1.5 lowercase first-letter:uppercase">Detail informasi tagihan Anda</p>
                  </div>
                </div>
              </div>

              {inquiryData && (
                <div className="p-4 sm:p-8 space-y-3 animate-in fade-in zoom-in duration-500">
                   
                   <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <div className="bg-slate-200 p-2.5 rounded-xl text-slate-600"><ReceiptText size={20} /></div>
                       <div>
                           <p className="text-[10px] font-bold text-slate-500 lowercase first-letter:uppercase tracking-wide">ID Pelanggan (ID Pel)</p>
                           <p className="text-sm font-black text-slate-800">{accId}</p>
                       </div>
                   </div>

                   <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <div className="bg-slate-200 p-2.5 rounded-xl text-slate-600"><User size={20} /></div>
                       <div>
                           <p className="text-[10px] font-bold text-slate-500 lowercase first-letter:uppercase tracking-wide">Nama</p>
                           <p className="text-sm font-black text-slate-800 uppercase">{inquiryData.customerName}</p>
                       </div>
                   </div>

                   <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <div className="bg-slate-200 p-2.5 rounded-xl text-slate-600"><ReceiptText size={20} /></div>
                       <div>
                           <p className="text-[10px] font-bold text-slate-500 lowercase first-letter:uppercase tracking-wide">Total Lembar Tagihan</p>
                           <p className="text-sm font-black text-slate-800">{inquiryData.desc?.lembar_tagihan || "1"} Bulan</p>
                       </div>
                   </div>

                   <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <div className="bg-slate-200 p-2.5 rounded-xl text-slate-600"><CalendarDays size={20} /></div>
                       <div>
                           <p className="text-[10px] font-bold text-slate-500 lowercase first-letter:uppercase tracking-wide">Periode (BL/TH)</p>
                           <p className="text-sm font-black text-slate-800">{inquiryData.period || "-"}</p>
                       </div>
                   </div>

                   <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <div className="bg-slate-800 p-2.5 rounded-xl text-white"><CircleDollarSign size={20} /></div>
                       <div>
                           <p className="text-[10px] font-bold text-slate-500 lowercase first-letter:uppercase tracking-wide">Total Tagihan (Rp Tag PLN)</p>
                           <p className="text-sm font-black text-slate-800">{formatRupiah(rawTagihan)}</p>
                       </div>
                   </div>

                   <div className="flex items-center gap-4 bg-[#E0F2F1] p-4 rounded-2xl border border-[#B2DFDB]">
                       <div className="bg-[#00796B] p-2.5 rounded-xl text-white"><ShieldCheck size={20} /></div>
                       <div>
                           <p className="text-[10px] font-bold text-[#00695C] lowercase first-letter:uppercase tracking-wide">Biaya Admin</p>
                           <p className="text-sm font-black text-[#004D40]">{formatRupiah(adminToko)}</p>
                       </div>
                   </div>

                </div>
              )}
            </section>

            {inquiryData && (
              <div className="space-y-8 animate-in fade-in duration-700">
                
                {/* STEP 3: METODE PEMBAYARAN (SHARED) */}
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
                  selectedPayment={localPayment}
                  setSelectedPayment={setLocalPayment}
                  totalPrice={finalTotalPrice}
                  productName={product.name}
                  scrollToNext={scrollToNext}
                />

                {/* STEP 4 & 5: KONTAK & PROMO (SHARED) */}
                <ContactAndPromoSection
                  step4Ref={step4Ref}
                  waNumber={waNumber}
                  setWaNumber={setWaNumber}
                  promoCode={promoCode}
                  setPromoCode={setPromoCode}
                  isPromoApplied={isPromoApplied}
                  setIsPromoApplied={setIsPromoApplied}
                />

                {/* STEP 6: CAPTCHA SECURITY */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-[#B2DFDB]/40 shadow-sm flex flex-col items-center justify-center animate-in slide-in-from-bottom-4">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Verifikasi Keamanan</p>
                   <Turnstile 
                     siteKey="0x4AAAAAACkQAA6L_WPQSSms" 
                     onSuccess={(token) => setCaptchaToken(token)}
                     onExpire={() => setCaptchaToken(null)}
                     options={{ theme: 'light', size: 'normal' }}
                   />
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- STICKY BOTTOM BAR (SHARED) --- */}
      <StickyBottomBar 
        selectedItemId={mockSelectedItemId}
        selectedItem={mockSelectedItem}
        totalPrice={finalTotalPrice}
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

      {/* --- MODAL KONFIRMASI (SHARED) --- */}
      <OrderConfirmationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={product}
        selectedItem={mockSelectedItem}
        accId={accId}
        selectedPayment={localPayment}
        totalPrice={finalTotalPrice}
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
  );
}