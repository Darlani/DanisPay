"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { 
  Check, X, History, Trash2, ArrowDownCircle, Loader2 
} from "lucide-react";

interface WithdrawalRequest {
  id: string;
  user_email: string;
  amount: number;
  admin_fee: number;
  held_amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
}

export default function WithdrawManagement() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFees, setEditingFees] = useState<{ [key: string]: number }>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [lastActionTime, setLastActionTime] = useState(0);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false });
    if (data) setRequests(data as WithdrawalRequest[]);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleFeeChange = (id: string, value: string) => {
    setEditingFees({ ...editingFees, [id]: parseInt(value) || 0 });
  };

  // --- ANTI-SPAM CHECK ---
  const isCooldown = () => {
    const now = Date.now();
    if (now - lastActionTime < 3000) {
      alert("Sabar Bos! Tunggu 3 detik biar sistem gak pusing.");
      return true;
    }
    setLastActionTime(now);
    return false;
  };

  const approveWithdraw = async (req: WithdrawalRequest) => {
    
    if (processingIds.has(req.id) || isCooldown()) return;
    
    const finalAdminFee = editingFees[req.id] !== undefined ? editingFees[req.id] : (req.admin_fee || 0);
    if (!confirm(`Eksekusi ACC? Saldo awal & akhir akan diaudit otomatis.`)) return;

    await supabase.from('admin_logs').insert([{
  admin_email: localStorage.getItem('userEmail'), // Ambil email admin yang login
  action: 'APPROVE_WITHDRAW',
  target: `User: ${req.user_email}`,
  details: `ACC WD Sejumlah Rp ${req.amount} (Fee: Rp ${finalAdminFee})`
}]);
    
setProcessingIds(prev => new Set(prev).add(req.id));

    try {
      const { error } = await supabase.rpc('approve_withdraw_v4', {
        req_id: req.id,
        final_fee: finalAdminFee
      });

      if (error) throw error;
      alert("GACOR! WD Berhasil dengan Audit Log.");
      fetchRequests();
    } catch (err: any) {
      alert("System Block: " + err.message);
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(req.id); return next; });
    }
  };

  const rejectWithdraw = async (req: WithdrawalRequest) => {
    if (processingIds.has(req.id) || isCooldown()) return;
    if (!confirm(`TOLAK? Saldo Rp ${req.held_amount.toLocaleString()} akan kembali FULL ke user.`)) return;
    
    setProcessingIds(prev => new Set(prev).add(req.id));

    try {
      const { error } = await supabase.rpc('reject_withdraw_v4', { req_id: req.id });
      if (error) throw error;
      alert("DITOLAK! Saldo sudah kembali dengan aman.");
      fetchRequests();
    } catch (err: any) {
      alert("Gagal Reject: " + err.message);
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(req.id); return next; });
    }
  };

  return (
    <div className="animate-in fade-in duration-700 font-black italic uppercase text-slate-800 pb-20 px-4 max-w-350 mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 mt-4">
        <div>
          <h2 className="text-2xl tracking-tighter flex items-center gap-3 font-black text-slate-900">
            <span className="bg-slate-900 text-white p-2.5 rounded-xl"><ArrowDownCircle size={24} /></span>
            WITHDRAW CONTROL v4
          </h2>
          <p className="text-[9px] text-slate-400 font-bold italic mt-1 ml-14 uppercase tracking-widest leading-none underline">Sistem Audit Saldo Awal & Akhir Aktif</p>
        </div>
        <button onClick={fetchRequests} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-900 rounded-2xl text-[10px] hover:bg-slate-900 hover:text-white transition-all shadow-lg active:scale-95">
          <History size={16} /> REFRESH
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[40px] shadow-2xl border-2 border-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[9px] tracking-[0.2em] uppercase italic border-b-2 border-slate-900">
                <th className="px-8 py-6 border-r border-slate-800">MEMBER</th>
                <th className="px-8 py-6 border-r border-slate-800 text-center">PENARIKAN</th>
                <th className="px-8 py-6 border-r border-slate-800 text-center text-rose-400">ADMIN FEE</th>
                <th className="px-8 py-6 border-r border-slate-800 text-center">TOTAL POTONG</th>
                <th className="px-8 py-6 border-r border-slate-800">TUJUAN</th>
                <th className="px-8 py-6 border-r border-slate-800 text-center">STATUS</th>
                <th className="px-8 py-6 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="p-32 text-center text-[10px] font-black italic animate-pulse">AUDITING DATABASE...</td></tr>
              ) : requests.map((req) => {
                const currentEditFee = editingFees[req.id] !== undefined ? editingFees[req.id] : (req.admin_fee || 0);
                const isProcessing = processingIds.has(req.id);

                return (
                  <tr key={req.id} className={`text-[10px] hover:bg-slate-50 transition-colors font-black italic ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <td className="px-8 py-5 border-r border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-slate-900 lowercase tracking-tight">{req.user_email}</span>
                        <span className="text-[7px] text-slate-400 not-italic uppercase tracking-widest">ID: {req.id.slice(0,8)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 border-r border-slate-50 text-center text-blue-600">Rp {req.amount.toLocaleString()}</td>
                    <td className="px-8 py-5 border-r border-slate-50 text-center">
                      {req.status === 'Pending' ? (
                        <input type="number" className="w-20 bg-rose-50 border-2 border-rose-200 p-2 rounded-xl text-center font-black text-rose-600 outline-none" value={currentEditFee} onChange={(e) => handleFeeChange(req.id, e.target.value)} />
                      ) : (
                        <span className="text-rose-500">Rp {req.admin_fee?.toLocaleString() || "0"}</span>
                      )}
                    </td>
                    <td className="px-8 py-5 border-r border-slate-50 text-center bg-slate-50/50">Rp {(req.amount + currentEditFee).toLocaleString()}</td>
                    <td className="px-8 py-5 border-r border-slate-50 uppercase">
                      <div className="flex flex-col">
                        <span className="text-slate-900">{req.bank_name}</span>
                        <span className="text-[8px] text-slate-500 not-italic">{req.account_number}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 border-r border-slate-50 text-center">
                      <span className={`px-4 py-1.5 rounded-full font-black text-[8px] tracking-[0.2em] border-2 uppercase ${
                        req.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' :
                        req.status === 'Success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      {req.status === 'Pending' ? (
                        <div className="flex justify-center gap-3">
                          <button disabled={isProcessing} onClick={() => approveWithdraw(req)} className="p-3 bg-emerald-500 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-200">
                            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} strokeWidth={3}/>}
                          </button>
                          <button disabled={isProcessing} onClick={() => rejectWithdraw(req)} className="p-3 bg-rose-500 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-rose-200">
                            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <X size={18} strokeWidth={3}/>}
                          </button>
                        </div>
                      ) : (
                        <div className="opacity-20"><Trash2 size={18} /></div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}