"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import BannerCarousel from '@/components/BannerCarousel';
import ProductSection from '@/components/ProductSection';
import CategoryShortcut from '../components/CategoryShortcut';
import MaintenancePage from "@/utils/MaintenancePage"; 
import { Loader2, Settings, Clock, ChevronRight, Zap, Smartphone, Gamepad2, Wifi, MonitorPlay, Headset, CheckCircle2, XCircle } from "lucide-react";
import FingerprintJS from '@fingerprintjs/fingerprintjs'; 
import ContactModal from "@/components/ContactModal";

// --- KOMPONEN BARU: BANNER PENDING DENGAN TIMER REALTIME & AUTO-SYNC ---
function PendingPaymentBanner({ order, router, onResolved }: { order: any, router: any, onResolved: (status: string) => void }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  // 1. Logika Timer 2 Jam Mutlak
  useEffect(() => {
    if (!order?.created_at) return;
    const safeDateString = order.created_at.endsWith('Z') ? order.created_at : `${order.created_at}Z`;
    const expiryTime = new Date(safeDateString).getTime() + 7200000;

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = expiryTime - now;

      if (distance <= 0) {
        setIsExpired(true);
        setTimeLeft("00:00:00");
        return;
      }

      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    updateTimer(); 
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order]);

  // 2. Auto-Sync Ringan Tiap 10 Detik via API Backend (Tembus RLS)
  useEffect(() => {
    if (!order?.order_id || isExpired || isResolved) return;

    const checkPaymentStatus = async () => {
      try {
        // Minta bantuan API Invoice agar aman dari blokir keamanan Supabase
        const res = await fetch('/api/orders/invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.order_id })
        });

        if (res.ok) {
          const json = await res.json();
          const data = json.data;

          if (data && data.status) {
            const currentStatus = data.status.toLowerCase();
            
            if (currentStatus !== 'pending') {
              setIsResolved(true); // Sembunyikan banner instan
              onResolved(data.status); // Luncurkan pop-up Toast!

              // Update cache browser lokal
              const guestCache = localStorage.getItem('dapay_guest_history');
              if (guestCache) {
                let history = JSON.parse(guestCache);
                const orderIndex = history.findIndex((o: any) => o.order_id === order.order_id);
                if (orderIndex !== -1) {
                  history[orderIndex].status = data.status;
                  localStorage.setItem('dapay_guest_history', JSON.stringify(history));
                }
              }
            }
          }
        }
      } catch (err) {
        // Silently fail
      }
    };

    checkPaymentStatus(); // 🚀 JALANKAN SEKETIKA SAAT RELOAD! (Tanpa nunggu 10 detik)
    const syncInterval = setInterval(checkPaymentStatus, 10000);
    return () => clearInterval(syncInterval);
  }, [order, isExpired, isResolved, onResolved]);

  // Hilangkan dari UI jika expired atau sudah sukses/gagal
  if (isExpired || isResolved) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-12 mt-6 relative z-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-linear-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-lg shadow-amber-500/5 backdrop-blur-md">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-amber-500/20 p-3 rounded-full shrink-0 relative">
            <div className="absolute inset-0 bg-amber-500/40 rounded-full animate-ping"></div>
            <Clock className="w-6 h-6 text-amber-400 relative z-10" />
          </div>
          <div>
            <h3 className="text-amber-400 font-black text-sm md:text-lg uppercase tracking-wide">Menunggu Pembayaran</h3>
            <p className="text-slate-300 text-[11px] md:text-sm mt-0.5">
              Selesaikan transaksi <span className="font-bold text-white uppercase">{order.product_name}</span> Anda.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-6 bg-slate-900/60 p-3 rounded-xl border border-white/5 shadow-inner">
          <div className="flex flex-col items-center min-w-17.5">
            <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Sisa Waktu</span>
            <span className="text-amber-400 font-black text-lg md:text-xl tracking-wider font-mono">
              {timeLeft || "00:00:00"}
            </span>
          </div>
          <button 
            onClick={() => router.push(`/checkout/pay/${order.order_id}`)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-2.5 px-5 md:px-6 rounded-lg text-xs md:text-sm transition-all active:scale-95 whitespace-nowrap shadow-md shadow-amber-500/20"
          >
            Bayar Sekarang
          </button>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const router = useRouter();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shortcutCategories, setShortcutCategories] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<{title: string, desc: string, type: 'success' | 'error'} | null>(null);

  // Helper untuk Auto-hide Toast (Diperlama jadi 12 detik agar sempat dibaca)
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 12000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  useEffect(() => {
    const checkMaintenanceAndData = async () => {
      try {
        // 1. Cek Maintenance (Ringan: Hanya ambil 1 kolom)
        const { data: settings } = await supabase
          .from('store_settings')
          .select('is_maintenance')
          .single();
        
        if (settings) setIsMaintenance(settings.is_maintenance);

        // 2. Tarik kategori shortcut
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name, slug, is_shortcut') 
          .eq('is_shortcut', true) 
          .order('name', { ascending: true });

        if (catData) setShortcutCategories(catData);

// 3. Logika Transaksi Terakhir (FILTER UNIK & LIMIT 4) [cite: 2026-02-11]
        const { data: { session } } = await supabase.auth.getSession();
        
        // Kita ambil 20 data terakhir buat bahan filter unik
let ordersQuery = supabase
          .from('orders')
          // WAJIB ada order_id untuk routing ke halaman checkout!
          .select('id, order_id, product_name, customer_no, status, created_at, payment_method, total_amount, category')
          .order('created_at', { ascending: false })
          .limit(20);

        // FUNGSI BARU: Pisahkan pengecekan transaksi Pending dan Filter Unik
        const processOrdersData = (ordersToProcess: any[]) => {
          // 1. Cari transaksi yang masih pending
          const pending = ordersToProcess.find((o: any) => o.status?.toLowerCase() === 'pending');
          
          // SINKRONISASI: Jika tidak ada transaksi pending, bersihkan state banner
          if (pending) {
            setPendingOrder(pending);
          } else {
            setPendingOrder(null);
          }
          
          // 2. Jalankan filter unik untuk slider "Beli ini lagi"
          const unique = ordersToProcess.reduce((acc: any[], current: any) => {
            const isExist = acc.find((item: any) => item.product_name === current.product_name);
            if (!isExist && acc.length < 4) acc.push(current);
            return acc;
          }, []);
          setRecentOrders(unique);
        };

        if (session?.user?.email) {
          const { data: orders } = await ordersQuery.eq('email', session.user.email);
          if (orders) processOrdersData(orders);
        } else {
          // GUEST LOGIC: Prioritas baca LocalStorage dulu biar ngebut <50ms!
          const guestCache = localStorage.getItem('dapay_guest_history');
          let hasLocalData = false;

          if (guestCache) {
            try {
              const parsedCache = JSON.parse(guestCache);
              if (parsedCache && parsedCache.length > 0) {
                processOrdersData(parsedCache);
                hasLocalData = true;
              }
            } catch (e) {
              console.error("Gagal baca cache lokal Guest", e);
            }
          }

          // FALLBACK: Kalau cache kosong, tembak Supabase pakai Fingerprint ID
          if (!hasLocalData) {
            try {
              const fpPromise = await FingerprintJS.load();
              const fpResult = await fpPromise.get();
              
              const { data: orders } = await ordersQuery.eq('device_id', fpResult.visitorId);
              
              if (orders && orders.length > 0) {
                processOrdersData(orders);
                localStorage.setItem('dapay_guest_history', JSON.stringify(orders));
              }
            } catch (fpError) {
              console.error("Device ID Error", fpError);
            }
          }
        }
      } catch (err) {
        console.error("Load error", err);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceAndData();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  if (isMaintenance) {
    const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
    if (userEmail !== "admin1@gmail.com") return <MaintenancePage />;
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'berhasil' || s === 'success') return 'text-emerald-400';
    if (s === 'pending') return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <main className="min-h-screen bg-[#0f172a]">
      <BannerCarousel />
      <CategoryShortcut categories={shortcutCategories} />

      {/* --- BANNER PENGINGAT PEMBAYARAN PENDING --- */}
      {pendingOrder && (
        <PendingPaymentBanner 
          order={pendingOrder} 
          router={router} 
          onResolved={(status) => {
            const isSuccess = status.toLowerCase() === 'berhasil' || status.toLowerCase() === 'success' || status.toLowerCase() === 'diproses';
            // Munculkan Pop-up Toast dengan bahasa yang lebih hangat
            setToastMsg({
              title: isSuccess ? "Terima Kasih, Kak! ✨" : "Waduh, Transaksi Batal 🥺",
              desc: isSuccess ? "Pembayaran sukses diterima. Pesanannya sedang kami siapkan ya." : "Waktu bayarnya kedaluwarsa atau dibatalkan ya Kak.",
              type: isSuccess ? 'success' : 'error'
            });
            // Bersihkan banner kuning dari layar
            setPendingOrder(null); 
          }}
        />
      )}

{/* --- FITUR QUICK RE-ORDER (COMPACT & PROPORTIONAL) --- */}
      {recentOrders.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-12 mb-6 mt-4 relative z-20">
          <div className="mb-3">
            <h2 className="text-white font-bold text-base sm:text-xl flex items-center gap-1.5">
              Beli ini lagi, yuk <span className="text-base sm:text-xl">👇</span>
            </h2>
          </div>
          
          <div className="flex gap-2.5 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
{recentOrders.map((order) => {
              // Logika Mapping Berdasarkan Kolom Category [cite: 2026-02-11]
          const getSlug = (order: any) => {
                // 0. Ambil kategori & nama produk dalam huruf kecil agar tidak sensitif huruf besar/kecil [cite: 2026-02-11]
                const cat = order.category?.toLowerCase() || "";
                const name = order.product_name?.toLowerCase() || "";

                // 1. Jalur PPOB/Tagihan (Berdasarkan Kategori) [cite: 2026-02-11]
                if (cat.includes('pascabayar')) return "pln-pascabayar";
                if (cat.includes('pln')) return "pln";

                // 2. Jalur Provider (Jika kategori adalah Pulsa/Data) [cite: 2026-02-11]
                if (cat.includes('pulsa') || cat.includes('data')) {
                  if (name.includes('telkomsel')) return "telkomsel";
                  if (name.includes('indosat')) return "indosat";
                  if (name.includes('xl')) return "xl";
                  if (name.includes('axis')) return "axis";
                  if (name.includes('tri')) return "tri";
                  if (name.includes('smartfren')) return "smartfren";
                }

                // 3. Jalur Game (Berdasarkan Kategori) [cite: 2026-02-11]
                if (cat.includes('game')) {
                  if (name.includes('free fire')) return "free-fire";
                  if (name.includes('mobile legends')) return "mobile-legends";
                  if (name.includes('call of duty') || name.includes('codm')) return "call-of-duty-mobile";
                  if (name.includes('valorant')) return "valorant";
                  if (name.includes('genshin')) return "genshin-impact";
                }

                // 4. Jalur Default / Lainnya (Gunakan kata pertama nama produk sebagai slug) [cite: 2026-02-11]
                return name.split(' ')[0]
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)+/g, '');
              };

              const slug = getSlug(order);
              
              // 1. SMART DETECTOR LOGO KATEGORI (UKURAN ICON JADI SIZE 14)
              const getCategoryIcon = (name: string) => {
                const lowerName = name.toLowerCase();
                if (lowerName.includes('pln') || lowerName.includes('listrik')) return <Zap size={14} className="text-yellow-400" />;
                if (lowerName.includes('pulsa') || lowerName.includes('telkomsel') || lowerName.includes('indosat') || lowerName.includes('xl') || lowerName.includes('axis') || lowerName.includes('tri') || lowerName.includes('smartfren')) return <Smartphone size={14} className="text-blue-400" />;
                if (lowerName.includes('data') || lowerName.includes('wifi') || lowerName.includes('internet')) return <Wifi size={14} className="text-emerald-400" />;
                if (lowerName.includes('netflix') || lowerName.includes('spotify') || lowerName.includes('youtube')) return <MonitorPlay size={14} className="text-rose-400" />;
                return <Gamepad2 size={14} className="text-purple-400" />; 
              };

              const getPaymentLogo = (method: string) => {
                const m = method?.toLowerCase() || '';
                if (m.includes('dana')) return '/payment/dana.png';
                if (m.includes('gopay') || m.includes('go-pay')) return '/payment/gopay.png';
                if (m.includes('ovo')) return '/payment/ovo.png';
                if (m.includes('shopee') || m.includes('spay')) return '/payment/shopeepay.png';
                if (m.includes('linkaja')) return '/payment/linkaja.png';
                if (m.includes('qris')) return '/payment/qris.png';
                if (m.includes('bca')) return '/payment/bca.png';
                if (m.includes('bni')) return '/payment/bni.png';
                if (m.includes('bri')) return '/payment/bri.png';
                if (m.includes('mandiri')) return '/payment/mandiri.png';
                return null;
              };

              const payLogo = getPaymentLogo(order.payment_method);

              return (
                <div
                  key={order.id}
                  // UPDATE LEBAR: Dipangkas drastis ke w-[165px] di HP agar seimbang dengan grid produk
                  className="group shrink-0 w-41.25 sm:w-55 bg-[#1e293b]/90 backdrop-blur-md border border-slate-700 p-2.5 rounded-2xl text-left hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all snap-start flex flex-col justify-between"
                >
                  {/* Bagian Atas: Logo & Info Produk */}
                  <div className="flex gap-2 items-center mb-2">
                    {/* Kotak Logo Diperkecil */}
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 shadow-inner">
                      {getCategoryIcon(order.product_name)}
                    </div>
                    <div className="min-w-0"> 
                      <p className="text-slate-300 font-medium text-[9px] sm:text-[11px] truncate">
                        {order.product_name}
                      </p>
                      <p className="text-white font-bold text-[11px] sm:text-sm leading-none mt-0.5">
                        Rp {(order.total_amount || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Bagian Bawah: Payment & Tombol */}
                  <div className="flex items-end justify-between mt-1 pt-1.5 border-t border-slate-700">
                    <div className="flex flex-col justify-center">
                      <div className="h-3 flex items-center mb-0.5">
                        {payLogo ? (
                          <img src={payLogo} alt={order.payment_method} className="h-2.5 object-contain opacity-90" />
                        ) : (
                          <div className="bg-blue-600 text-white text-[7px] px-1 py-0.5 rounded font-bold uppercase">
                            {order.payment_method || 'PAY'}
                          </div>
                        )}
                      </div>
                      <p className="text-[7px] text-slate-500 italic leading-none">
                        *harga terakhir
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => router.push(`/ProductSection/${slug}`)}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-[8px] sm:text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md active:scale-95 transition-all"
                    >
                      Beli lagi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

{/* --- PRODUCT SECTIONS (BERSIH) --- */}
      <ProductSection title="Populer Sekarang" category="popular" id="popular" />
      <ProductSection title="Game Top Up" category="game" id="game" />
      <ProductSection title="Voucher & Gift Card" category="voucher & gift card" id="voucher" />
      <ProductSection title="Entertainment & Subscription" category="entertainment & subscription" id="entertainment" />
      <ProductSection title="Pulsa & Data Seluler" category="pulsa & data seluler" id="pulsa" />
      <ProductSection title="Tagihan Prabayar" category="tagihan prabayar" id="prabayar" />
      <ProductSection title="Tagihan Pascabayar" category="tagihan pascabayar" id="pascabayar" />
      <ProductSection title="E-Wallet & Saldo" category="e-wallet & saldo" id="e-money" />
      <ProductSection title="Marketplace" category="marketplace" id="marketplace" />
      <ProductSection title="Sosial & Konten" category="social & konten" id="social" />
      <ProductSection title="Produktivitas & Software" category="productivity & software" id="productivity" />
      
      {/* INI TAMBAHANNYA BOS 👇 */}
      <ProductSection title="Travel & Perjalanan" category="travel" id="travel" />
      
      <ProductSection title="Digital Services" category="digital services" id="digital" />
      
{/* Floating Support Button & Menu */}
{/* Kita pakai bottom-[72px] biar pas nempel sejajar di atas menu bawah HP. 
          Kalau dirasa kurang turun/naik, bos tinggal ubah angka 72px itu (misal 65px atau 80px) */}
      <div className="fixed bottom-18 md:bottom-6 right-4 md:right-6 z-40 flex flex-col items-end">
{/* Menu Dropup (Ukurannya dikecilkan di HP, normal di Desktop) */}
        {isSupportMenuOpen && (
          <div className="mb-2 w-36 md:w-48 bg-[#2d2438] border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-700">
              <span className="text-white font-bold text-[11px] md:text-sm">Hubungi CS</span>
            </div>
            <div className="flex flex-col">
              <button 
                onClick={() => {
                  setIsSupportMenuOpen(false); // Tutup menu
                  setIsModalOpen(true); // Buka modal
                }}
                className="px-3 md:px-4 py-2.5 md:py-3 text-left text-slate-200 hover:bg-slate-700 transition-colors text-[11px] md:text-sm border-b border-slate-700/50"
              >
                Email
              </button>
              <a 
                href="https://wa.me/6285545213952" // JANGAN LUPA GANTI NOMOR WA BOS DI SINI!
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 md:px-4 py-2.5 md:py-3 text-left text-slate-200 hover:bg-slate-700 transition-colors text-[11px] md:text-sm"
              >
                Whatsapp
              </a>
            </div>
          </div>
        )}

        {/* Tombol Utama (Padding dan Teks lebih compact di HP) */}
        <button 
          onClick={() => setIsSupportMenuOpen(!isSupportMenuOpen)}
          className="flex items-center gap-1.5 md:gap-2 bg-[#5bc0de] hover:bg-[#46b8da] text-white px-3.5 py-2 md:px-5 md:py-3 rounded-lg md:rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 active:scale-95"
        >
          <Headset className="w-4 h-4 md:w-5 md:h-5" />
          <span className="font-bold text-[10px] md:text-sm tracking-wide">HUBUNGI CS</span>
        </button>
      </div>

      {/* Panggil Modalnya di sini */}
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* --- TOAST NOTIFICATION REALTIME --- */}
      {toastMsg && (
        <div 
          onClick={() => setToastMsg(null)}
          className="fixed top-20 right-4 md:right-8 z-9999 animate-in slide-in-from-top-5 fade-in duration-500 cursor-pointer"
        >
          {/* Animasi CSS Ringan Khusus Progress Bar */}
          <style>{`
            @keyframes shrink-bar {
              0% { width: 100%; }
              100% { width: 0%; }
            }
            .animate-shrink-bar {
              animation: shrink-bar 12s linear forwards;
            }
          `}</style>

          {/* Container Toast Dibikin Lebih Kecil (Kompak) dan overflow-hidden agar bar rapi di bawah */}
          <div className={`relative flex items-center gap-2.5 px-3.5 py-3 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border transition-transform active:scale-95 overflow-hidden ${
            toastMsg.type === 'success' ? 'bg-[#F0FDF4] border-[#A7F3D0]' : 'bg-[#FEF2F2] border-[#FECACA]'
          }`}>
            
            {/* Icon Diperkecil Sedikit */}
            {toastMsg.type === 'success' ? (
              <div className="bg-[#10B981] text-white rounded-full p-0.5 shrink-0"><CheckCircle2 size={14} /></div>
            ) : (
              <div className="bg-[#EF4444] text-white rounded-full p-0.5 shrink-0"><XCircle size={14} /></div>
            )}
            
            {/* Teks Lebih Padat */}
            <div className="flex flex-col min-w-0 pr-2">
              <span className={`text-[11px] font-black italic uppercase tracking-tight leading-none mb-0.5 ${toastMsg.type === 'success' ? 'text-[#047857]' : 'text-[#B91C1C]'}`}>
                {toastMsg.title}
              </span>
              <span className="text-[9px] font-bold text-slate-500 leading-tight">
                {toastMsg.desc}
              </span>
            </div>

            {/* --- Progress Bar Horizontal 12 Detik --- */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5">
              <div className={`h-full animate-shrink-bar ${toastMsg.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}></div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}