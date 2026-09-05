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
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans text-slate-900 space-y-6 pb-10">
      
      {/* --- HEADER & SEARCH --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
            <div className="bg-slate-900 text-white p-2 rounded-xl shadow-sm">
              <ShieldAlert size={22}/>
            </div>
            Central Audit Hub
          </h2>
          
          <div className="flex gap-2 mt-4 flex-wrap">
            <button onClick={() => setViewMode('PROVIDER')} 
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border flex items-center gap-2 cursor-pointer ${viewMode === 'PROVIDER' ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-white hover:border-slate-300'}`}>
              <Zap size={12}/> Modal Provider
            </button>
            
            <button onClick={() => setViewMode('USER')} 
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border flex items-center gap-2 cursor-pointer ${viewMode === 'USER' ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-100' : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-white hover:border-slate-300'}`}>
              <User size={12}/> Mutasi User
            </button>

            <button onClick={() => setViewMode('ADMIN')} 
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border flex items-center gap-2 cursor-pointer ${viewMode === 'ADMIN' ? 'bg-slate-900 text-white border-slate-900 shadow-sm shadow-slate-200' : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-white hover:border-slate-300'}`}>
              <Activity size={12}/> Admin Logs
            </button>

            <button onClick={() => setViewMode('SYSTEM')} 
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all border flex items-center gap-2 cursor-pointer ${viewMode === 'SYSTEM' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-white hover:border-slate-300'}`}>
              <Layers size={12}/> Iron Guard
            </button>
          </div>
        </div>

        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={15} />
          <input
            type="text"
            placeholder="Cari data audit..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:bg-white focus:border-blue-500 text-xs font-medium text-slate-800 placeholder:text-slate-400 transition-all shadow-2xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- TABEL AUDIT --- */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4 border-r border-slate-800/80"><div className="flex items-center gap-2"><Clock size={12}/> Waktu & Sumber</div></th>
                {/* HEADER DINAMIS: SALDO vs AKSI */}
                {(viewMode === 'PROVIDER' || viewMode === 'USER') ? (
                  <>
                    <th className="px-6 py-4 border-r border-slate-800/80 text-center">Saldo Awal</th>
                    <th className="px-6 py-4 border-r border-slate-800/80 text-center">Mutasi</th>
                    <th className="px-6 py-4 border-r border-slate-800/80 text-center">Saldo Akhir</th>
                  </>
                ) : (
                  <th className="px-6 py-4 border-r border-slate-800/80 text-center">Aksi Sistem</th>
                )}
                <th className="px-6 py-4">Catatan Aktivitas</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center animate-pulse text-slate-400 font-medium text-xs">Sinkronisasi data audit...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-medium text-xs">Data audit tidak ditemukan pada database</td></tr>
              ) : (
                filteredData.map((log) => {
                  // LOGIKA MAPPING FALLBACK (Agar satu row bisa baca semua jenis tabel)
                  const saldoAwal = log.old_balance || log.initial_balance || 0;
                  const saldoAkhir = log.new_balance || log.final_balance || 0;
                  const mutasi = log.amount || 0;
                  const identitas = log.admin_email || log.user_email || "SYSTEM_DAEMON";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 border-r border-slate-100">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[11px] text-slate-500 font-medium">
                            {new Date(log.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        <span className={`flex items-center gap-1.5 font-bold text-xs ${viewMode === 'PROVIDER' ? 'text-blue-600' : 'text-slate-800'}`}>
                          {viewMode === 'PROVIDER' ? <Zap size={11}/> : <User size={11}/>}
                          
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
                          <td className="px-6 py-4 border-r border-slate-100 text-center font-mono text-xs font-semibold text-slate-600">Rp {saldoAwal.toLocaleString('id-ID')}</td>
                          <td className="px-6 py-4 border-r border-slate-100 text-center">
                            <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold shadow-2xs ${mutasi > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                              {mutasi > 0 ? <ArrowUpRight size={11}/> : <ArrowDownLeft size={11}/>}
                              Rp {Math.abs(mutasi).toLocaleString('id-ID')}
                            </div>
                          </td>
                          <td className={`px-6 py-4 border-r border-slate-100 text-center font-mono text-xs font-bold ${viewMode === 'PROVIDER' ? 'bg-blue-50/40 text-blue-700' : 'bg-amber-50/40 text-amber-700'}`}>
                            Rp {saldoAkhir.toLocaleString('id-ID')}
                          </td>
                        </>
                      ) : (
                        <td className="px-6 py-4 border-r border-slate-100 text-center">
                          <span className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold shadow-2xs border ${
                            log.action?.includes('FLASH') ? 'bg-amber-500 text-white border-amber-600' :
                            log.action?.includes('DELETE') ? 'bg-rose-600 text-white border-rose-700' :
                            'bg-slate-800 text-white border-slate-900'
                          }`}>
                            {log.action || "SYSTEM_EVENT"}
                          </span>
                        </td>
                      )}

                      <td className="px-6 py-4 text-slate-600 font-normal leading-relaxed text-xs">
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