"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { Check, CreditCard, History, Loader2 } from "lucide-react";

export default function DepositManagement() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchDeposits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('deposits')
      .select('*') 
      .order('created_at', { ascending: false });
      
    if (error) console.error("Error Fetch Admin:", error);
    if (data) setDeposits(data);
    setLoading(false);
  };

  useEffect(() => { fetchDeposits(); }, []);

  const handleApprove = async (id: string) => {
    if (!confirm("Konfirmasi Saldo Masuk? Audit saldo awal/akhir akan dicatat.")) return;
    setProcessingId(id);
    try {
      // Panggil RPC Versi v4 yang sudah aman
      const { error } = await supabase.rpc('approve_deposit_v4', { depo_id: id });
      if (error) throw error;
      
      alert("GACOR! Saldo telah masuk dan tercatat di audit log.");
      fetchDeposits();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally { setProcessingId(null); }
  };

  return (
    <div className="animate-in fade-in duration-700 font-black italic uppercase text-slate-800 pb-20 px-4 max-w-350 mx-auto">
      <div className="flex justify-between items-center mb-10 mt-6">
        <div>
          <h2 className="text-3xl tracking-tighter flex items-center gap-4 font-black">
            <span className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg shadow-emerald-200"><CreditCard size={28} /></span>
            DEPOSIT CONTROL v4
          </h2>
          <p className="text-[10px] text-slate-400 mt-2 font-bold tracking-widest ml-16 leading-none underline">Verifikasi Pembayaran & Audit Saldo Aktif</p>
        </div>
        <button onClick={fetchDeposits} className="p-4 bg-white border-2 border-slate-900 rounded-2xl shadow-lg active:scale-95 transition-all">
          <History size={20}/>
        </button>
      </div>

      <div className="bg-white rounded-[40px] border-2 border-slate-900 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[9px] tracking-widest italic border-b-2 border-slate-900">
                <th className="px-8 py-6 border-r border-slate-800">USER / EMAIL</th>
                <th className="px-8 py-6 border-r border-slate-800 text-center">NOMINAL</th>
                <th className="px-8 py-6 border-r border-slate-800 text-center">VIA</th>
                <th className="px-8 py-6 border-r border-slate-800 text-center">STATUS</th>
                <th className="px-8 py-6 text-center">KONFIRMASI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-32 text-center text-[10px] font-black italic animate-pulse">MENGECEK MUTASI MASUK...</td></tr>
              ) : deposits.length === 0 ? (
                <tr><td colSpan={5} className="p-32 text-center text-[10px] font-black italic text-slate-400">TIDAK ADA DATA DEPOSIT</td></tr>
              ) : deposits.map((d) => (
                <tr key={d.id} className={`text-[11px] font-black italic hover:bg-slate-50 transition-all ${processingId === d.id ? 'opacity-50 pointer-events-none' : ''}`}>
                  <td className="px-8 py-5 border-r border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-slate-900 lowercase tracking-tight">{d.user_email}</span>
                      <span className="text-[7px] text-slate-400 not-italic uppercase tracking-widest">{new Date(d.created_at).toLocaleString('id-ID')}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 border-r border-slate-50 text-center text-emerald-600 font-black">
                    Rp {d.amount.toLocaleString()}
                  </td>
                  {/* FIX: GANTI DARI payment_name KE payment_method */}
                  <td className="px-8 py-5 border-r border-slate-50 text-center uppercase text-blue-600">
                    {d.payment_method || '-'}
                  </td>
                  <td className="px-8 py-5 border-r border-slate-50 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[8px] border-2 uppercase ${
                      d.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    {d.status === 'Pending' ? (
                      <button disabled={processingId === d.id} onClick={() => handleApprove(d.id)} className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 shadow-lg transition-all active:scale-90">
                        {processingId === d.id ? <Loader2 className="animate-spin" size={18}/> : <Check size={18} strokeWidth={4}/>}
                      </button>
                    ) : (
                      <div className="text-emerald-500 flex justify-center"><Check size={20} strokeWidth={4}/></div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}