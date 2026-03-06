"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { 
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip
} from "recharts";
import { TrendingUp, Loader2, Activity, FileSpreadsheet, FileText } from "lucide-react";
// Import untuk Export
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type TimeRange = '1W' | '1M' | '1Y' | 'ALL';

export default function AnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M'); 
  
  const [orders, setOrders] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [balanceLogs, setBalanceLogs] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]); 
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);

  useEffect(() => {
    fetchComprehensiveData();
  }, []); 

  const fetchComprehensiveData = async () => {
    setLoading(true);
    try {
      const [ordersRes, withdrawRes, profilesRes, logsRes, depositsRes, categoriesRes] = await Promise.all([
        supabase.from('orders').select('*'), 
        supabase.from('withdrawals').select('*'),
        supabase.from('profiles').select('*').neq('role', 'admin'),
        supabase.from('balance_logs').select('*'),
        supabase.from('deposits').select('*'),
        supabase.from('categories').select('*')
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (withdrawRes.data) setWithdrawals(withdrawRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (logsRes.data) setBalanceLogs(logsRes.data);
      if (depositsRes.data) setDeposits(depositsRes.data);
      if (categoriesRes.data) setCategoriesList(categoriesRes.data);
      
    } catch (err) {
      console.error("Gagal sinkronisasi analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const now = new Date();
    const start = new Date(now); 
    start.setHours(0, 0, 0, 0); 

    if (timeRange === '1W') {
      const day = start.getDay(); 
      const diff = day === 0 ? 6 : day - 1; 
      start.setDate(start.getDate() - diff);
    } 
    else if (timeRange === '1M') {
      start.setDate(1);
    } 
    else if (timeRange === '1Y') {
      start.setMonth(0, 1);
    } 
    else {
      start.setFullYear(2000);
    }
    return start;
  };

  useEffect(() => {
    if (orders.length > 0 || withdrawals.length > 0) {
        processCharts();
    }
  }, [orders, withdrawals, timeRange]);

  const processCharts = () => {
    const grouped: { [key: string]: { date: string, income: number, expense: number } } = {};
    const cutoff = getStartDate(); 
    const isSuccess = (status: string) => ['berhasil', 'success', 'selesai', 'paid', 'settlement'].includes(status?.toLowerCase());

    orders.forEach(o => {
      const d = new Date(o.created_at);
      if (d >= cutoff && isSuccess(o.status)) {
        const key = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        if (!grouped[key]) grouped[key] = { date: key, income: 0, expense: 0 };
        grouped[key].income += (Number(o.price) || 0);
      }
    });

    withdrawals.forEach(w => {
      const d = new Date(w.created_at);
      if (d >= cutoff && isSuccess(w.status)) {
        const key = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        if (!grouped[key]) grouped[key] = { date: key, income: 0, expense: 0 };
        grouped[key].expense += (Number(w.amount) || 0);
      }
    });

    const sortedData = Object.values(grouped).sort((a:any, b:any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setCashFlowData(sortedData);
  };

  const summary = useMemo(() => {
    const cutoff = getStartDate(); 
    const filteredOrders = orders.filter(o => new Date(o.created_at) >= cutoff);
    const filteredWithdrawals = withdrawals.filter(w => new Date(w.created_at) >= cutoff);
    const filteredDeposits = deposits.filter(d => new Date(d.created_at) >= cutoff);
    const filteredLogs = balanceLogs.filter(l => new Date(l.created_at) >= cutoff);

    const isSuccess = (status: string) => ['berhasil', 'success', 'selesai', 'paid', 'settlement'].includes(status?.toLowerCase());
    const successOrders = filteredOrders.filter(o => isSuccess(o.status));
    
    const omzetOrder = successOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const modalAwalTotal = successOrders.reduce((sum, o) => sum + (Number(o.buy_price) || 0), 0);
    const profitMarginGlobal = omzetOrder - modalAwalTotal;

    const totalDepositMember = filteredDeposits.filter(d => isSuccess(d.status)).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const totalBelanjaMember = successOrders.filter(o => o.email && typeof o.email === 'string' && o.email.trim().length > 0).reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const totalBelanjaNonMember = successOrders.filter(o => !o.email || o.email.trim() === "").reduce((sum, o) => sum + (Number(o.price) || 0), 0);

    const totalCommissionReferral = filteredLogs.filter(log => log.type === 'Commission' || log.type === 'Referral').reduce((sum, log) => sum + Math.abs(Number(log.amount) || 0), 0);
    const totalCashbackSpecial = filteredLogs.filter(log => log.type === 'Cashback').reduce((sum, log) => sum + Math.abs(Number(log.amount) || 0), 0);

    const totalVoucherPromo = successOrders.reduce((sum, o) => sum + (Number(o.voucher_amount) || 0), 0);
    const upgradeFee = filteredLogs.reduce((sum, log) => sum + (Number(log.upgrade_fee) || 0), 0);
    
    const adminFeeWithdraw = filteredWithdrawals.filter(w => isSuccess(w.status)).reduce((sum, w) => sum + (Number(w.admin_fee) || 0), 0);
    const keuntunganKumulatif = profitMarginGlobal + upgradeFee + adminFeeWithdraw;
    const totalCashOut = filteredWithdrawals.filter(w => isSuccess(w.status)).reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

    const categoryMap: { [key: string]: { omzet: number, modal: number, margin: number } } = {};
    categoriesList.forEach(cat => {
      categoryMap[cat.name.toUpperCase()] = { omzet: 0, modal: 0, margin: 0 };
    });

    successOrders.forEach(o => {
      const catName = o.category ? o.category.toUpperCase() : "LAINNYA (OTHER)";
      if (!categoryMap[catName]) categoryMap[catName] = { omzet: 0, modal: 0, margin: 0 };
      categoryMap[catName].omzet += (Number(o.price) || 0);
      categoryMap[catName].modal += (Number(o.buy_price) || 0);
      categoryMap[catName].margin = categoryMap[catName].omzet - categoryMap[catName].modal;
    });

    const performanceByCategory = Object.entries(categoryMap).map(([name, data]) => ({
      name, ...data
    })).sort((a, b) => b.omzet - a.omzet);

    const successOrdersCount = successOrders.length;
    const pendingCount = filteredOrders.filter(o => o.status === 'Pending').length;
    const failedCount = filteredOrders.length - successOrdersCount - pendingCount;

    return {
      omzetOrder, modalAwalTotal, profitMarginGlobal, upgradeFee, adminFeeWithdraw, keuntunganKumulatif,
      totalCommissionReferral, totalCashbackSpecial, totalVoucherPromo, totalDepositMember, totalBelanjaMember, totalBelanjaNonMember,
      memberCount: profiles.length, 
      performanceByCategory,
      successRate: filteredOrders.length > 0 ? Math.round((successOrdersCount / filteredOrders.length) * 100) : 0,
      totalCashOut,
      statusDistribution: [
        { name: 'Sukses', value: successOrdersCount, color: '#10B981' },
        { name: 'Pending', value: pendingCount, color: '#F59E0B' },
        { name: 'Gagal', value: failedCount, color: '#EF4444' }
      ]
    };
  }, [orders, withdrawals, profiles, balanceLogs, deposits, categoriesList, timeRange]);

  // --- FUNGSI EXPORT EXCEL ---
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Summary Keuangan
    const summaryData = [
        ["LAPORAN KEUANGAN DANISPAY"],
        ["Periode", timeRange],
        ["Tanggal Export", new Date().toLocaleString()],
        [],
        ["Keterangan", "Nilai (IDR)"],
        ["Total Omzet Order", summary.omzetOrder],
        ["Total Modal Awal", summary.modalAwalTotal],
        ["Total Deposit Member", summary.totalDepositMember],
        ["Total Cash Out", summary.totalCashOut],
        ["Belanja Member", summary.totalBelanjaMember],
        ["Belanja Non-Member", summary.totalBelanjaNonMember],
        ["Commission Referral", summary.totalCommissionReferral],
        ["Cashback Member Spesial", summary.totalCashbackSpecial],
        ["Admin Fee Withdraw", summary.adminFeeWithdraw],
        ["Promo Voucher", summary.totalVoucherPromo],
        ["Upgrade Fee Member", summary.upgradeFee],
        ["KEUNTUNGAN KUMULATIF", summary.keuntunganKumulatif],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan Keuangan");

    // Sheet 2: Performa Kategori
    const categoryData = [
        ["PERFORMA PER KATEGORI"],
        [],
        ["Kategori", "Omzet", "Modal", "Profit"],
        ...summary.performanceByCategory.map(cat => [cat.name, cat.omzet, cat.modal, cat.margin])
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(wb, ws2, "Performa Kategori");

    XLSX.writeFile(wb, `Laporan_DanisPay_${timeRange}_${new Date().getTime()}.xlsx`);
  };

  // --- FUNGSI EXPORT PDF ---
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Judul
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("DANISPAY FINANCIAL REPORT", pageWidth / 2, 20, { align: "center" });

    // Info Periode
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode: ${timeRange} | Tanggal Cetak: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: "center" });

    // Tabel Ringkasan
    autoTable(doc, {
        startY: 35,
        head: [["Deskripsi", "Nominal (Rp)"]],
        body: [
            ["Omzet Order", `Rp ${summary.omzetOrder.toLocaleString()}`],
            ["Modal Awal", `Rp ${summary.modalAwalTotal.toLocaleString()}`],
            ["Deposit Member", `Rp ${summary.totalDepositMember.toLocaleString()}`],
            ["Belanja Member", `Rp ${summary.totalBelanjaMember.toLocaleString()}`],
            ["Commission Referral", `Rp ${summary.totalCommissionReferral.toLocaleString()}`],
            ["Cashback Spesial", `Rp ${summary.totalCashbackSpecial.toLocaleString()}`],
            ["Upgrade Member Fee", `Rp ${summary.upgradeFee.toLocaleString()}`],
            ["KEUNTUNGAN BERSIH", `Rp ${summary.keuntunganKumulatif.toLocaleString()}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] } // Warna slate-900
    });

    // Tabel Kategori
    doc.text("Rincian Performa Kategori", 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [["Kategori", "Omzet", "Modal", "Profit"]],
        body: summary.performanceByCategory.map(cat => [
            cat.name, 
            `Rp ${cat.omzet.toLocaleString()}`, 
            `Rp ${cat.modal.toLocaleString()}`, 
            `Rp ${cat.margin.toLocaleString()}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] } // Warna emerald-500
    });

    doc.save(`Laporan_DanisPay_${timeRange}.pdf`);
  };

  if (loading) return <div className="h-96 flex flex-col items-center justify-center text-slate-900 gap-4"><Loader2 className="animate-spin text-blue-600" size={32}/><p className="font-black italic uppercase tracking-widest text-xs">SINKRONISASI KEUANGAN DANISPAY...</p></div>;

  return (
    <div className="animate-in fade-in duration-700 font-black italic uppercase text-slate-900 pb-20">
      
      {/* HEADER SECTION DENGAN TOMBOL EXPORT */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-4xl tracking-tighter flex items-center gap-3 font-black text-slate-900">
            <span className="bg-slate-900 text-white p-2.5 rounded-xl"><Activity size={28} /></span>
            FINANCIAL ANALYTICS
          </h2>
          <p className="text-xs text-slate-700 mt-2 font-black tracking-widest">
            {timeRange === 'ALL' ? 'DATA KESELURUHAN (ALL TIME)' : 
             timeRange === '1W' ? 'MINGGU INI (SENIN - MINGGU)' : 
             timeRange === '1M' ? 'BULAN INI (TGL 1 - SEKARANG)' : 'TAHUN INI (JAN - DES)'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
            {/* Tombol Export */}
            <div className="flex gap-2 mr-4">
                <button onClick={exportToExcel} className="bg-emerald-100 text-emerald-700 border-2 border-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-emerald-700 hover:text-white transition-all">
                    <FileSpreadsheet size={16}/> EXCEL
                </button>
                <button onClick={exportToPDF} className="bg-rose-100 text-rose-700 border-2 border-rose-700 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-rose-700 hover:text-white transition-all">
                    <FileText size={16}/> PDF
                </button>
            </div>

            {/* Filter Waktu */}
            <div className="flex bg-white p-1.5 rounded-xl border-2 border-slate-900">
            {(['1W', '1M', '1Y', 'ALL'] as TimeRange[]).map((range) => (
                <button key={range} onClick={() => setTimeRange(range)} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${timeRange === range ? 'bg-slate-900 text-white' : 'text-slate-900 hover:bg-slate-100'}`}>
                    {range === 'ALL' ? 'SEMUA' : range === '1W' ? 'MINGGU INI' : range === '1M' ? 'BULAN INI' : 'TAHUN INI'}
                </button>
            ))}
            </div>
        </div>
      </div>

      {/* --- BAGIAN STAT CARD, KEUNTUNGAN, TABEL, DAN GRAFIK TETAP SAMA SEPERTI SEBELUMNYA --- */}
      {/* (Copy dari kodingan terakhir Bos untuk bagian bawahnya agar UI tidak berubah) */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard title="Omzet Order" value={summary.omzetOrder} color="border-emerald-300" text="text-emerald-700" />
        <StatCard title="Modal Awal Total" value={summary.modalAwalTotal} color="border-slate-400" text="text-slate-900" />
        <StatCard title="Total Deposit Member" value={summary.totalDepositMember} color="border-cyan-300" text="text-cyan-700" />
        <StatCard title="Total Cash Out" value={summary.totalCashOut} color="border-rose-300" text="text-rose-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard title="Belanja Member" value={summary.totalBelanjaMember} color="border-blue-300" text="text-blue-700" />
        <StatCard title="Belanja Non-Member" value={summary.totalBelanjaNonMember} color="border-slate-400" text="text-slate-800" />
        <StatCard title="Commission Referral" value={summary.totalCommissionReferral} color="border-orange-300" text="text-orange-700" />
        <StatCard title="Cashback Member Spesial" value={summary.totalCashbackSpecial} color="border-yellow-400" text="text-yellow-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <StatCard title="Komisi Admin WD" value={summary.adminFeeWithdraw} color="border-indigo-300" text="text-indigo-700" />
        <StatCard title="Total Promo Voucher" value={summary.totalVoucherPromo} color="border-pink-300" text="text-pink-700" />
        <StatCard title="Upgrade Member Fee" value={summary.upgradeFee} color="border-amber-300" text="text-amber-700" />
      </div>

      <div className="bg-slate-900 p-10 rounded-[40px] shadow-2xl border-4 border-slate-900 mb-10 flex justify-between items-center transition-all hover:scale-[1.01]">
        <div>
          <p className="text-xs text-emerald-400 tracking-[0.4em] mb-3 font-black uppercase italic">KEUNTUNGAN KUMULATIF DANISPAY</p>
          <h3 className="text-5xl font-black tracking-tighter text-white italic">Rp {summary.keuntunganKumulatif.toLocaleString()}</h3>
          <p className="text-[10px] text-slate-200 mt-4 normal-case italic font-black">Margin (Omzet - Modal) + Upgrade Fee + Admin Fee WD</p>
        </div>
        <TrendingUp className="text-emerald-400" size={80} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl border-2 border-slate-100 overflow-hidden">
            <h4 className="text-xs tracking-[0.3em] mb-8 uppercase font-black italic text-slate-900">RINCIAN PERFORMA PER KATEGORI</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-4 border-slate-900">
                    <th className="pb-4 text-[10px] font-black text-slate-900 uppercase">KATEGORI</th>
                    <th className="pb-4 text-[10px] font-black text-slate-900 uppercase text-right">OMZET</th>
                    <th className="pb-4 text-[10px] font-black text-slate-900 uppercase text-right">MODAL</th>
                    <th className="pb-4 text-[10px] font-black text-emerald-700 uppercase text-right">PROFIT</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100">
                  {summary.performanceByCategory.map((cat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors font-medium">
                      <td className="py-5 text-xs text-slate-800 uppercase italic font-normal">{cat.name}</td>
                      <td className="py-5 text-xs text-slate-900 text-right font-normal">Rp{cat.omzet.toLocaleString()}</td>
                      <td className="py-5 text-xs text-slate-600 text-right font-normal">Rp{cat.modal.toLocaleString()}</td>
                      <td className="py-5 text-xs font-black text-emerald-700 text-right">Rp{cat.margin.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-2xl border-2 border-slate-100">
            <h4 className="text-xs tracking-[0.3em] mb-10 flex items-center gap-2 uppercase font-black italic text-slate-900">ARUS KAS (INFLOW VS OUTFLOW)</h4>
            <div className="h-80 w-full min-h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#0f172a'}} dy={10}/>
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#0f172a'}} tickFormatter={(v) => `Rp${v/1000}k`}/>
                  <RechartsTooltip contentStyle={{fontWeight: '900', borderRadius: '15px'}} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', paddingTop: '20px' }} />
                  <Area type="monotone" name="INFLOW" dataKey="income" stroke="#10B981" strokeWidth={5} fill="#10B981" fillOpacity={0.2} />
                  <Area type="monotone" name="OUTFLOW" dataKey="expense" stroke="#EF4444" strokeWidth={5} fill="#EF4444" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-2xl flex flex-col items-center">
            <h4 className="text-[10px] tracking-[0.3em] mb-8 w-full text-slate-900 uppercase text-center font-black italic">STATUS TRANSAKSI</h4>
            <div className="h-48 w-full relative min-h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {summary.statusDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} strokeWidth={3} stroke="#fff"/>))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center">
                <div><span className="text-3xl font-black text-slate-900 leading-none">{summary.statusDistribution.reduce((a,b)=>a+b.value, 0)}</span><p className="text-[8px] text-slate-900 font-black uppercase mt-1">TOTAL</p></div>
              </div>
            </div>
             <div className="flex flex-col gap-2 mt-6 w-full">
               {summary.statusDistribution.map((s, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: s.color}}></div>
                        <span className="text-[10px] text-slate-800 font-normal uppercase">{s.name}</span>
                     </div>
                     <span className="text-[10px] text-slate-900 font-black">{s.value}</span>
                  </div>
               ))}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl text-center border-4 border-slate-800">
            <p className="text-[10px] tracking-[0.3em] mb-2 text-emerald-400 uppercase font-black italic">SUCCESS RATE</p>
            <h3 className="text-6xl font-black italic tracking-tighter">{summary.successRate}%</h3>
            <div className="mt-6 h-3 w-full bg-white/10 rounded-full overflow-hidden border border-white/20">
                <div className="h-full bg-emerald-500" style={{ width: `${summary.successRate}%` }}></div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-2xl text-center">
            <p className="text-[10px] tracking-[0.3em] mb-1 text-slate-700 uppercase font-black italic">MEMBER TERDAFTAR</p>
            <h3 className="text-5xl font-black italic tracking-tighter text-slate-900">{summary.memberCount}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, text }: any) {
  return (
    <div className={`bg-white p-6 rounded-[30px] border-4 ${color} shadow-lg transition-all hover:shadow-xl hover:scale-105`}>
      <p className="text-[8px] text-slate-900 tracking-widest mb-2 font-black uppercase italic">{title}</p>
      <h3 className={`text-base font-black tracking-tight ${text}`}>Rp {value.toLocaleString()}</h3>
    </div>
  );
}