"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { 
  User, Search, Layers, ShieldAlert, Wallet, 
  ArrowUpRight, ArrowDownLeft, Clock, Zap, Activity 
} from "lucide-react";

export default function HistoryView() {
  const [balanceLogs, setBalanceLogs] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [providerLogs, setProviderLogs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // DEFAULT VIEW KE PROVIDER (MODAL BOS)
  const [viewMode, setViewMode] = useState<'PROVIDER' | 'USER' | 'ADMIN' | 'SYSTEM'>('PROVIDER');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil Provider Logs (Riwayat Modal Digiflazz)
      const { data: pLogs } = await supabase.from('provider_logs').select('*').order('created_at', { ascending: false });
      if (pLogs) setProviderLogs(pLogs);

      // 2. Ambil Balance Logs (Mutasi Saldo User)
      const { data: bLogs } = await supabase.from('balance_logs').select('*').order('created_at', { ascending: false });
      if (bLogs) setBalanceLogs(bLogs);

      // 3. Ambil Admin Logs
      const { data: aLogs } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false });
      if (aLogs) setAdminLogs(aLogs);

      // 4. Ambil Activity Logs (Iron Guard)
      const { data: actLogs } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false });
      if (actLogs) setActivityLogs(actLogs);

    } catch (err) {
      console.error("Gagal sinkron data audit:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // REALTIME MONITORING: Update otomatis kalau ada log baru masuk
    const channel = supabase.channel('audit-hub')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: '*' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredData = useMemo(() => {
    let targetData: any[] = [];
    if (viewMode === 'PROVIDER') targetData = providerLogs;
    else if (viewMode === 'USER') targetData = balanceLogs;
    else if (viewMode === 'ADMIN') targetData = adminLogs;
    else targetData = activityLogs;

    return targetData.filter(item => 
      (item.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.user_email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.admin_email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.action?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.details?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [viewMode, providerLogs, balanceLogs, adminLogs, activityLogs, searchTerm]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 font-black italic uppercase text-slate-800 pb-10 px-4">
      
      {/* --- HEADER & SEARCH --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl tracking-tighter flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2 rounded-xl shadow-lg">
              <ShieldAlert size={22}/>
            </div>
            CENTRAL AUDIT HUB
          </h2>
          
          <div className="flex gap-2 mt-4 flex-wrap">
            <button onClick={() => setViewMode('PROVIDER')} 
              className={`text-[9px] tracking-widest px-5 py-2.5 rounded-2xl transition-all border flex items-center gap-2 ${viewMode === 'PROVIDER' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:border-slate-300'}`}>
              <Zap size={12}/> MODAL PROVIDER
            </button>
            
            <button onClick={() => setViewMode('USER')} 
              className={`text-[9px] tracking-widest px-5 py-2.5 rounded-2xl transition-all border flex items-center gap-2 ${viewMode === 'USER' ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:border-slate-300'}`}>
              <User size={12}/> MUTASI USER
            </button>

            <button onClick={() => setViewMode('ADMIN')} 
              className={`text-[9px] tracking-widest px-5 py-2.5 rounded-2xl transition-all border flex items-center gap-2 ${viewMode === 'ADMIN' ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:border-slate-300'}`}>
              <Activity size={12}/> ADMIN LOGS
            </button>

            <button onClick={() => setViewMode('SYSTEM')} 
              className={`text-[9px] tracking-widest px-5 py-2.5 rounded-2xl transition-all border flex items-center gap-2 ${viewMode === 'SYSTEM' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:border-slate-300'}`}>
              <Layers size={12}/> IRON GUARD
            </button>
          </div>
        </div>

        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="CARI DATA AUDIT..." 
            className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-3 rounded-2xl outline-none focus:bg-white focus:border-blue-500 text-[10px] font-black uppercase transition-all shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- TABEL AUDIT --- */}
      <div className="bg-white rounded-[35px] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[8px] tracking-widest uppercase italic">
                <th className="px-6 py-5 border-r border-slate-800"><div className="flex items-center gap-2"><Clock size={12}/> WAKTU & SUMBER</div></th>
                {/* HEADER DINAMIS: SALDO vs AKSI */}
                {(viewMode === 'PROVIDER' || viewMode === 'USER') ? (
                  <>
                    <th className="px-6 py-5 border-r border-slate-800 text-center">SALDO AWAL</th>
                    <th className="px-6 py-5 border-r border-slate-800 text-center">MUTASI</th>
                    <th className="px-6 py-5 border-r border-slate-800 text-center">SALDO AKHIR</th>
                  </>
                ) : (
                  <th className="px-6 py-5 border-r border-slate-800 text-center">AKSI SISTEM</th>
                )}
                <th className="px-6 py-5">CATATAN AKTIVITAS</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 text-[10px]">
              {loading ? (
                <tr><td colSpan={5} className="p-24 text-center animate-pulse text-slate-300 font-black">SYNCHRONIZING AUDIT DATA...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic font-bold">DATA TIDAK DITEMUKAN PADA DATABASE</td></tr>
              ) : (
                filteredData.map((log) => {
                  // LOGIKA MAPPING FALLBACK (Agar satu row bisa baca semua jenis tabel)
                  const saldoAwal = log.old_balance || log.initial_balance || 0;
                  const saldoAkhir = log.new_balance || log.final_balance || 0;
                  const mutasi = log.amount || 0;
                  const identitas = log.admin_email || log.user_email || "SYSTEM_DAEMON";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 border-r border-slate-50">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400 text-[8px] not-italic font-bold">
                            {new Date(log.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        <span className={`flex items-center gap-1 font-black ${viewMode === 'PROVIDER' ? 'text-blue-600' : 'text-slate-700'}`}>
                          {viewMode === 'PROVIDER' ? <Zap size={10}/> : <User size={10}/>}
                          
                          {/* Tampilkan Nama Provider kalau di mode PROVIDER */}
                          {viewMode === 'PROVIDER' 
                            ? `[${log.provider_name}] ${identitas}` 
                            : identitas
                          }
                        </span>
                        </div>
                      </td>

                      {(viewMode === 'PROVIDER' || viewMode === 'USER') ? (
                        <>
                          <td className="px-6 py-4 border-r border-slate-50 text-center text-slate-400 font-medium">RP {saldoAwal.toLocaleString()}</td>
                          <td className="px-6 py-4 border-r border-slate-50 text-center">
                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-black shadow-sm ${mutasi > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                              {mutasi > 0 ? <ArrowUpRight size={10}/> : <ArrowDownLeft size={10}/>}
                              RP {Math.abs(mutasi).toLocaleString()}
                            </div>
                          </td>
                          <td className={`px-6 py-4 border-r border-slate-50 text-center font-black ${viewMode === 'PROVIDER' ? 'bg-blue-50/30 text-blue-700' : 'bg-amber-50/30 text-amber-700'}`}>
                            RP {saldoAkhir.toLocaleString()}
                          </td>
                        </>
                      ) : (
                        <td className="px-6 py-4 border-r border-slate-50 text-center">
                          <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black shadow-sm border ${
                            log.action?.includes('FLASH') ? 'bg-amber-500 text-white border-amber-600' :
                            log.action?.includes('DELETE') ? 'bg-rose-600 text-white border-rose-700' :
                            'bg-slate-800 text-white border-slate-900'
                          }`}>
                            {log.action || "SYSTEM_EVENT"}
                          </span>
                        </td>
                      )}

                      <td className="px-6 py-4 text-slate-500 normal-case italic font-medium leading-relaxed">
                        {log.description || log.details || "Tidak ada rincian tambahan."}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}