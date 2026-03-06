"use client";
import { useEffect, useMemo, useState } from "react";
import { 
  ShoppingBag, Gift, Copy, RefreshCw, LogOut, Wallet, History, 
  ArrowUpRight, CheckCircle2, X, PlusCircle, CreditCard, Loader2 
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import MaintenancePage from "@/utils/MaintenancePage";

export default function UserDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDomain, setCurrentDomain] = useState("");
  const [referrals, setReferrals] = useState<any[]>([]); 
  const [memberType, setMemberType] = useState("Reguler");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [balanceLogs, setBalanceLogs] = useState<any[]>([]);
  const [userData, setUserData] = useState({
    email: "",
    name: "",
    refCode: "",
    balance: 0 
  });

  // STATE MODALS & INPUTS
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("QRIS");
  const [bankName, setBankName] = useState("");
  const [accNumber, setAccNumber] = useState("");
  const [accName, setAccName] = useState("");
  
  // STATE DATA COLLECTIONS
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [isProcessingDepo, setIsProcessingDepo] = useState(false);

  // STATE TOGGLE "LIHAT SEMUA"
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showAllDeposits, setShowAllDeposits] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [showAllReferrals, setShowAllReferrals] = useState(false);

  // --- LOGIKA PERHITUNGAN ---
  const totalLifetimeEarned = useMemo(() => {
    return balanceLogs
      .filter(log => log.amount > 0 && ['Cashback', 'Referral', 'Commission'].includes(log.type)) 
      .reduce((sum, log) => sum + log.amount, 0);
  }, [balanceLogs]);

  const totalWithdrawn = useMemo(() => {
    return withdrawals
      .filter(wd => wd.status === 'Success')
      .reduce((sum, wd) => sum + wd.amount, 0);
  }, [withdrawals]);

  const pendingWithdrawAmount = useMemo(() => {
    return withdrawals
      .filter(wd => wd.status === 'Pending')
      .reduce((sum, wd) => sum + (wd.held_amount || 0), 0);
  }, [withdrawals]);

  // --- FUNGSI AMBIL DATA ---
  const fetchMyDeposits = async (email: string) => {
    try {
      const { data, error } = await supabase.from("deposits").select("*").eq("user_email", email).order("created_at", { ascending: false });
      if (data) setDeposits(data);
    } catch (err) { console.error("Gagal ambil deposit:", err); }
  };

  const fetchMyWithdrawals = async (email: string) => {
    try {
      const { data, error } = await supabase.from("withdrawals").select("*").eq("user_email", email).order("created_at", { ascending: false });
      if (data) setWithdrawals(data);
    } catch (err) { console.error("Gagal ambil WD:", err); }
  };

  const fetchMyReferrals = async (refCode: string) => {
    try {
      const res = await fetch(`/api/orders/manage/referrals?refCode=${refCode}`);
      const data = await res.json();
      setReferrals(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Gagal ambil referral:", err); }
  };

  const fetchBalanceLogs = async (email: string) => {
    try {
      const { data, error } = await supabase.from("balance_logs").select("*").eq("user_email", email).order("created_at", { ascending: false });
      if (data) setBalanceLogs(data);
    } catch (err) { console.error("Gagal ambil log:", err); }
  };

  const fetchUserProfile = async (email: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("full_name, balance, referral_code, member_type").eq("email", email).single();
      if (data) {
        setUserData(prev => ({ ...prev, name: data.full_name, balance: data.balance || 0, refCode: data.referral_code }));
        setMemberType(data.member_type || "Reguler"); 
        if (data.referral_code) fetchMyReferrals(data.referral_code);
      }
    } catch (err) { console.error("Gagal ambil profil:", err); }
  };

  const fetchMyOrders = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/manage?email=${email}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Gagal ambil order:", err); } 
    finally { setLoading(false); }
  };

  // --- ACTION HANDLERS ---
