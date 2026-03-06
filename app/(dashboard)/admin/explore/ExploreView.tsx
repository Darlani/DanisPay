"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { 
  Search, TrendingUp, Package, Gem, Medal, Crown, 
  Wallet, Landmark, Gift, Percent, Ticket, UserCircle, UserX, 
  FileSpreadsheet, FileText, Loader2, ArrowRight, Star, Users, Calendar 
} from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- KOMPONEN BRANDING DAPAY ---
const DaPayText = () => (
  <span className="font-black italic ml-1">
    <span className="text-[#FFC107]">Da</span><span className="text-[#2962FF]">Pay</span>
  </span>
);

type ExploreCategory = 
  | 'Produk' | 'Paket' | 'Item' | 'Upgrade' 
  | 'Member_Special' | 'Member_Regular' 
  | 'Belanja_Member' | 'Belanja_Guest' 
  | 'Deposit' | 'Cashout' | 'Komisi' | 'Admin_WD' | 'Voucher';

type DateFilter = 'Semua' | 'Hari Ini' | 'Bulan Ini' | 'Tahun Ini';

export default function ExploreView() {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<ExploreCategory>('Produk');
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('Semua');

  // --- 1. FUNGSI AMBIL DATA ---
  const fetchExploreData = async () => {
    setLoading(true);
    setData([]); 
    try {
      let startDate = new Date();
      let qExplore = supabase.from('explore_reports').select('*');
      let qOrders = supabase.from('orders').select('*');
      let qLogs = supabase.from('balance_logs').select('*');
      let qDeposits = supabase.from('deposits').select('*');
      let qWithdraw = supabase.from('withdrawals').select('*');
      let qProfiles = supabase.from('profiles').select('*').neq('role', 'admin');

      if (dateFilter !== 'Semua') {
        if (dateFilter === 'Hari Ini') startDate.setHours(0, 0, 0, 0);
        else if (dateFilter === 'Bulan Ini') startDate.setDate(1);
        else if (dateFilter === 'Tahun Ini') startDate.setMonth(0, 1);
        const isoDate = startDate.toISOString();
        qExplore = qExplore.gte('created_at', isoDate);
        qOrders = qOrders.gte('created_at', isoDate);
        qLogs = qLogs.gte('created_at', isoDate);
        qDeposits = qDeposits.gte('created_at', isoDate);
        qWithdraw = qWithdraw.gte('created_at', isoDate);
      }

      const [exploreRes, profilesRes, ordersRes, logsRes, depositsRes, withdrawRes] = await Promise.all([
        qExplore, qProfiles, qOrders, qLogs, qDeposits, qWithdraw
      ]);

      const rawExplore = exploreRes.data || [];
      const rawProfiles = profilesRes.data || [];
      const rawOrders = ordersRes.data || [];
      const rawLogs = logsRes.data || [];

      // --- LOGIKA PEMETAAN DATA ---
      if (['Produk', 'Paket', 'Item'].includes(category)) {
        const grouped = rawExplore.reduce((acc: any, curr: any) => {
          const statusOk = ['BERHASIL', 'SUCCESS', 'SELESAI', 'PAID', 'SETTLEMENT'].includes(curr.status?.toUpperCase());
          if (!statusOk) return acc;

          let key = category === 'Produk' ? (curr.category || 'LAINNYA') : 
                    category === 'Paket' ? (curr.product_name || 'UNKNOWN') : 
                    (`${curr.item_label} - ${curr.product_name}`);
          
          let desc = category === 'Item' ? (curr.item_label || 'ITEM') : key;
          let subDesc = category === 'Produk' ? 'GENERAL' : 
                        category === 'Paket' ? (curr.category || 'PRODUCT') : 
                        (curr.product_name || 'PACKAGE');

          acc[key] = acc[key] || { name: desc, item_desc: desc, package_name: subDesc, count: 0, total_jual: 0, total_hpp: 0, total_profit: 0 };
          acc[key].count += 1;
          acc[key].total_jual += (curr.jual_final || 0) + (curr.used_balance || 0);
          acc[key].total_hpp += curr.hpp || 0;
          acc[key].total_profit += curr.profit_rp || 0;
          return acc;
        }, {});
        setData(Object.values(grouped).sort((a: any, b: any) => b.count - a.count));
      } 
      else if (category === 'Member_Special' || category === 'Member_Regular') {
        const isSpecial = category === 'Member_Special';
        const filtered = rawProfiles.filter(p => {
          const type = p.member_type?.toLowerCase();
          return isSpecial ? type === 'special' : (type === 'regular' || !type);
        });

        const mapped = filtered.map(p => {
          const trxCount = rawExplore.filter(exp => 
            exp.email?.toLowerCase() === p.email?.toLowerCase() &&
            ['BERHASIL', 'SUCCESS', 'PAID', 'SETTLEMENT'].includes(exp.status?.toUpperCase())
          ).length;
          return { email: p.email, name: p.full_name, type: p.member_type || 'Regular', metric_val: p.balance, created_at: p.created_at, trx_count: trxCount };
        });
        setData(mapped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      else if (category === 'Belanja_Member') {
        const memberOrders = rawOrders.filter(o => o.email && o.email !== 'null');
        setData(memberOrders.map(o => ({ package_name: o.email, item_desc: `${o.item_label} ${o.product_name}`, jual: o.total_amount || o.price, created_at: o.created_at, status: o.status })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      else if (category === 'Belanja_Guest') {
        const guestOrders = rawOrders.filter(o => !o.email || o.email === 'null');
        setData(guestOrders.map(o => ({ package_name: 'NON-MEMBER (GUEST)', item_desc: `${o.item_label} ${o.product_name}`, jual: o.total_amount || o.price, created_at: o.created_at, status: o.status })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      else if (category === 'Voucher') {
        const voucherOrders = rawOrders.filter(o => (o.voucher_amount || 0) > 0);
        const grouped = voucherOrders.reduce((acc: any, curr: any) => {
          const key = curr.voucher_code || 'PROMO';
          if (!acc[key]) acc[key] = { name: key, count: 0, total_jual: 0, created_at: curr.created_at, status: 'BERHASIL' };
          acc[key].count += 1;
          acc[key].total_jual += curr.voucher_amount || 0;
          if (new Date(curr.created_at) > new Date(acc[key].created_at)) acc[key].created_at = curr.created_at;
          return acc;
        }, {});
        setData(Object.values(grouped).sort((a: any, b: any) => b.count - a.count));
      }
      else if (category === 'Upgrade') {
        const upgradeData = rawLogs.filter(l => (l.upgrade_fee || 0) > 0);
        setData(upgradeData.map(u => ({ package_name: u.description, item_desc: 'UPGRADE LEVEL', jual: u.upgrade_fee, created_at: u.created_at, status: 'BERHASIL' })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      else if (category === 'Komisi') {
        const komisiData = rawLogs.filter(l => ['Commission', 'Cashback', 'Referral'].includes(l.type));
        setData(komisiData.map(l => ({ package_name: l.user_email, item_desc: l.description, jual: Math.abs(l.amount), created_at: l.created_at, status: 'BERHASIL' })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      else if (category === 'Admin_WD') {
        const feeWDData = (withdrawRes.data || []).filter(w => (w.admin_fee || 0) > 0);
        setData(feeWDData.map(w => ({ package_name: w.email, item_desc: 'FEE ADMIN WD', jual: w.admin_fee, created_at: w.created_at, status: w.status })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      else if (category === 'Deposit') {
        setData((depositsRes.data || []).map(d => ({ package_name: d.user_email, item_desc: 'DEPO: ' + d.payment_name, jual: d.amount, created_at: d.created_at, status: d.status })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      else if (category === 'Cashout') {
        setData((withdrawRes.data || []).map(w => ({ package_name: w.email, item_desc: 'WD: ' + w.bank_name, jual: w.amount, created_at: w.created_at, status: w.status })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (err) {
      console.error("Gagal load data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExploreData();
    setShowAll(false);
  }, [category, dateFilter]);

  // --- 2. HELPERS ---
  const filteredData = data.filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const displayData = showAll ? filteredData : filteredData.slice(0, 10);
  const formatDateIndo = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // --- 3. RENDER TABLE ---
  const renderTableContent = () => {
    if (['Produk', 'Paket', 'Item'].includes(category)) {
      return (
        <>
          <thead className="bg-slate-900 text-white text-[9px] tracking-widest uppercase italic font-black">
            <tr>
              <th className="p-5 border-r border-white/10 w-20 text-center">RANK</th>
              <th className="p-5 border-r border-white/10 text-left">Deskripsi</th>
              <th className="p-5 border-r border-white/10 text-left">Kategori</th>
              <th className="p-5 border-r border-white/10 text-center">Qty Sold</th>
              <th className="p-5 border-r border-white/10 text-right">Modal</th>
              <th className="p-5 border-r border-white/10 text-right">Harga Jual</th>
              <th className="p-5 text-right bg-emerald-950">Net Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 italic">
            {displayData.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-all font-black text-slate-900">
                <td className="p-5 border-r border-slate-50 text-center">{i < 3 && !showAll ? <Medal size={20} className="mx-auto text-amber-500" /> : <span>#{i+1}</span>}</td>
                <td className="p-5 border-r border-slate-50 text-[10px] uppercase text-left">{item.item_desc}</td>
                <td className="p-5 border-r border-slate-50 text-[10px] uppercase text-left text-slate-700">{item.package_name}</td>
                <td className="p-5 border-r border-slate-50 text-center text-[10px]">{item.count}X</td>
                <td className="p-5 border-r border-slate-50 text-right text-[10px] text-slate-600">Rp {Math.round(item.total_hpp).toLocaleString()}</td>
                <td className="p-5 border-r border-slate-50 text-right text-[10px]">Rp {Math.round(item.total_jual).toLocaleString()}</td>
                <td className="p-5 text-right text-[10px] text-emerald-700 bg-emerald-50/20 font-black">Rp {Math.round(item.total_profit).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </>
      );
    }

    if (['Member_Special', 'Member_Regular'].includes(category)) {
      return (
        <>
          <thead className="bg-slate-900 text-white text-[9px] tracking-widest uppercase italic font-black">
            <tr>
              <th className="p-5 border-r border-white/10 w-20 text-center">RANK</th>
              <th className="p-5 border-r border-white/10 text-left">Profil Member</th>
              <th className="p-5 border-r border-white/10 text-center">Join Date</th>
              <th className="p-5 border-r border-white/10 text-center">QTY TRX</th>
              <th className="p-5 border-r border-white/10 text-center">Status</th>
              <th className="p-5 text-right bg-emerald-950">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 italic">
            {displayData.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-all font-black text-slate-900">
                <td className="p-5 border-r border-slate-50 text-center font-black">#{i+1}</td>
                <td className="p-5 border-r border-slate-50 text-[10px] uppercase text-left"><div>{item.name}</div><div className="text-[8px] text-slate-600 lowercase">{item.email}</div></td>
                <td className="p-5 border-r border-slate-50 text-center text-[9px] text-slate-600">{formatDateIndo(item.created_at)}</td>
                <td className="p-5 border-r border-slate-50 text-center text-[10px] font-black">{item.trx_count}X</td>
                <td className="p-5 border-r border-slate-50 text-center text-[10px] uppercase"><span className={item.type?.toLowerCase() === 'special' ? 'text-amber-600 px-2 py-1 bg-amber-50 rounded-md border border-amber-200' : 'text-slate-900'}>{item.type}</span></td>
                <td className="p-5 text-right text-[10px] text-emerald-700 font-black">Rp {Math.round(item.metric_val).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </>
      );
    }

    if (category === 'Voucher') {
      return (
        <>
          <thead className="bg-slate-900 text-white text-[9px] tracking-widest uppercase italic font-black">
            <tr>
              <th className="p-5 border-r border-white/10 w-20 text-center">RANK</th>
              <th className="p-5 border-r border-white/10 text-left">Kode Voucher</th>
              <th className="p-5 border-r border-white/10 text-center">QTY</th>
              <th className="p-5 border-r border-white/10 text-center">Terakhir Digunakan</th>
              <th className="p-5 border-r border-white/10 text-center">Status</th>
              <th className="p-5 text-right bg-slate-800">Total Potongan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 italic">
            {displayData.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-all font-black text-slate-900">
                <td className="p-5 border-r border-slate-50 text-center">#{i+1}</td>
                <td className="p-5 border-r border-slate-50 text-[10px] uppercase text-left">{item.name}</td>
                <td className="p-5 border-r border-slate-50 text-center text-[10px]">{item.count}X</td>
                <td className="p-5 border-r border-slate-50 text-center text-[8px] text-slate-600 font-black">{formatDateIndo(item.created_at)}</td>
                <td className="p-5 border-r border-slate-50 text-center"><span className="bg-emerald-100 text-emerald-700 text-[8px] px-2 py-1 rounded font-black uppercase">BERHASIL</span></td>
                <td className="p-5 text-right text-[10px] font-black">Rp {Math.round(item.total_jual).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </>
      );
    }

    return (
      <>
        <thead className="bg-slate-900 text-white text-[9px] tracking-widest uppercase italic font-black">
          <tr>
            <th className="p-5 border-r border-white/10 w-20 text-center">NO</th>
            <th className="p-5 border-r border-white/10 text-left">User / Member</th>
            <th className="p-5 border-r border-white/10 text-left">Keterangan</th>
            <th className="p-5 border-r border-white/10 text-center">Tanggal</th>
            <th className="p-5 border-r border-white/10 text-center">Status</th>
            <th className="p-5 text-right bg-slate-800">Nominal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 italic">
          {displayData.map((item, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-all font-black text-slate-900">
              <td className="p-5 border-r border-slate-50 text-center text-[10px]">#{i+1}</td>
              <td className="p-5 border-r border-slate-50 text-[10px] uppercase text-left">{item.package_name || 'SYSTEM'}</td>
              <td className="p-5 border-r border-slate-50 text-[10px] uppercase text-left text-slate-700">{item.item_desc}</td>
              <td className="p-5 border-r border-slate-50 text-center text-[8px] text-slate-600 font-black">{formatDateIndo(item.created_at)}</td>
              <td className="p-5 border-r border-slate-50 text-center">
                <span className={`text-[8px] px-2 py-1 rounded font-black uppercase ${['BERHASIL', 'SUCCESS', 'PAID', 'SETTLEMENT'].includes(item.status?.toUpperCase()) ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                  {['SUCCESS', 'PAID', 'SETTLEMENT'].includes(item.status?.toUpperCase()) ? 'BERHASIL' : (item.status || 'BERHASIL')}
                </span>
              </td>
              <td className="p-5 text-right text-[10px] font-black">Rp {Math.round(item.jual || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-20 font-black italic uppercase text-slate-900">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl tracking-tighter text-slate-900 flex items-center gap-4 font-black">
            EXPLORE DATABASE <Crown className="text-amber-500 animate-bounce" size={32} />
          </h2>
          <p className="text-[10px] text-slate-900 mt-2 tracking-widest leading-relaxed uppercase">AUDIT 360°: <DaPayText /> SYSTEM</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <ExploreCard active={category === 'Produk'} onClick={() => setCategory('Produk')} label="Top Produk" icon={<TrendingUp size={16}/>} color="blue" />
        <ExploreCard active={category === 'Paket'} onClick={() => setCategory('Paket')} label="Top Paket" icon={<Package size={16}/>} color="indigo" />
        <ExploreCard active={category === 'Item'} onClick={() => setCategory('Item')} label="Top Item" icon={<Gem size={16}/>} color="cyan" />
        <ExploreCard active={category === 'Member_Special'} onClick={() => setCategory('Member_Special')} label="Member Special" icon={<Star size={16}/>} color="amber" />
        <ExploreCard active={category === 'Member_Regular'} onClick={() => setCategory('Member_Regular')} label="Member Regular" icon={<Users size={16}/>} color="emerald" />
        <ExploreCard active={category === 'Belanja_Member'} onClick={() => setCategory('Belanja_Member')} label="Belanja Member" icon={<UserCircle size={16}/>} color="indigo" />
        <ExploreCard active={category === 'Belanja_Guest'} onClick={() => setCategory('Belanja_Guest')} label="Belanja Guest" icon={<UserX size={16}/>} color="slate" />
        <ExploreCard active={category === 'Deposit'} onClick={() => setCategory('Deposit')} label="Riwayat Depo" icon={<Wallet size={16}/>} color="emerald" />
        <ExploreCard active={category === 'Cashout'} onClick={() => setCategory('Cashout')} label="Riwayat WD" icon={<Landmark size={16}/>} color="rose" />
        <ExploreCard active={category === 'Upgrade'} onClick={() => setCategory('Upgrade')} label="Upgrade" icon={<ArrowRight size={16}/>} color="slate" />
        <ExploreCard active={category === 'Komisi'} onClick={() => setCategory('Komisi')} label="Komisi User" icon={<Gift size={16}/>} color="orange" />
        <ExploreCard active={category === 'Admin_WD'} onClick={() => setCategory('Admin_WD')} label="Fee WD" icon={<Percent size={16}/>} color="amber" />
        <ExploreCard active={category === 'Voucher'} onClick={() => setCategory('Voucher')} label="Voucher" icon={<Ticket size={16}/>} color="rose" />
      </div>

      <div className="bg-white p-2 rounded-[40px] border-2 border-slate-900 shadow-2xl overflow-hidden">
        <div className="p-6 bg-slate-100 flex flex-col md:flex-row items-center gap-4 rounded-t-[35px] border-b-2 border-slate-900">
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border-2 border-slate-900 w-full md:w-auto">
            <Calendar size={18} className="text-slate-900" />
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)} className="bg-transparent outline-none font-black text-[10px] text-slate-900 uppercase cursor-pointer">
              <option value="Semua">Semua Waktu</option>
              <option value="Hari Ini">Hari Ini</option>
              <option value="Bulan Ini">Bulan Ini</option>
              <option value="Tahun Ini">Tahun Ini</option>
            </select>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border-2 border-slate-900 flex-1 w-full">
            <Search size={18} className="text-slate-900" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="CARI DATA DATABASE..." className="bg-transparent w-full outline-none font-black text-xs text-slate-900 uppercase placeholder:text-slate-400" />
          </div>
        </div>

        <div className="min-h-80">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 text-slate-900 gap-4"><Loader2 className="animate-spin text-blue-600" size={32} /><p className="text-[10px] font-black tracking-[0.4em]">SYNCING DATA...</p></div>
          ) : displayData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                {renderTableContent()}
              </table>
            </div>
          ) : (
            <div className="py-40 text-center"><p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">Belum ada data tersedia...</p></div>
          )}
        </div>

        {filteredData.length > 10 && (
          <div className="p-6 bg-slate-100 flex justify-center border-t-2 border-slate-900">
            <button onClick={() => setShowAll(!showAll)} className="px-8 py-3 bg-white border-2 border-slate-900 rounded-2xl text-[10px] font-black tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-md active:scale-95">
              {showAll ? "SEMBUNYIKAN DATA" : `LIHAT SEMUA DATA (${filteredData.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExploreCard({ active, onClick, label, icon, color }: any) {
  const colors: any = {
    blue: "text-blue-600 border-blue-200 bg-blue-50",
    indigo: "text-indigo-600 border-indigo-200 bg-indigo-50",
    cyan: "text-cyan-600 border-cyan-200 bg-cyan-50",
    emerald: "text-emerald-600 border-emerald-200 bg-emerald-50",
    rose: "text-rose-600 border-rose-200 bg-rose-50",
    orange: "text-orange-600 border-orange-200 bg-orange-50",
    amber: "text-amber-600 border-amber-200 bg-amber-50",
    slate: "text-slate-700 border-slate-300 bg-slate-100",
  };
  return (
    <div onClick={onClick} className={`p-4 rounded-[25px] border-2 transition-all cursor-pointer flex flex-col items-center gap-2 ${active ? `${colors[color]} shadow-xl scale-105 border-slate-900` : "bg-white border-slate-200 grayscale-0 hover:border-slate-400"}`}>
      <div className={`p-2 bg-white rounded-xl shadow-sm border ${active ? 'border-slate-900' : 'border-slate-100'}`}>{icon}</div>
      <span className="text-[8px] font-black tracking-tighter uppercase italic text-center leading-none">{label}</span>
    </div>
  );
}