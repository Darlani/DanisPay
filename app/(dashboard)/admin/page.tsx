"use client";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { 
  LayoutDashboard, RefreshCw, Trash2, Check, 
  ShoppingBag, Search, Trophy, Crown, 
  Phone, Clock, X, Send,
  Package, FileText, Settings, AlertCircle, RotateCcw, Mail,
  TrendingUp, User, Loader2
} from "lucide-react";
import SidebarAdmin from "./SidebarAdmin";
import { supabase } from "@/utils/supabaseClient";
import { STORE_CONFIG } from "@/utils/storeConfig";
import AnalyticsView from "./analytics/AnalyticsView";
import CategoryManagement from "./categories/CategoryManagement";
import ProductManagement from "./products/ProductManagement";
import TeamManagement from "./team/TeamManagement";
import EventView from "./events/EventView";
import ExploreView from "./explore/ExploreView";
import HistoryView from "./history/HistoryView";
import SettingsView from "./settings/SettingsView"; 
import WithdrawManagement from "./withdraw/WithdrawManagement";
import DepositManagement from "./deposit/DepositManagement";
import PaymentManagement from "./payment/PaymentManagement";

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [selectedOrder, setSelectedOrder] = useState<any>(null); 
  
  const [searchTermOrders, setSearchTermOrders] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const handleMenuChange = (menu: string) => setActiveMenu(menu);
  const [activeCategory, setActiveCategory] = useState("All");
  const isFirstRender = useRef(true);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [withdraws, setWithdraws] = useState<any[]>([]); 
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [cooldown, setCooldown] = useState(0); // State hitung mundur [cite: 2026-03-06] // State untuk loading detektif [cite: 2026-03-06] 

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: dataOrders, error: orderError } = await supabase
          .from('orders')
          .select(`*, profiles!referred_by (full_name, email)`)
          .order('created_at', { ascending: false });

      if (orderError) throw orderError;
      setOrders(dataOrders || []);

      const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin') 
          .order('balance', { ascending: false });
      setUsers(profilesData || []);

      const { data: logsData, error: logError } = await supabase
          .from('balance_logs')
          .select('*');
      
      if (logError) throw logError;
      setAllLogs(logsData || []);

      const { data: withdrawData } = await supabase
          .from('withdrawals')
          .select('*');
      setWithdraws(withdrawData || []);

    } catch (err) { 
      console.error("Error Fetching Data:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role?.toLowerCase(); 
      const hasAccess = userRole === 'admin' || userRole === 'manager';

      if (!hasAccess) {
        router.push("/user"); 
      }
    };

    checkAdmin();
  }, [router]); 

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'balance_logs' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const element = document.getElementById("order-history-table");
    if (element) {
      setTimeout(() => { element.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
    }
  }, [activeCategory]);

  const filteredData = useMemo(() => {
    const now = new Date();
    let data = orders;
    if (dateFilter === "today") data = data.filter(o => new Date(o.created_at).toDateString() === now.toDateString());
    if (dateFilter === "week") data = data.filter(o => new Date(o.created_at) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    return data;
  }, [orders, dateFilter]);

  const stats = useMemo(() => {
    const isSuccess = (status: string) => ['Berhasil', 'Selesai', 'Success', 'Paid', 'settlement'].includes(status);
    const success = filteredData.filter(o => isSuccess(o.status));
    
    const income = success.reduce((sum, o) => sum + (Number(o.price) || 0) + (Number(o.used_balance) || 0), 0);
    const totalModal = success.reduce((sum, o) => sum + (Number(o.buy_price) || 0), 0);
    const totalMarginGross = income - totalModal;

    return { 
      income, 
      totalModal, 
      totalMarginGross, 
      totalCount: success.length,
      leaderboard: [...users].slice(0, 5) 
    };
  }, [filteredData, users]);

  const financeStats = useMemo(() => {
    const isSuccess = (status: string) => ['Berhasil', 'Selesai', 'Success', 'Paid', 'settlement'].includes(status);
    
    const totalPayoutGranted = allLogs
      .filter(l => ['Commission', 'Cashback', 'Referral'].includes(l.type))
      .reduce((sum, l) => sum + Math.abs(Number(l.amount) || 0), 0);

    const totalActualWithdraw = withdraws
      .filter(w => isSuccess(w.status))
      .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

    const totalUpgradeFee = allLogs.reduce((sum, l) => sum + (Number(l.upgrade_fee) || 0), 0);
    const totalAdminFeeWD = withdraws.filter(w => isSuccess(w.status)).reduce((sum, w) => sum + (Number(w.admin_fee) || 0), 0);

    const realNetProfit = (stats.totalMarginGross + totalUpgradeFee + totalAdminFeeWD) - totalPayoutGranted;

    return { totalPayoutGranted, totalActualWithdraw, realNetProfit };
  }, [allLogs, withdraws, stats.totalMarginGross]);

  const displayOrders = useMemo(() => {
    return filteredData.filter(o => {
      const matchesSearch = 
        o.order_id?.toLowerCase().includes(searchTermOrders.toLowerCase()) || 
        o.product_name?.toLowerCase().includes(searchTermOrders.toLowerCase()) ||
        o.email?.toLowerCase().includes(searchTermOrders.toLowerCase());
      if (activeCategory === "All") return matchesSearch;
      return matchesSearch && o.category?.toLowerCase() === activeCategory.toLowerCase();
    });
  }, [filteredData, searchTermOrders, activeCategory]);

  // --- LOGIKA UPDATE STATUS RESPONSIF (OPTIMISTIC UI) ---
  const handleUpdateStatus = async (id: string, newStatus: string, userEmail: string) => {
    // 1. Ubah UI secara instan (0 detik delay)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    setSelectedOrder(null); // Modal langsung ditutup

    // 2. Kirim data ke server secara background
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch('/api/orders/manage', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ id, status: newStatus, email: userEmail }),
    });

