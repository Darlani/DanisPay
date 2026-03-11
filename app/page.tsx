"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import BannerCarousel from '@/components/BannerCarousel';
import ProductSection from '@/components/ProductSection';
import CategoryShortcut from '../components/CategoryShortcut';
import MaintenancePage from "@/utils/MaintenancePage"; 
import { Loader2, Settings, Clock, ChevronRight, Zap, Smartphone, Gamepad2, Wifi, MonitorPlay } from "lucide-react";
import FingerprintJS from '@fingerprintjs/fingerprintjs'; 

export default function Home() {
  const router = useRouter();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shortcutCategories, setShortcutCategories] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

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
          // Tambahkan category agar kita tahu alamat tujuannya Bos! [cite: 2026-02-11]
          .select('id, product_name, game_id, status, created_at, payment_method, total_amount, category')
          .order('created_at', { ascending: false })
          .limit(20);

        // Fungsi pembantu buat filter unik berdasarkan Nama Produk [cite: 2026-02-11]
        const filterUniqueOrders = (rawOrders: any[]) => {
          const unique = rawOrders.reduce((acc: any[], current) => {
            const isExist = acc.find(item => item.product_name === current.product_name);
            // Hanya masukkan jika belum ada di list DAN jumlahnya masih di bawah 4
            if (!isExist && acc.length < 4) acc.push(current);
            return acc;
          }, []);
          setRecentOrders(unique);
        };

        if (session?.user?.email) {
          const { data: orders } = await ordersQuery.eq('email', session.user.email);
          if (orders) filterUniqueOrders(orders);
        } else {
          try {
            const fpPromise = await FingerprintJS.load();
            const fpResult = await fpPromise.get();
            const { data: orders } = await ordersQuery.eq('device_id', fpResult.visitorId);
            if (orders) filterUniqueOrders(orders);
          } catch (fpError) {
            console.error("Device ID Error", fpError);
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
    </main>
  );
}