const handleDepositRequest = async () => {
    if (depositAmount < 10000) return alert("Minimal deposit Rp10.000");
    setIsProcessingDepo(true); // Mulai proteksi tombol
    try {
      const res = await fetch('/api/member/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          amount: depositAmount,
          paymentMethod: paymentMethod
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      alert("Permintaan deposit terkirim! Silakan hubungi admin atau tunggu verifikasi.");
      setShowDepositModal(false);
      // Data akan update otomatis via Realtime Listener lo
    } catch (err: any) {
      alert(err.message || "Gagal proses deposit.");
    } finally {
      setIsProcessingDepo(false); // Lepas proteksi tombol
    }
  };

  const handleWithdrawRequest = async () => {
    if (withdrawAmount < 10000) return alert("Minimal penarikan Rp10.000");
    setLoading(true); // Proteksi loading
    try {
      const res = await fetch('/api/member/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          amount: withdrawAmount,
          bankName,
          accNumber,
          accName
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      alert(`Berhasil! Saldo Rp${(withdrawAmount + 2500).toLocaleString()} ditahan sementara.`);
      setShowWithdrawModal(false);
      // Data akan update otomatis via Realtime Listener yang sudah lo pasang
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

// --- STATE MAINTENANCE ---
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");
    const isUser = localStorage.getItem("isUser");
    if (isUser !== "true" || !userEmail) { window.location.href = "/login"; return; }
    if (typeof window !== "undefined") setCurrentDomain(window.location.origin);
    setUserData(prev => ({ ...prev, email: userEmail }));

    // --- TAMBAHAN: CEK MAINTENANCE ---
    const checkMaintenance = async () => {
      const { data } = await supabase.from('store_settings').select('is_maintenance').single();
      if (data?.is_maintenance) {
        setIsMaintenance(true);
        setLoading(false); // Matikan loading agar MaintenancePage muncul
      }
    };
    checkMaintenance();

    // --- REALTIME LISTENER (TETAP ADA) ---
    const channel = supabase
      .channel('db-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `email=eq.${userEmail}` }, 
        (payload) => { 
          setUserData(prev => ({ ...prev, balance: payload.new.balance })); 
          fetchBalanceLogs(userEmail); // Refresh log otomatis saat saldo berubah
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'balance_logs', filter: `user_email=eq.${userEmail}` },
        () => { fetchBalanceLogs(userEmail); fetchUserProfile(userEmail); }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits', filter: `user_email=eq.${userEmail}` },
        () => { fetchMyDeposits(userEmail); fetchUserProfile(userEmail); }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `user_email=eq.${userEmail}` },
        () => { fetchMyWithdrawals(userEmail); fetchUserProfile(userEmail); }
      )
      .subscribe();

    fetchUserProfile(userEmail);
    fetchMyOrders(userEmail);
    fetchBalanceLogs(userEmail);
    fetchMyWithdrawals(userEmail);
    fetchMyDeposits(userEmail);

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = () => { localStorage.clear(); window.location.href = "/login"; };

const handleUpgradeMember = async () => {
    setIsUpgrading(true);
    try {
      const res = await fetch('/api/member/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userData.email })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Terjadi kesalahan sistem');

      alert("SELAMAT! Anda sekarang adalah SPECIAL MEMBER.");
      setMemberType("Special");
      setUserData(prev => ({ ...prev, balance: result.newBalance }));
      setShowUpgradeModal(false);
    } catch (err: any) { // <-- Tambahkan ': any' di sini agar merahnya hilang
      alert(err.message || "Gagal proses upgrade."); 
    } finally { 
      setIsUpgrading(false); 
    }
  };

  const referralLink = `${currentDomain}/ref/${userData.refCode}`;

// --- 1. GERBANG MAINTENANCE ---
  if (isMaintenance) {
    return <MaintenancePage />;
  }

  // --- 2. LOADING STATE ---
  if (loading && !isMaintenance) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  // --- 3. DASHBOARD NORMAL ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-12 font-sans antialiased text-slate-900 pb-24">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-10 flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2 italic">Official Member Dashboard</p>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
              HALO, <span className="text-slate-700">{userData.name.split(' ')[0]}</span>
            </h2>
            <div className="flex items-center gap-2 mt-3">
              {memberType === "Special" ? (
                <span className="px-3 py-1 bg-linear-to-r from-amber-500 to-orange-600 text-white text-[9px] font-black rounded-full shadow-lg uppercase tracking-widest animate-pulse">SPECIAL MEMBER</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-200 text-slate-600 text-[9px] font-bold rounded-md uppercase tracking-wider">REGULER MEMBER</span>
                  <button onClick={() => setShowUpgradeModal(true)} className="text-[9px] font-black text-blue-600 underline uppercase tracking-tighter italic">Upgrade</button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { fetchMyOrders(userData.email); fetchUserProfile(userData.email); }} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:text-blue-600 active:scale-90 transition-all"><RefreshCw size={20} className={loading ? "animate-spin" : ""} /></button>
            <button onClick={handleLogout} className="p-3 bg-white border border-slate-200 text-red-500 rounded-2xl shadow-sm hover:bg-red-50 active:scale-90"><LogOut size={20} /></button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600"><ShoppingBag size={24} /></div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Belanja</p>
            <h3 className="text-4xl font-black italic text-slate-900 tracking-tighter">{orders.length} <span className="text-sm font-bold text-slate-300 ml-1">Order</span></h3>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
             <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Tersedia</p>
                  <h3 className="text-4xl font-black italic text-amber-500 tracking-tighter">Rp{Number(userData.balance).toLocaleString()}</h3>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setShowDepositModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 flex items-center gap-2"><PlusCircle size={16} /> Isi Saldo</button>
                  <button onClick={() => setShowWithdrawModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 flex items-center gap-2"><ArrowUpRight size={16} /> Tarik</button>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 mt-4 pt-6 border-t border-slate-50">
                <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100/50">
                  <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Pendapatan</p>
                  <h4 className="text-sm font-black italic text-emerald-700">Rp{totalLifetimeEarned.toLocaleString()}</h4>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Penarikan</p>
                  <h4 className="text-sm font-black italic text-slate-500">Rp{totalWithdrawn.toLocaleString()}</h4>
                  {pendingWithdrawAmount > 0 && <p className="text-[7px] font-black text-amber-600 uppercase mt-1 animate-pulse">Pending: Rp{pendingWithdrawAmount.toLocaleString()}</p>}
                </div>
             </div>
          </div>
        </div>

        {/* REFERRAL BOX */}
        <div className="bg-slate-900 rounded-[40px] p-8 mb-12 text-white shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h4 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3 justify-center md:justify-start mb-2"><Gift className="text-blue-400" size={24} /> PUSAT AFILIASI</h4>
              <p className="text-slate-400 text-xs font-medium max-w-xs uppercase">Bagikan link & terima komisi otomatis.</p>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-3 pl-6 rounded-3xl border border-white/10 w-full md:w-auto">
              <code className="text-xs font-bold text-blue-400 lowercase">{referralLink.slice(0, 30)}...</code>
              <button onClick={() => {navigator.clipboard.writeText(referralLink); alert("Disalin!");}} className="p-4 bg-blue-600 rounded-2xl active:scale-90"><Copy size={18} /></button>
            </div>
          </div>
        </div>

        {/* 1. RIWAYAT DEPOSIT */}
        <div className="flex items-center gap-3 mb-6 mt-12"><div className="h-0.5 w-8 bg-emerald-500"></div><h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] italic flex items-center gap-2"><CreditCard size={16} className="text-emerald-500"/> Riwayat Deposit</h4></div>
        <div className="grid grid-cols-1 gap-3 mb-4">
          {deposits.length === 0 ? <EmptyState text="Belum ada riwayat deposit" /> : (showAllDeposits ? deposits : deposits.slice(0, 3)).map((d) => (
            <div key={d.id} className="bg-white px-8 py-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
              <div className="flex items-center gap-5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${d.status === 'Success' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}><PlusCircle size={18}/></div>
                <div><p className="font-black text-slate-800 uppercase italic text-sm tracking-tight leading-none">Isi Saldo via {d.payment_method}</p><p className="text-[9px] text-slate-400 font-bold mt-2 uppercase">{new Date(d.created_at).toLocaleString('id-ID')}</p></div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black italic tracking-tighter text-emerald-500">+Rp{d.amount.toLocaleString()}</p>
                <p className={`text-[8px] font-black uppercase mt-1 italic ${d.status === 'Success' ? 'text-emerald-500' : 'text-amber-500'}`}>{d.status}</p>
              </div>
            </div>
          ))}
          {deposits.length > 3 && <button onClick={() => setShowAllDeposits(!showAllDeposits)} className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-900 transition-all italic underline">{showAllDeposits ? "Sembunyikan" : `Lihat Semua (${deposits.length})`}</button>}
        </div>

        {/* 2. RIWAYAT TRANSAKSI */}
        <div className="flex items-center gap-3 mb-6 mt-12"><div className="h-0.5 w-8 bg-blue-600"></div><h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] italic flex items-center gap-2"><History size={16} /> Riwayat Transaksi</h4></div>
        <div className="grid grid-cols-1 gap-3 mb-4">
          {orders.length === 0 ? <EmptyState text="Belum ada aktivitas belanja" /> : (showAllOrders ? orders : orders.slice(0, 3)).map((order) => (
            <div key={order.id} className="bg-white px-8 py-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
              <div className="flex-1">
                <p className="font-black text-slate-800 uppercase italic text-xl tracking-tight leading-none">{order.product_name}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-lg uppercase tracking-widest">#{order.order_id?.slice(-8)}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(order.created_at).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black italic tracking-tighter text-blue-600 leading-none">Rp{order.price?.toLocaleString()}</p>
                <p className={`text-[9px] font-black uppercase mt-2 italic ${['Berhasil', 'Selesai'].includes(order.status) ? 'text-green-500' : 'text-amber-500'}`}>{order.status || 'Pending'}</p>
              </div>
            </div>
          ))}
          {orders.length > 3 && <button onClick={() => setShowAllOrders(!showAllOrders)} className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-900 transition-all italic underline">{showAllOrders ? "Sembunyikan" : `Lihat Semua (${orders.length})`}</button>}
        </div>

        {/* 3. RIWAYAT SALDO & CUAN */}
        <div className="flex items-center gap-3 mb-6 mt-12"><div className="h-0.5 w-8 bg-emerald-500"></div><h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] italic flex items-center gap-2"><Wallet size={16} className="text-emerald-500" /> Riwayat Saldo & Cuan</h4></div>
        <div className="grid grid-cols-1 gap-3 mb-4">
          {balanceLogs.length === 0 ? <EmptyState text="Belum ada saldo masuk terekam" /> : (showAllLogs ? balanceLogs : balanceLogs.slice(0, 3)).map((log) => {
            let icon = <Gift size={18} />; let bgColor = "bg-emerald-50 text-emerald-600"; let badgeColor = "bg-emerald-600";
            if (log.type === 'Cashback') { icon = <ShoppingBag size={18} />; bgColor = "bg-blue-50 text-blue-600"; badgeColor = "bg-blue-600"; }
            else if (log.type === 'Withdraw') { icon = <ArrowUpRight size={18} />; bgColor = "bg-rose-50 text-rose-600"; badgeColor = "bg-rose-600"; }
            else if (log.type === 'Refund') { icon = <RefreshCw size={18} />; bgColor = "bg-amber-50 text-amber-600"; badgeColor = "bg-amber-600"; }
            return (
              <div key={log.id} className="bg-white px-8 py-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
                <div className="flex items-center gap-5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bgColor}`}>{icon}</div>
                  <div>
                    <p className="font-black text-slate-800 uppercase italic text-sm tracking-tight leading-none">{log.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest text-white ${badgeColor}`}>{log.type}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(log.created_at).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right"><p className={`text-lg font-black italic tracking-tighter leading-none ${log.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{log.amount > 0 ? '+' : ''}Rp{log.amount.toLocaleString()}</p></div>
              </div>
            );
          })}
          {balanceLogs.length > 3 && <button onClick={() => setShowAllLogs(!showAllLogs)} className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-900 transition-all italic underline">{showAllLogs ? "Sembunyikan" : `Lihat Semua (${balanceLogs.length})`}</button>}
        </div>

        {/* 4. JARINGAN AFILIASI */}
        <div className="flex items-center gap-3 mb-6 mt-12"><div className="h-0.5 w-8 bg-amber-500"></div><h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] italic flex items-center gap-2"><Gift size={16} className="text-amber-500" /> Jaringan Afiliasi Saya</h4></div>
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden mb-4">
          {referrals.length === 0 ? <div className="p-10 text-center"><p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">Belum ada teman yang bergabung</p></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Member</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Join Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(showAllReferrals ? referrals : referrals.slice(0, 3)).map((ref, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-slate-700 uppercase group-hover:text-blue-600 transition-colors">{ref.full_name || 'Member Baru'}</p>
                        <p className="text-[10px] text-slate-400 font-bold lowercase">{ref.email}</p>
                      </td>
                      <td className="px-6 py-4 text-right"><span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{new Date(ref.created_at).toLocaleDateString('id-ID')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {referrals.length > 3 && <button onClick={() => setShowAllReferrals(!showAllReferrals)} className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-900 transition-all italic underline mb-16">{showAllReferrals ? "Sembunyikan" : `Lihat Semua (${referrals.length})`}</button>}

        <p className="text-center mt-20 text-[9px] font-bold text-slate-300 uppercase tracking-[0.5em] italic pb-10">&copy; 2026 DANISHTOPUP OFFICIAL PARTNER</p>
      </div>

      {/* MODAL DEPOSIT */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in zoom-in-95">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative border border-slate-100">
            <button onClick={() => setShowDepositModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors"><X size={24}/></button>
            <h3 className="text-3xl font-black italic uppercase text-slate-900 mb-2 tracking-tighter">ISI SALDO</h3>
            <div className="space-y-6 mt-8">
              <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} className="w-full p-5 bg-slate-50 rounded-2xl font-black outline-none focus:border-emerald-500 border-2 border-transparent transition-all" placeholder="Nominal Deposit" />
              <div className="grid grid-cols-2 gap-3">
                {['QRIS', 'BANK BCA', 'DANA', 'OVO'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${paymentMethod === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100'}`}>{m}</button>
                ))}
              </div>
              <button 
                onClick={handleDepositRequest} 
                disabled={isProcessingDepo} 
                className="w-full py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase italic tracking-widest hover:bg-emerald-600 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessingDepo ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Sabar Bos...</span>
                  </>
                ) : (
                  "Ajukan Deposit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TARIK SALDO */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in zoom-in-95">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative border border-slate-100">
            <button onClick={() => setShowWithdrawModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><X/></button>
            <h3 className="text-3xl font-black italic uppercase text-slate-900 mb-6 tracking-tighter">TARIK SALDO</h3>
            <div className="space-y-4">
              <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none focus:border-blue-500 border-2 border-transparent" placeholder="Nominal" />
              <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none" placeholder="Bank / E-Wallet" />
              <input type="text" value={accNumber} onChange={(e) => setAccNumber(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none" placeholder="Nomor Rekening" />
              <input type="text" value={accName} onChange={(e) => setAccName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none" placeholder="Atas Nama" />
              <button 
              onClick={handleWithdrawRequest} 
              disabled={loading} // <-- Gunakan state loading yang ada di handleWithdrawRequest
              className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase italic shadow-xl mt-4 hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Memproses WD...</span>
                </>
              ) : (
                "Kirim Pengajuan"
              )}
            </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPGRADE */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative border border-slate-100 text-center">
            <h3 className="text-3xl font-black italic uppercase text-slate-900 mb-8">Upgrade Status</h3>
            <div className="p-6 bg-amber-50 rounded-2xl border-2 border-dashed border-amber-200 mb-8">
              <p className="text-[10px] font-black text-amber-600 uppercase">Biaya Upgrade</p>
              <p className="text-2xl font-black italic text-slate-900">Rp50.000</p>
            </div>
            <button 
            onClick={handleUpgradeMember} 
            disabled={isUpgrading} 
            className="w-full py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase italic tracking-widest hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUpgrading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Processing...</span>
              </>
            ) : (
              "Upgrade Sekarang"
            )}
          </button>
            <button onClick={() => setShowUpgradeModal(false)} className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tutup</button>
          </div>
        </div>
      )}

    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-16 text-center bg-white rounded-[30px] border border-slate-100 border-dashed">
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">{text}</p>
    </div>
  );
}