if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.error || "Gagal update status!");
      fetchData(); 
    }
  };

  // --- LOGIKA JEMPUT BOLA (CEK STATUS DIGIFLAZZ) --- [cite: 2026-03-06]
const handleCheckStatus = async (orderId: string) => {
    setIsCheckingStatus(true);
    try {
      // Alamat baru setelah pindah folder [cite: 2026-03-06]
      const res = await fetch('/api/digiflazz/check-status', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      });

      const result = await res.json();
      
      if (res.ok) {
        // Beri tahu hasil detektif lewat notifikasi sederhana (alert)
        alert(`🕵️ Detektif Lapor: Status di Supplier adalah [${result.status}]. Database sudah diperbarui!`);
        fetchData(); // Segarkan tabel agar status terbaru muncul
        setSelectedOrder(null); // Tutup modal
      } else {
        alert("❌ Detektif Gagal: " + (result.error || "Server Busy"));
      }
    } catch (err) {
      alert("💀 Koneksi Terputus saat cek status!");
    } finally {
      setIsCheckingStatus(false);
      setCooldown(60); // Mulai hitung mundur 60 detik setelah aksi selesai [cite: 2026-03-06]
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus permanen?")) return;
    const res = await fetch('/api/orders', { method: 'DELETE', body: JSON.stringify({ id }) });
    if (res.ok) { setSelectedOrder(null); fetchData(); }
  };

  // --- LOGIKA TIMER COOLDOWN --- [cite: 2026-03-06]
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen font-sans text-slate-600">
      <SidebarAdmin isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? "md:ml-64" : "md:ml-20"}`}>
        <Navbar isSidebarOpen={isSidebarOpen} />

        <main className="flex-1 p-6 lg:p-12">
          <div className="max-w-400 mx-auto space-y-10">
            
          {/* MODAL VALIDASI TRANSAKSI */}
            {selectedOrder && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />
                <div className="relative bg-white w-full max-w-xl rounded-[50px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-black italic uppercase">
                  <div className="p-8 pb-0 flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl text-slate-800 tracking-tighter font-black">VALIDASI TRANSAKSI</h3>
                      <p className="text-[10px] text-blue-600 tracking-widest">ID: #{selectedOrder.order_id}</p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100">
                        <p className="text-[9px] text-slate-400 mb-2 flex items-center gap-2"><Package size={12}/> DETAIL PRODUK</p>
                        <p className="text-xs text-slate-800 truncate">{selectedOrder.product_name}</p>
                        <p className="text-[10px] text-blue-600 mt-1">{selectedOrder.item_label}</p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100">
                        <p className="text-[9px] text-slate-400 mb-2 flex items-center gap-2"><User size={12}/> CUSTOMER</p>
                        <p className="text-[10px] text-slate-800 lowercase truncate">{selectedOrder.email}</p>
                        <p className="text-[10px] text-slate-500 mt-1 tracking-widest">{selectedOrder.user_contact}</p>
                      </div>
                    </div>
                    
                    {/* INI KOTAK HITAM (FINANCE) */}
                    {(() => {
                      const hargaJual = (selectedOrder.price || 0) + (selectedOrder.used_balance || 0);
                      
                      const cashback = selectedOrder.cashback || 0; 
                      const referral = selectedOrder.referral_commission || 0;
                      const discount = selectedOrder.discount || 0;
                      const voucher = selectedOrder.voucher || 0;
                      
                      const koinPaid = selectedOrder.used_balance || 0;
                      const transferPaid = selectedOrder.price || 0;
                      
                      const modalVendor = selectedOrder.buy_price || (hargaJual - 1500);
                      
                      const profitBersih = hargaJual - modalVendor - cashback - referral - discount - voucher;

                      return (
                        <div className="bg-slate-900 p-6 rounded-[35px] text-white space-y-4">
                          <div className="flex justify-between items-center text-[11px] border-b border-slate-800 pb-3 font-bold">
                            <span className="text-slate-400 uppercase">HARGA JUAL</span>
                            <span className="text-white text-base tracking-tight">Rp {hargaJual.toLocaleString('id-ID')}</span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[9px] not-italic">
                              <span className="text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-slate-700">REAL MODAL VENDOR</span>
                              <span className="text-rose-400">- Rp {modalVendor.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] not-italic">
                              <span className="text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-slate-700">CASHBACK MEMBER</span>
                              <span className="text-rose-400">- Rp {cashback.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] not-italic">
                              <span className="text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-slate-700">KOMISI REFERRAL</span>
                              <span className="text-rose-400">- Rp {referral.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] not-italic">
                              <span className="text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-slate-700">DISCOUNT PROMO</span>
                              <span className="text-rose-400">- Rp {discount.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] not-italic">
                              <span className="text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-slate-700">DISCOUNT VOUCHER</span>
                              <span className="text-rose-400">- Rp {voucher.toLocaleString('id-ID')}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800 space-y-2">
                            <div className="flex justify-between items-center text-[9px] not-italic">
                              <span className="text-amber-400 uppercase tracking-widest">DIBAYAR PAKAI KOIN</span>
                              <span className="text-amber-400 font-bold">Rp {koinPaid.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] not-italic">
                              <span className="text-blue-400 uppercase tracking-widest">DIBAYAR TRANSFER</span>
                              <span className="text-blue-400 font-bold">Rp {transferPaid.toLocaleString('id-ID')}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl mt-4 font-black italic">
                            <span className="text-emerald-400 flex items-center gap-2 uppercase tracking-widest"><TrendingUp size={14}/> PROFIT BERSIH</span>
                            <span className="text-emerald-400 text-xl tracking-tighter">Rp {profitBersih.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      );
                    })()}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Berhasil', selectedOrder.email)} className="flex flex-col items-center justify-center gap-1.5 p-4 bg-emerald-500 text-white rounded-[25px] hover:bg-emerald-600 transition-all shadow-lg font-black italic uppercase">
                        <div className="flex items-center gap-2"><Check size={18} /> BERHASIL</div>
                        <span className="text-[9px] font-medium normal-case tracking-widest opacity-90">(Produk Sendiri)</span>
                      </button>
                      
                      <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Diproses', selectedOrder.email)} className="flex flex-col items-center justify-center gap-1.5 p-4 bg-blue-500 text-white rounded-[25px] hover:bg-blue-600 transition-all shadow-lg font-black italic uppercase">
                        <div className="flex items-center gap-2"><Send size={18} /> DIPROSES</div>
                        <span className="text-[9px] font-medium normal-case tracking-widest opacity-90">(Tembak Provider)</span>
                      </button>

                      <button onClick={() => handleUpdateStatus(selectedOrder.id, 'Gagal', selectedOrder.email)} className="flex flex-col items-center justify-center gap-1.5 p-4 bg-rose-500 text-white rounded-[25px] hover:bg-rose-600 transition-all shadow-lg font-black italic uppercase">
<div className="flex items-center gap-2"><AlertCircle size={18} /> GAGAL</div>
                        <span className="text-[9px] font-medium normal-case tracking-widest opacity-90">(Tolak Transaksi)</span>
                      </button>
                    </div>

{/* TOMBOL CEK STATUS (DETEKTIF) */}
                    {(selectedOrder.status === 'Diproses' || selectedOrder.status === 'Pending') && (
                      <button 
                        onClick={() => handleCheckStatus(selectedOrder.order_id)}
                        disabled={isCheckingStatus || cooldown > 0}
                        className={`w-full mt-4 flex items-center justify-center gap-3 p-4 rounded-[25px] transition-all border font-black italic uppercase text-xs ${
                          cooldown > 0 
                          ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed" 
                          : "bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border-slate-200 hover:border-blue-200"
                        }`}
                      >
                        {isCheckingStatus ? (
                          <div className="flex items-center gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            <span>MENGHUBUNGI SUPPLIER...</span>
                          </div>
                        ) : cooldown > 0 ? (
                          <div className="flex items-center gap-2">
                            <Clock size={18} className="animate-pulse" />
                            <span>COOLDOWN ({cooldown}S)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <RotateCcw size={18} />
                            <span>JEMPUT BOLA (CEK STATUS SUPPLIER)</span>
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeMenu === "Dashboard" && (
              <>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 font-black italic uppercase text-slate-800">
                  <div><h2 className="text-3xl tracking-tight italic">FINANCE HUB</h2><p className="text-xs text-slate-400 normal-case font-medium italic">Sistem Administrasi Otomatis Danish Top Up.</p></div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm text-[10px]">
                      {['all', 'today', 'week'].map((f) => (
                        <button key={f} onClick={() => setDateFilter(f)} className={`px-4 py-2 rounded-xl transition-all ${dateFilter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{f === 'all' ? 'SEMUA' : f === 'today' ? 'HARI INI' : '7 HARI'}</button>
                      ))}
                    </div>
                    <button onClick={fetchData} className="p-4 bg-white border border-slate-100 rounded-2xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm outline-none border-none font-black italic"><RefreshCw size={20} className={loading ? "animate-spin" : ""} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10 font-black italic uppercase text-slate-900">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] text-slate-400 mb-1 tracking-widest uppercase">Modal Vendor</p>
                    <h3 className="text-xl tracking-tighter">Rp {stats.totalModal.toLocaleString()}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] text-slate-400 mb-1 tracking-widest uppercase">Gross Income</p>
                    <h3 className="text-xl tracking-tighter">Rp {stats.income.toLocaleString()}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-amber-600">
                    <p className="text-[9px] mb-1 tracking-widest uppercase text-slate-400">Total Rewards</p>
                    <h3 className="text-xl tracking-tighter">Rp {financeStats.totalPayoutGranted.toLocaleString()}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-rose-500">
                    <p className="text-[9px] mb-1 tracking-widest uppercase text-slate-400">Total Cash Out</p>
                    <h3 className="text-xl tracking-tighter">Rp {financeStats.totalActualWithdraw.toLocaleString()}</h3>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-800">
                    <p className="text-[9px] text-blue-400 mb-1 tracking-widest uppercase">Profit Murni</p>
                    <h3 className="text-xl text-white tracking-tighter">Rp {financeStats.realNetProfit.toLocaleString()}</h3>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] rounded-[40px] p-10 border border-white shadow-2xl mb-12 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h4 className="text-slate-900 text-xl font-black tracking-tight flex items-center gap-3"><div className="p-2 bg-amber-500 rounded-lg text-white shadow-lg shadow-amber-200"><Trophy size={24} /></div>TOP PERFORMER</h4>
                        <p className="text-slate-400 text-xs mt-1 font-medium ml-12 italic">Kontribusi member terbaik bulan ini</p>
                      </div>
                      <Crown size={32} className="text-amber-300 drop-shadow-md" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      {stats.leaderboard.map((m, i) => (
                        <div key={i} className={`relative group bg-white/80 backdrop-blur-sm p-6 rounded-[35px] border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center ${i === 0 ? "border-amber-200 ring-2 ring-amber-500/10 shadow-amber-100" : "border-slate-100 shadow-sm"}`}>
                          <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shadow-lg ${i === 0 ? "bg-amber-400 text-white" : "bg-white text-slate-400 border border-slate-100"}`}>{i === 0 ? <Crown size={18} /> : i + 1}</div>
                          <div className={`mt-4 mb-4 p-4 rounded-full ${i === 0 ? "bg-amber-50" : "bg-slate-50"}`}><User size={32} className={i === 0 ? "text-amber-500" : "text-slate-300"} /></div>
                          <h5 className="text-sm text-slate-800 font-black mb-1 not-italic truncate w-full px-2 text-center uppercase">{m.full_name || "Guest User"}</h5>
                          <div className={`w-full py-3 px-4 rounded-2xl flex flex-col items-center transition-colors ${i === 0 ? "bg-amber-500 text-white shadow-inner" : "bg-slate-50 text-slate-800"}`}><span className={`text-[8px] font-bold uppercase tracking-widest mb-0.5 ${i === 0 ? "text-amber-100" : "text-slate-400"}`}>Current Balance</span><span className={`text-sm font-black not-italic ${i === 0 ? "text-white" : "text-emerald-600"}`}>Rp {(m.balance || 0).toLocaleString()}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabel Riwayat Order */}
                <div id="order-history-table" className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden font-black italic uppercase text-slate-900">
                  <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h4 className="text-slate-800 text-sm uppercase italic font-black tracking-widest">RECENT ORDERS ({displayOrders.length})</h4>
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input type="text" placeholder="CARI ORDER / USER / HP..." className="w-full bg-slate-50 border border-slate-100 pl-9 pr-4 py-3 rounded-xl outline-none focus:border-blue-500 text-[10px] font-black" value={searchTermOrders} onChange={(e) => setSearchTermOrders(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2 px-8">
                    {['All', 'Game', 'PPOB', 'Entertainment', 'Travel', 'Productivity', 'Sosial', 'Digital', 'Other'].map((cat) => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all border shrink-0 ${activeCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                          <span>{cat}</span>
                        </button>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/50">
                        <tr className="text-[11px] text-slate-900 font-black tracking-wider uppercase">
                          <th className="px-6 py-4">ID Order</th>
                          <th className="px-6 py-4">Produk & Item</th>
                          <th className="px-6 py-4">Info Pelanggan</th>
                          <th className="px-6 py-4">Metode & Harga</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Waktu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 italic">
                        {displayOrders.length > 0 ? displayOrders.map((order) => (
                          <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                            <td className="px-6 py-4 font-black text-blue-600 text-xs">#{order.order_id?.slice(-8)}</td>
                            <td className="px-6 py-4"><div className="flex flex-col"><span className="font-black text-slate-900 text-sm">{order.product_name}</span><span className="text-[10px] text-slate-400">{order.item_label || '-'}</span></div></td>
                            <td className="p-6"><div className="flex flex-col gap-1 tracking-normal"><span className="flex items-center gap-1.5 font-black text-slate-900 lowercase not-italic">{order.email}</span><span className="text-slate-400 text-[11px] not-italic">{order.user_contact || '-'}</span></div></td>
                            <td className="px-6 py-4"><div className="flex flex-col"><span className="font-black text-slate-900 text-sm">Rp {((order.price || 0) + (order.used_balance || 0)).toLocaleString()}</span><span className="text-[10px] text-blue-500 font-black uppercase tracking-tighter">{order.payment_method || 'SALDO'}</span></div></td>
                            <td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black inline-block ${order.status === 'Berhasil' ? 'bg-emerald-100 text-emerald-600' : order.status === 'Diproses' ? 'bg-blue-100 text-blue-600' : order.status === 'Gagal' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>{order.status || 'PENDING'}</span></td>
                            <td className="px-6 py-4 text-right text-slate-500 text-[10px] font-black">{new Date(order.created_at).toLocaleString('id-ID')}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={6} className="py-24 text-center">Data Kosong</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Render Menu Lain */}
            {activeMenu === "Analytics" && <AnalyticsView />}
            {activeMenu === "Category" && <CategoryManagement />}
            {activeMenu === "Products" && <ProductManagement />}
            {activeMenu === "Team" && <TeamManagement />}
            {activeMenu === "Event" && <EventView />}
            {activeMenu === "Explore" && <ExploreView />}
            {activeMenu === "History" && <HistoryView />}
            {activeMenu === "Withdraw" && <WithdrawManagement />}
            {activeMenu === "Deposit" && <DepositManagement />}
            {activeMenu === "Payment" && <PaymentManagement />}
            {activeMenu === "Settings" && <SettingsView />}
          </div>
        </main>
      </div>
    </div>
  );
}